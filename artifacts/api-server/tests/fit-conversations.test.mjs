import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { and, eq, inArray, or } from "drizzle-orm";
import sharp from "sharp";
import { db, blouseFitsTable, conversations, messages, sessions, usersTable } from "@workspace/db";
import { privateImages } from "@workspace/db/schema";
import { createSessionToken } from "../src/lib/auth.ts";
import { withRlsUser } from "../src/lib/rls.ts";
import { savePrivateImage } from "../src/lib/privateImages.ts";
import { getStripeClient } from "../src/stripeClient.ts";

if (process.env.NODE_ENV === "production") {
  throw new Error("Fit-conversation integration tests cannot run against production");
}
if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  throw new Error("Fit-conversation integration tests require a Stripe test-mode key");
}

process.env.REPLIT_DOMAINS = "localhost";
process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.ts");
const stripe = await getStripeClient();

const userIds = [];
const fitIds = [];
const privateImageStorageKeys = [];
const sessionCookies = new Map();
let server;
let baseUrl;
let customerId;
let tailorOneId;
let tailorTwoId;
let nonParticipantId;
let sameTailorFitId;
let crossTailorFitId;
let unassignedImageFitId;
let sameTailorConversationId;
let crossTailorConversationId;
let crossTailorWinnerId;
let crossTailorLoserId;

function newUserId() {
  return `user_${Date.now()}_${randomBytes(5).toString("hex")}`;
}

async function addUser(name, role) {
  const id = newUserId();
  const [user] = await db.insert(usersTable).values({
    id,
    name,
    email: `${id}@fit-conversation-tests.invalid`,
    role,
  }).returning({ id: usersTable.id });
  userIds.push(user.id);

  const token = createSessionToken();
  await db.insert(sessions).values({
    id: token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  sessionCookies.set(user.id, `blousley_session=${token}`);
  return user.id;
}

async function addSharedFit() {
  const [fit] = await db.insert(blouseFitsTable).values({
    userId: customerId,
    findMyTailor: true,
    notes: "Disposable fit-conversation regression fixture",
  }).returning({ id: blouseFitsTable.id });
  fitIds.push(fit.id);
  return fit.id;
}

async function addSharedFitWithImage() {
  const fitId = await addSharedFit();
  const imageBuffer = await sharp({
    create: { width: 2, height: 2, channels: 4, background: { r: 70, g: 120, b: 180, alpha: 1 } },
  }).png().toBuffer();
  const privateImage = await savePrivateImage(
    `data:image/png;base64,${imageBuffer.toString("base64")}`,
    customerId,
  );
  privateImageStorageKeys.push(privateImage.storageKey);
  await withRlsUser(customerId, (tx) => tx.insert(privateImages).values({
    fitId,
    ownerId: customerId,
    storageKey: privateImage.storageKey,
    mimeType: privateImage.mimeType,
  }));
  await db.update(blouseFitsTable)
    .set({ thumbnailUrl: `/api/images/fits/${fitId}`, updatedAt: new Date() })
    .where(eq(blouseFitsTable.id, fitId));
  return fitId;
}

async function request(userId, path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(userId ? { Cookie: sessionCookies.get(userId) } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = response.status === 204 ? null : await response.json();
  return { status: response.status, body: payload };
}

function openFit(tailorId, fitId) {
  return request(tailorId, "/api/chat/conversations", {
    method: "POST",
    body: {
      userId: tailorId,
      customerId,
      tailorId,
      requesterId: tailorId,
      fitId,
      title: "Disposable fit regression",
    },
  });
}

async function checkoutSessionsFor(conversationId) {
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  return sessions.data.filter(
    (session) => session.metadata?.fitConversationId === String(conversationId),
  );
}

before(async () => {
  customerId = await addUser("Fit test customer", "customer");
  tailorOneId = await addUser("Fit test tailor one", "tailor");
  tailorTwoId = await addUser("Fit test tailor two", "tailor");
  nonParticipantId = await addUser("Fit test non-participant", "customer");
  sameTailorFitId = await addSharedFit();
  crossTailorFitId = await addSharedFit();
  unassignedImageFitId = await addSharedFitWithImage();

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error) => error ? reject(error) : resolve());
    server.once("error", reject);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test("session-derived fit save accepts no client userId", async () => {
  for (const [path, expectedStatus] of [
    ["/api/blouse/fits", 201],
    ["/api/tailor/fits", 200],
  ]) {
    const response = await request(customerId, path, {
      method: "POST",
      body: { measurements: { bust: 86 }, notes: "Session-only save regression" },
    });
    if (response.body.id) fitIds.push(response.body.id);
    assert.equal(response.status, expectedStatus, `${path} must save using only the authenticated session`);
    assert.equal(response.body.userId, customerId);
    const spoofed = await request(customerId, path, {
      method: "POST",
      body: { userId: nonParticipantId, measurements: { bust: 86 } },
    });
    assert.equal(spoofed.status, 403, `${path} must reject a different client-supplied userId`);
  }
});

test("unassigned Find My Tailor fits are visible to tailors and private images follow assignment", async () => {
  const [firstList, secondList] = await Promise.all([
    request(tailorOneId, `/api/tailor/customers?tailorId=${encodeURIComponent(tailorOneId)}`),
    request(tailorTwoId, `/api/tailor/customers?tailorId=${encodeURIComponent(tailorTwoId)}`),
  ]);
  assert.equal(firstList.status, 200);
  assert.equal(secondList.status, 200);
  const firstRequest = firstList.body.find((fit) => fit.id === unassignedImageFitId);
  const secondRequest = secondList.body.find((fit) => fit.id === unassignedImageFitId);
  for (const fit of [firstRequest, secondRequest]) {
    assert.ok(fit);
    assert.equal(fit.findMyTailor, true);
    assert.equal(fit.assignedTailorId, null);
    assert.equal(fit.conversationId, null);
    assert.ok(fit.imageUrl);
    assert.ok(fit.thumbnailUrl);
  }

  const firstImageResponse = await fetch(firstRequest.imageUrl, {
    headers: { Cookie: sessionCookies.get(tailorOneId) },
  });
  assert.equal(firstImageResponse.status, 200);
  assert.match(firstImageResponse.headers.get("content-type") ?? "", /^image\/png/);
  assert.ok((await firstImageResponse.arrayBuffer()).byteLength > 0);

  const nonTailorUrl = new URL(firstRequest.imageUrl);
  nonTailorUrl.searchParams.set("userId", nonParticipantId);
  const nonTailorImage = await fetch(nonTailorUrl, {
    headers: { Cookie: sessionCookies.get(nonParticipantId) },
  });
  assert.equal(nonTailorImage.status, 403);

  const opened = await openFit(tailorOneId, unassignedImageFitId);
  assert.equal(opened.status, 201);
  const message = await request(tailorOneId, "/api/chat/messages", {
    method: "POST",
    body: { conversationId: opened.body.id, senderId: tailorOneId, content: "I can make this blouse design." },
  });
  assert.equal(message.status, 201);
  const quote = await request(tailorOneId, `/api/chat/conversations/${opened.body.id}/quote`, {
    method: "POST",
    body: { amountCents: 8750 },
  });
  assert.equal(quote.status, 200);
  const customerMessages = await request(customerId, `/api/chat/messages?conversationId=${opened.body.id}`);
  assert.equal(customerMessages.status, 200);
  assert.ok(customerMessages.body.some((entry) => entry.content === "I can make this blouse design."));
  assert.ok(customerMessages.body.some((entry) => /CAD \$87\.50/.test(entry.content)));
  const [assignedList, otherTailorList] = await Promise.all([
    request(tailorOneId, `/api/tailor/customers?tailorId=${encodeURIComponent(tailorOneId)}`),
    request(tailorTwoId, `/api/tailor/customers?tailorId=${encodeURIComponent(tailorTwoId)}`),
  ]);
  const assignedFit = assignedList.body.find((fit) => fit.id === unassignedImageFitId);
  assert.equal(assignedFit?.assignedTailorId, tailorOneId);
  assert.ok(assignedFit?.conversationId);
  assert.ok(!otherTailorList.body.some((fit) => fit.id === unassignedImageFitId));

  const assignedImage = await fetch(assignedFit.imageUrl, {
    headers: { Cookie: sessionCookies.get(tailorOneId) },
  });
  assert.equal(assignedImage.status, 200);
  const otherTailorImage = await fetch(secondRequest.imageUrl, {
    headers: { Cookie: sessionCookies.get(tailorTwoId) },
  });
  assert.equal(otherTailorImage.status, 403);
});

test("session-derived sharing only allows the saved fit owner", async () => {
  const saved = await request(customerId, "/api/blouse/fits", {
    method: "POST",
    body: { measurements: { bust: 86 } },
  });
  if (saved.body.id) fitIds.push(saved.body.id);
  assert.equal(saved.status, 201);
  const path = `/api/blouse/fits/${saved.body.id}/find-tailor`;
  assert.equal((await request(nonParticipantId, path, { method: "PATCH" })).status, 404);
  assert.equal((await request(nonParticipantId, path, {
    method: "PATCH",
    body: { userId: customerId },
  })).status, 403);
  assert.equal((await request(customerId, path, {
    method: "PATCH",
    body: { userId: nonParticipantId },
  })).status, 403);
  const shared = await request(customerId, path, {
    method: "PATCH",
    body: { userId: customerId },
  });
  assert.equal(shared.status, 200);
  assert.equal(shared.body.findMyTailor, true);
  assert.equal(shared.body.userId, customerId);
});

test("session-derived fit actions reject signed-out requests with authentication errors", async () => {
  for (const [method, path] of [
    ["POST", "/api/blouse/fits"],
    ["POST", "/api/tailor/fits"],
    ["PATCH", `/api/blouse/fits/${sameTailorFitId}/find-tailor`],
    ["POST", "/api/chat/conversations/1/fit-checkout"],
  ]) {
    const response = await request(null, path, { method });
    assert.equal(response.status, 401, `${method} ${path} must require a session`);
    assert.equal(response.body.error, "Authentication required");
  }
});

test("session-derived Checkout rejects another customer and identity spoofing", async () => {
  const fitId = await addSharedFit();
  const opened = await openFit(tailorOneId, fitId);
  assert.equal(opened.status, 201);
  const conversationId = opened.body.id;
  const quote = await request(tailorOneId, `/api/chat/conversations/${conversationId}/quote`, {
    method: "POST",
    body: { amountCents: 8750 },
  });
  assert.equal(quote.status, 200);
  const path = `/api/chat/conversations/${conversationId}/fit-checkout`;
  assert.equal((await request(nonParticipantId, path, { method: "POST" })).status, 403);
  assert.equal((await request(nonParticipantId, path, {
    method: "POST",
    body: { userId: customerId },
  })).status, 403);
  assert.equal((await request(customerId, path, {
    method: "POST",
    body: { userId: nonParticipantId },
  })).status, 403);
  const [stored] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  assert.equal(stored.fitStripeCheckoutSessionId, null);
});

after(async () => {
  try {
    const conversationsForCleanup = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(or(
        inArray(conversations.fitId, fitIds),
        and(
          inArray(conversations.customerId, userIds),
          inArray(conversations.tailorId, userIds),
        ),
      ));
    const conversationIds = conversationsForCleanup.map(({ id }) => id);

    for (const conversationId of conversationIds) {
      const testSessions = await checkoutSessionsFor(conversationId);
      for (const session of testSessions) {
        if (session.livemode) throw new Error("Refusing to clean up a live-mode Checkout session");
        if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
        const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
        const priceIds = [...new Set(items.data.map((item) => item.price?.id).filter(Boolean))];
        for (const priceId of priceIds) await stripe.prices.update(priceId, { active: false });
      }
    }

    if (conversationIds.length) {
      await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
      await db.delete(conversations).where(inArray(conversations.id, conversationIds));
    }
    if (fitIds.length) {
      await db.delete(blouseFitsTable).where(and(
        inArray(blouseFitsTable.id, fitIds),
        eq(blouseFitsTable.userId, customerId),
      ));
    }
    if (userIds.length) await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  } finally {
    await Promise.all(privateImageStorageKeys.map((storageKey) =>
      unlink(path.join(process.cwd(), ".private-images", storageKey)).catch(() => undefined),
    ));
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  }
});

test("fit conversation authorization, assignment, quote, and Checkout regressions", async (t) => {
  await t.test("1. simultaneous same-tailor opens reuse exactly one conversation", async () => {
    const responses = await Promise.all([
      openFit(tailorOneId, sameTailorFitId),
      openFit(tailorOneId, sameTailorFitId),
    ]);
    assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 201]);
    const ids = responses.map(({ body }) => body.id);
    assert.equal(ids[0], ids[1]);
    sameTailorConversationId = ids[0];

    const list = await request(customerId, `/api/chat/conversations?fitId=${sameTailorFitId}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.filter((item) => item.id === sameTailorConversationId).length, 1);
  });

  await t.test("2. simultaneous different-tailor opens assign the shared fit once", async () => {
    const mismatchedIdentity = await request(tailorOneId, "/api/chat/conversations", {
      method: "POST",
      body: {
        userId: nonParticipantId,
        customerId,
        tailorId: tailorOneId,
        requesterId: tailorOneId,
        fitId: crossTailorFitId,
        title: "Mismatched identity regression",
      },
    });
    assert.equal(mismatchedIdentity.status, 403);

    const responses = await Promise.all([
      openFit(tailorOneId, crossTailorFitId),
      openFit(tailorTwoId, crossTailorFitId),
    ]);
    assert.deepEqual(responses.map(({ status }) => status).sort(), [201, 409]);
    const winner = responses.find(({ status }) => status === 201);
    const loser = responses.find(({ status }) => status === 409);
    assert.ok(winner?.body.id);
    assert.equal(winner.body.fitId, crossTailorFitId);
    assert.match(loser.body.error, /already assigned/i);
    crossTailorConversationId = winner.body.id;
    crossTailorWinnerId = winner.body.tailorId;
    crossTailorLoserId = crossTailorWinnerId === tailorOneId ? tailorTwoId : tailorOneId;

    const list = await request(customerId, `/api/chat/conversations?fitId=${crossTailorFitId}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.filter((item) => item.fitId === crossTailorFitId).length, 1);
  });

  await t.test("3. Customer Fits only lists a fit for its assigned tailor", async () => {
    const [assignedList, otherList, winnerList, loserList] = await Promise.all([
      request(tailorOneId, `/api/tailor/customers?tailorId=${tailorOneId}`),
      request(tailorTwoId, `/api/tailor/customers?tailorId=${tailorTwoId}`),
      request(crossTailorWinnerId, `/api/tailor/customers?tailorId=${crossTailorWinnerId}`),
      request(crossTailorLoserId, `/api/tailor/customers?tailorId=${crossTailorLoserId}`),
    ]);
    for (const response of [assignedList, otherList, winnerList, loserList]) {
      assert.equal(response.status, 200);
    }
    assert.ok(assignedList.body.some((fit) => fit.id === sameTailorFitId));
    assert.ok(!otherList.body.some((fit) => fit.id === sameTailorFitId));
    assert.ok(winnerList.body.some((fit) => fit.id === crossTailorFitId));
    assert.ok(!loserList.body.some((fit) => fit.id === crossTailorFitId));
    assert.equal(
      (await request(tailorTwoId, `/api/tailor/customers?tailorId=${tailorOneId}`)).status,
      403,
    );
  });

  await t.test("4. another tailor cannot open, read, or quote the assigned conversation", async () => {
    assert.equal((await openFit(tailorTwoId, sameTailorFitId)).status, 409);
    assert.equal(
      (await request(tailorTwoId, `/api/chat/messages?conversationId=${sameTailorConversationId}`)).status,
      403,
    );
    assert.equal(
      (await request(tailorTwoId, `/api/chat/conversations/${sameTailorConversationId}/payment`)).status,
      403,
    );
    assert.equal((await request(tailorTwoId, `/api/chat/conversations/${sameTailorConversationId}/quote`, {
      method: "POST",
      body: { amountCents: 8750 },
    })).status, 403);
  });

  await t.test("5. the assigned customer can open the conversation and payment details", async () => {
    const [conversationsResponse, payment] = await Promise.all([
      request(customerId, `/api/chat/conversations?fitId=${sameTailorFitId}`),
      request(customerId, `/api/chat/conversations/${sameTailorConversationId}/payment?userId=${encodeURIComponent(customerId)}`),
    ]);
    assert.equal(conversationsResponse.status, 200);
    assert.ok(conversationsResponse.body.some((item) => item.id === sameTailorConversationId));
    assert.equal(payment.status, 200);
    assert.equal(payment.body.id, sameTailorConversationId);
    assert.equal(payment.body.fitId, sameTailorFitId);
    assert.equal(
      (await request(customerId, `/api/chat/conversations/${sameTailorConversationId}/payment?userId=${encodeURIComponent(nonParticipantId)}`)).status,
      403,
    );
  });

  await t.test("6. a non-participant cannot read the conversation or payment details", async () => {
    assert.equal(
      (await request(nonParticipantId, `/api/chat/messages?conversationId=${sameTailorConversationId}`)).status,
      403,
    );
    assert.equal(
      (await request(nonParticipantId, `/api/chat/conversations/${sameTailorConversationId}/payment`)).status,
      403,
    );
  });

  await t.test("7. the assigned tailor can send a CAD quote", async () => {
    const response = await request(tailorOneId, `/api/chat/conversations/${sameTailorConversationId}/quote`, {
      method: "POST",
      body: { amountCents: 8750 },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.fitQuoteCents, 8750);
  });

  await t.test("8. a customer or another tailor cannot send a quote", async () => {
    const [customerQuote, otherTailorQuote] = await Promise.all([
      request(customerId, `/api/chat/conversations/${sameTailorConversationId}/quote`, {
        method: "POST",
        body: { amountCents: 9999 },
      }),
      request(tailorTwoId, `/api/chat/conversations/${sameTailorConversationId}/quote`, {
        method: "POST",
        body: { amountCents: 9999 },
      }),
    ]);
    assert.equal(customerQuote.status, 403);
    assert.equal(otherTailorQuote.status, 403);
    const payment = await request(customerId, `/api/chat/conversations/${sameTailorConversationId}/payment`);
    assert.equal(payment.body.fitQuoteCents, 8750);
  });

  await t.test("9. the assigned customer can create one test-mode CAD Checkout session", async () => {
    const response = await request(customerId, `/api/chat/conversations/${sameTailorConversationId}/fit-checkout`, {
      method: "POST",
      body: { userId: customerId },
    });
    assert.equal(response.status, 200);
    assert.equal(new URL(response.body.url).hostname, "checkout.stripe.com");
    const sessionId = response.body.url.match(/cs_test_[A-Za-z0-9]+/)?.[0];
    assert.ok(sessionId, "Checkout URL must contain a test-mode session ID");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    assert.equal(session.livemode, false);
    assert.equal(session.currency, "cad");
    assert.equal(session.amount_total, 8750);
    assert.equal(session.status, "open");
    assert.equal(session.payment_status, "unpaid");
    assert.equal(session.metadata.fitConversationId, String(sameTailorConversationId));
    assert.equal(session.metadata.customerId, customerId);
    assert.equal(session.metadata.tailorId, tailorOneId);
    assert.equal(session.metadata.fitQuoteCents, "8750");
  });

  await t.test("10. repeat Checkout reuses the same single payable session", async () => {
    const first = await request(customerId, `/api/chat/conversations/${sameTailorConversationId}/fit-checkout`, {
      method: "POST",
    });
    const second = await request(customerId, `/api/chat/conversations/${sameTailorConversationId}/fit-checkout`, {
      method: "POST",
    });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    const firstId = first.body.url.match(/cs_test_[A-Za-z0-9]+/)?.[0];
    const secondId = second.body.url.match(/cs_test_[A-Za-z0-9]+/)?.[0];
    assert.ok(firstId);
    assert.equal(secondId, firstId);
    const sessions = await checkoutSessionsFor(sameTailorConversationId);
    assert.equal(sessions.filter((session) => session.status === "open").length, 1);
  });

  await t.test("11. a paid quote cannot create another payable Checkout session", async () => {
    const fitId = await addSharedFit();
    const opened = await openFit(tailorOneId, fitId);
    assert.equal(opened.status, 201);
    const conversationId = opened.body.id;
    await db.update(conversations).set({ fitQuoteCents: 8750, fitPaidAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const before = await checkoutSessionsFor(conversationId);
    assert.equal(before.length, 0);
    const response = await request(customerId, `/api/chat/conversations/${conversationId}/fit-checkout`, {
      method: "POST",
    });
    assert.equal(response.status, 409);
    const after = await checkoutSessionsFor(conversationId);
    assert.equal(after.length, 0);
  });
});

test("conversation image batches are private, validated, and all-or-nothing", async () => {
  const conversationId = sameTailorConversationId;
  const conversationPath = `/api/chat/conversations/${conversationId}/images`;
  const messagesPath = `/api/chat/messages?conversationId=${conversationId}`;
  const imageBytes = await sharp({
    create: { width: 2, height: 2, channels: 4, background: { r: 90, g: 130, b: 170, alpha: 1 } },
  }).png().toBuffer();

  const appendPng = (form, bytes = imageBytes, name = "chat.png") => {
    form.append("images", new Blob([bytes], { type: "image/png" }), name);
  };
  const upload = (userId, form) => fetch(`${baseUrl}${conversationPath}`, {
    method: "POST",
    headers: { Cookie: sessionCookies.get(userId) },
    body: form,
  });

  const initial = await request(customerId, messagesPath);
  assert.equal(initial.status, 200);

  const form = new FormData();
  appendPng(form);
  appendPng(form, imageBytes, "second.png");
  form.append("message", "Please see these photos.");
  const response = await upload(customerId, form);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.messages.length, 3);

  const imageMessages = result.messages.filter((message) => message.role === "image_attachment");
  assert.equal(imageMessages.length, 2);
  for (const message of imageMessages) {
    assert.equal(message.senderId, customerId);
    assert.equal(message.conversationId, conversationId);
    assert.ok(Date.parse(message.createdAt));
    assert.match(message.content, /^blousley-chat-image-v1:[0-9a-f-]{36}\.png$/);
    privateImageStorageKeys.push(message.content.slice("blousley-chat-image-v1:".length));
  }
  assert.equal(result.messages.find((message) => message.role === "user").content, "Please see these photos.");

  const imagePath = `/api/images/chat/${conversationId}/${imageMessages[0].id}`;
  for (const participantId of [customerId, tailorOneId]) {
    const imageResponse = await fetch(`${baseUrl}${imagePath}`, {
      headers: { Cookie: sessionCookies.get(participantId) },
    });
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/png");
    assert.deepEqual(
      Buffer.from(await imageResponse.arrayBuffer()).subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  }

  const privateRead = await fetch(`${baseUrl}${imagePath}`, {
    headers: { Cookie: sessionCookies.get(nonParticipantId) },
  });
  assert.equal(privateRead.status, 403);
  const unauthenticatedRead = await fetch(`${baseUrl}${imagePath}`);
  assert.equal(unauthenticatedRead.status, 401);

  const spoofedUpload = new FormData();
  appendPng(spoofedUpload);
  spoofedUpload.append("userId", customerId);
  assert.equal((await upload(nonParticipantId, spoofedUpload)).status, 403);

  const tailorForm = new FormData();
  appendPng(tailorForm);
  const tailorResponse = await upload(tailorOneId, tailorForm);
  assert.equal(tailorResponse.status, 201);
  const tailorResult = await tailorResponse.json();
  assert.equal(tailorResult.messages[0].senderId, tailorOneId);
  privateImageStorageKeys.push(tailorResult.messages[0].content.slice("blousley-chat-image-v1:".length));
  const conversationList = await request(customerId, "/api/chat/conversations");
  assert.equal(
    conversationList.body.find((conversation) => conversation.id === conversationId).lastMessage.content,
    "Image attachment",
  );

  const [nonFitConversation] = await db.insert(conversations).values({
    title: "Non-fit attachment rejection fixture",
    customerId,
    tailorId: tailorOneId,
  }).returning();
  const nonFitForm = new FormData();
  appendPng(nonFitForm);
  const nonFitResponse = await fetch(`${baseUrl}/api/chat/conversations/${nonFitConversation.id}/images`, {
    method: "POST",
    headers: { Cookie: sessionCookies.get(customerId) },
    body: nonFitForm,
  });
  assert.equal(nonFitResponse.status, 409);

  const beforeFailedUpload = await request(customerId, messagesPath);
  const invalidBatch = new FormData();
  appendPng(invalidBatch);
  appendPng(invalidBatch, Buffer.from("not a png"));
  invalidBatch.append("message", "This text must not be sent when an image fails.");
  assert.equal((await upload(customerId, invalidBatch)).status, 400);
  const afterFailedUpload = await request(customerId, messagesPath);
  assert.deepEqual(
    afterFailedUpload.body.map((message) => message.id),
    beforeFailedUpload.body.map((message) => message.id),
    "a partial image batch must not create any chat messages",
  );

  const unsupported = new FormData();
  unsupported.append("images", new Blob([imageBytes], { type: "image/gif" }), "chat.gif");
  assert.equal((await upload(customerId, unsupported)).status, 415);

  const oversized = new FormData();
  appendPng(oversized, Buffer.alloc(5 * 1024 * 1024 + 1), "large.png");
  assert.equal((await upload(customerId, oversized)).status, 413);
});
