import assert from "node:assert/strict";
import test from "node:test";

import {
  getTailorOfferAlert,
  runTailorOfferFlow,
  tailorDesignRequestsQueryKey,
} from "../lib/tailor-offer-flow.ts";

const openRequest = {
  id: 42,
  paymentStatus: "paid_open",
  assignedTailorId: null,
  acceptedAt: null,
};

test("refreshes before accepting and skips acceptance when the request is no longer open", async () => {
  const calls = [];
  const result = await runTailorOfferFlow({
    requestId: 42,
    message: "My offer",
    refreshRequests: async () => {
      calls.push("refresh");
      return { data: [{ ...openRequest, paymentStatus: "paid" }] };
    },
    acceptRequest: async () => calls.push("accept"),
    createConversation: async () => {
      calls.push("conversation");
      return { id: 101 };
    },
    sendMessage: async () => calls.push("message"),
    onAccepted: () => calls.push("accepted"),
    onConversationCreated: () => calls.push("conversation-created"),
    onMessageSent: () => calls.push("message-sent"),
  });

  assert.equal(result.status, "stale");
  assert.deepEqual(calls, ["refresh"]);
  assert.equal(getTailorOfferAlert(result)?.title, "Could not accept request");
});

test("reports refresh errors without sending an acceptance request", async () => {
  const calls = [];
  const result = await runTailorOfferFlow({
    requestId: 42,
    message: "My offer",
    refreshRequests: async () => {
      calls.push("refresh");
      return { error: new Error("network unavailable") };
    },
    acceptRequest: async () => calls.push("accept"),
    createConversation: async () => ({ id: 101 }),
    sendMessage: async () => {},
    onAccepted: () => calls.push("accepted"),
    onConversationCreated: () => {},
    onMessageSent: () => calls.push("message-sent"),
  });

  assert.equal(result.status, "refresh_failed");
  assert.deepEqual(calls, ["refresh"]);
  assert.match(getTailorOfferAlert(result)?.message ?? "", /Could not refresh/);
});

test("states that the request was accepted when conversation creation fails", async () => {
  const calls = [];
  const result = await runTailorOfferFlow({
    requestId: 42,
    message: "My offer",
    refreshRequests: async () => ({ data: [openRequest] }),
    acceptRequest: async (id) => calls.push(`accept:${id}`),
    createConversation: async () => {
      calls.push("conversation");
      throw new Error("conversation unavailable");
    },
    sendMessage: async () => calls.push("message"),
    onAccepted: () => calls.push("accepted"),
    onConversationCreated: () => {},
    onMessageSent: () => calls.push("message-sent"),
  });
  const alert = getTailorOfferAlert(result);

  assert.deepEqual(calls, ["accept:42", "accepted", "conversation"]);
  assert.equal(alert?.title, "Request accepted");
  assert.match(alert?.message ?? "", /request was accepted/i);
  assert.match(alert?.message ?? "", /conversation unavailable/);
});

test("states that the request was accepted when message delivery fails", async () => {
  const calls = [];
  const result = await runTailorOfferFlow({
    requestId: 42,
    message: "My offer",
    refreshRequests: async () => ({ data: [openRequest] }),
    acceptRequest: async () => calls.push("accepted"),
    createConversation: async () => ({ id: 101 }),
    sendMessage: async (conversationId, message) => {
      calls.push(`send:${conversationId}:${message}`);
      throw new Error("message delivery failed");
    },
    onAccepted: () => calls.push("invalidate-requests"),
    onConversationCreated: ({ id }) => calls.push(`open:${id}`),
    onMessageSent: () => calls.push("invalidate-chat-list"),
  });
  const alert = getTailorOfferAlert(result);

  assert.deepEqual(calls, [
    "accepted",
    "invalidate-requests",
    "open:101",
    "send:101:My offer",
  ]);
  assert.equal(alert?.title, "Request accepted");
  assert.match(alert?.message ?? "", /request was accepted/i);
  assert.match(alert?.message ?? "", /message delivery failed/);
});

test("invalidates the chat list after a successful offer message", async () => {
  const calls = [];
  const result = await runTailorOfferFlow({
    requestId: 42,
    message: "My offer",
    refreshRequests: async () => ({ data: [openRequest] }),
    acceptRequest: async () => calls.push("accept"),
    createConversation: async () => ({ id: 101 }),
    sendMessage: async () => calls.push("send"),
    onAccepted: () => calls.push("invalidate-requests"),
    onConversationCreated: () => calls.push("open-chat"),
    onMessageSent: () => calls.push("invalidate-chat-list"),
  });

  assert.equal(result.status, "sent");
  assert.equal(getTailorOfferAlert(result), null);
  assert.deepEqual(calls, ["accept", "invalidate-requests", "open-chat", "send", "invalidate-chat-list"]);
});

test("keeps request results in a distinct cache entry for each tailor account", () => {
  const firstAccountKey = tailorDesignRequestsQueryKey("tailor-1", "newest", "all");
  const secondAccountKey = tailorDesignRequestsQueryKey("tailor-2", "newest", "all");

  assert.notDeepEqual(firstAccountKey, secondAccountKey);
  assert.deepEqual(firstAccountKey, ["tailor-design-requests", "tailor-1", "newest", "all"]);
});
