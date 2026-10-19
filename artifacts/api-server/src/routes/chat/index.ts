// Copyright © 2026 Blousley. All rights reserved.
import { Router } from "express";
import type { Server } from "node:http";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { conversations, messages, customerIdeasTable, blouseFitsTable } from "@workspace/db/schema";
import { eq, or, desc, and, ne, isNull, isNotNull } from "drizzle-orm";
import { WebSocket, WebSocketServer } from "ws";
import { isValidUserId, withRlsUser } from "../../lib/rls";
import { findSessionUser } from "../../lib/auth";
import { getStripeClient } from "../../stripeClient";

const router = Router();
const chatSockets = new Map<number, Set<WebSocket>>();
const MIN_FIT_QUOTE_CENTS = 50;
const MAX_FIT_QUOTE_CENTS = 99_999_999;
let fitProductId: string | undefined;

async function getFitProduct(stripe: Stripe): Promise<string> {
  if (fitProductId) return fitProductId;
  const found = await stripe.products.search({
    query: "metadata['blousley_type']:'fit_tailoring'",
    limit: 1,
  });
  const product = found.data[0] ?? await stripe.products.create({
    name: "Blousley Tailoring Service",
    metadata: { blousley_type: "fit_tailoring" },
  });
  fitProductId = product.id;
  return product.id;
}

export function attachChatRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/chat/ws" });

  wss.on("connection", async (socket, request) => {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
    const conversationId = Number(url.searchParams.get("conversationId"));
    const claimedUserId = url.searchParams.get("userId");
    const userId = await findSessionUser(request.headers.cookie);
    if (!Number.isSafeInteger(conversationId) || conversationId <= 0 || !isValidUserId(userId) || (claimedUserId && claimedUserId !== userId)) {
      socket.close(1008, "Authenticated conversation access required");
      return;
    }

    try {
      const conversation = await withRlsUser(userId, async (tx) => {
        const [row] = await tx
          .select({ customerId: conversations.customerId, tailorId: conversations.tailorId })
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);
        return row;
      });
      if (!conversation || (conversation.customerId !== userId && conversation.tailorId !== userId)) {
        socket.close(1008, "Not a conversation participant");
        return;
      }

      const sockets = chatSockets.get(conversationId) ?? new Set<WebSocket>();
      sockets.add(socket);
      chatSockets.set(conversationId, sockets);
      const removeSocket = () => {
        sockets.delete(socket);
        if (sockets.size === 0) chatSockets.delete(conversationId);
      };
      socket.on("close", removeSocket);
      socket.on("error", removeSocket);
    } catch {
      socket.close(1011, "Could not authorize chat");
    }
  });
}

function broadcastChatMessage(conversationId: number, message: unknown) {
  const sockets = chatSockets.get(conversationId);
  if (!sockets) return;
  const payload = JSON.stringify({ type: "message", message });
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}

// Returns the conversation if userId is a participant (customer or tailor), else null.
async function getConversationForParticipant(conversationId: number, userId: string) {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  const convo = rows[0];
  if (!convo) return { convo: null, allowed: false };
  const allowed = convo.customerId === userId || convo.tailorId === userId;
  return { convo, allowed };
}

router.get("/conversations/:id/payment", async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.userId;
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "conversation id required" });
  if (!isValidUserId(userId)) return res.status(401).json({ error: "Authentication required" });

  try {
    const { convo, allowed } = await withRlsUser(userId, () => getConversationForParticipant(id, userId));
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });
    return res.json({
      id: convo.id,
      customerId: convo.customerId,
      tailorId: convo.tailorId,
      fitId: convo.fitId,
      fitQuoteCents: convo.fitQuoteCents,
      fitPaidAt: convo.fitPaidAt,
      quoteCheckoutStarted: Boolean(convo.fitStripeCheckoutSessionId),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/conversations/:id/quote", async (req, res) => {
  const id = Number(req.params.id);
  const tailorId = req.userId;
  const { amountCents } = req.body as { amountCents?: number };
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "conversation id required" });
  if (!isValidUserId(tailorId)) return res.status(401).json({ error: "Authentication required" });
  if (!Number.isSafeInteger(amountCents) || amountCents! < MIN_FIT_QUOTE_CENTS || amountCents! > MAX_FIT_QUOTE_CENTS) {
    return res.status(400).json({ error: "Enter a CAD quote of at least $0.50" });
  }

  try {
    const { convo, allowed } = await withRlsUser(tailorId, () => getConversationForParticipant(id, tailorId));
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed || convo.tailorId !== tailorId) return res.status(403).json({ error: "Only the assigned tailor can send a quote" });
    if (convo.fitId === null) return res.status(409).json({ error: "Quotes are only available for My Fits conversations" });
    if (convo.fitPaidAt) return res.status(409).json({ error: "This quote has already been paid" });

    if (convo.fitStripeCheckoutSessionId) {
      const stripe = await getStripeClient();
      const existingSession = await stripe.checkout.sessions.retrieve(convo.fitStripeCheckoutSessionId);
      if (existingSession.status !== "expired") {
        return res.status(409).json({ error: "The quote cannot be changed after Checkout has started" });
      }
    }

    const quoteCondition = convo.fitQuoteCents === null
      ? isNull(conversations.fitQuoteCents)
      : eq(conversations.fitQuoteCents, convo.fitQuoteCents);
    const sessionCondition = convo.fitStripeCheckoutSessionId
      ? eq(conversations.fitStripeCheckoutSessionId, convo.fitStripeCheckoutSessionId)
      : isNull(conversations.fitStripeCheckoutSessionId);
    const sentQuote = await withRlsUser(tailorId, async (tx) => {
      const [updated] = await tx.update(conversations)
        .set({
          fitQuoteCents: amountCents!,
          fitStripeCheckoutSessionId: null,
        })
        .where(and(
          eq(conversations.id, id),
          eq(conversations.tailorId, tailorId),
          isNotNull(conversations.fitId),
          isNull(conversations.fitPaidAt),
          quoteCondition,
          sessionCondition,
        ))
        .returning({
          fitQuoteCents: conversations.fitQuoteCents,
          fitPaidAt: conversations.fitPaidAt,
        });
      if (!updated) return null;
      const [message] = await tx.insert(messages).values({
        conversationId: id,
        senderId: tailorId,
        content: `Tailor ${convo.fitQuoteCents === null ? "sent" : "updated"} a quote of CAD $${(amountCents! / 100).toFixed(2)}. You can pay securely from this conversation.`,
        role: "user",
        isRead: false,
      }).returning();
      await tx.update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, id));
      return { updated, message };
    });
    if (!sentQuote) return res.status(409).json({ error: "Conversation changed; refresh before sending a quote" });
    broadcastChatMessage(id, sentQuote.message);
    return res.json(sentQuote.updated);
  } catch (e: any) {
    return res.status(500).json({ error: "Could not send quote" });
  }
});

router.post("/conversations/:id/fit-checkout", async (req, res) => {
  const id = Number(req.params.id);
  const customerId = req.userId;
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "conversation id required" });
  if (!isValidUserId(customerId)) return res.status(401).json({ error: "Authentication required" });

  try {
    const { convo, allowed } = await withRlsUser(customerId, () => getConversationForParticipant(id, customerId));
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed || convo.customerId !== customerId) return res.status(403).json({ error: "Only the customer can pay this quote" });
    if (convo.fitId === null) return res.status(409).json({ error: "This is not a My Fits conversation" });
    if (convo.fitPaidAt) return res.status(409).json({ error: "This quote has already been paid" });
    const amount = convo.fitQuoteCents;
    if (!Number.isSafeInteger(amount) || amount! < MIN_FIT_QUOTE_CENTS || amount! > MAX_FIT_QUOTE_CENTS) {
      return res.status(409).json({ error: "The tailor has not sent a valid CAD quote yet" });
    }

    const stripe = await getStripeClient();
    if (convo.fitStripeCheckoutSessionId) {
      const existingSession = await stripe.checkout.sessions.retrieve(convo.fitStripeCheckoutSessionId);
      if (existingSession.status === "open" && existingSession.url) {
        return res.json({ url: existingSession.url });
      }
      if (existingSession.payment_status === "paid" || existingSession.status === "complete") {
        return res.status(409).json({ error: "Payment is being confirmed" });
      }
    }

    const productId = await getFitProduct(stripe);
    const price = await stripe.prices.create({
      product: productId,
      currency: "cad",
      unit_amount: amount!,
    });
    const host = (process.env.REPLIT_DOMAINS ?? process.env.REPLIT_DEV_DOMAIN ?? "").split(",")[0];
    if (!host) throw new Error("App domain is not configured for Checkout");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      adaptive_pricing: { enabled: false },
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `https://${host}/api/ideas/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${host}/api/ideas/checkout/cancel`,
      metadata: {
        fitConversationId: String(convo.id),
        customerId,
        tailorId: convo.tailorId ?? "",
        fitQuoteCents: String(amount),
      },
    });
    const quoteCondition = eq(conversations.fitQuoteCents, amount!);
    const sessionCondition = convo.fitStripeCheckoutSessionId
      ? eq(conversations.fitStripeCheckoutSessionId, convo.fitStripeCheckoutSessionId)
      : isNull(conversations.fitStripeCheckoutSessionId);
    const [saved] = await db.update(conversations)
      .set({ fitStripeCheckoutSessionId: session.id })
      .where(and(
        eq(conversations.id, id),
        eq(conversations.customerId, customerId),
        isNotNull(conversations.fitId),
        isNull(conversations.fitPaidAt),
        quoteCondition,
        sessionCondition,
      ))
      .returning({ id: conversations.id });
    if (!saved) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      return res.status(409).json({ error: "The quote changed; refresh before starting Checkout" });
    }
    return res.json({ url: session.url });
  } catch {
    return res.status(500).json({ error: "Could not start Checkout" });
  }
});

router.get("/conversations", async (req, res) => {
  const userId = req.userId;
  const { fitId } = req.query as { fitId?: string };
  if (!isValidUserId(userId)) return res.status(401).json({ error: "Authentication required" });
  if (fitId && (!/^\d+$/.test(fitId) || !Number.isSafeInteger(Number(fitId)))) {
    return res.status(400).json({ error: "Valid fitId required" });
  }

  try {
    const participantFilter = or(eq(conversations.customerId, userId), eq(conversations.tailorId, userId));
    const filters = fitId
      ? and(participantFilter, eq(conversations.fitId, Number(fitId)))
      : participantFilter;
    const convos = await db
      .select()
      .from(conversations)
      .where(filters)
      .orderBy(desc(conversations.lastMessageAt));

    const withUnread = await Promise.all(
      convos.map(async (c) => {
        const { unreadRows, lastMsgRows } = await withRlsUser(userId, async (tx) => {
          const unreadRows = await tx
            .select()
            .from(messages)
            .where(and(eq(messages.conversationId, c.id), eq(messages.isRead, false)));
          const lastMsgRows = await tx
            .select()
            .from(messages)
            .where(eq(messages.conversationId, c.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);
          return { unreadRows, lastMsgRows };
        });
        const unread = unreadRows.filter((m: any) => m.senderId !== userId).length;

        return {
          ...c,
          unreadCount: unread,
          lastMessage: lastMsgRows[0] ?? null,
        };
      })
    );

    res.json(withUnread);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/conversations/:id/idea", async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.userId;
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "conversation id required" });
  if (!isValidUserId(userId)) return res.status(401).json({ error: "Authentication required" });

  try {
    const { convo, allowed } = await withRlsUser(userId, () => getConversationForParticipant(id, userId));
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });
    const ideaId = convo.ideaId;
    if (!ideaId) return res.json(null);

    const ideaRows = await withRlsUser<any[]>(userId, (tx) =>
      tx.select().from(customerIdeasTable).where(eq(customerIdeasTable.id, ideaId)).limit(1),
    );
    res.json(ideaRows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/conversations", async (req, res) => {
  const { customerId, tailorId, title, ideaId, fitId } = req.body as {
    customerId: string;
    tailorId: string;
    title?: string;
    ideaId?: number;
    fitId?: number;
  };
  const requesterId = req.userId;
  if (!isValidUserId(customerId) || !isValidUserId(tailorId) || !isValidUserId(requesterId))
    return res.status(400).json({ error: "customerId and tailorId required" });
  if (requesterId !== customerId && requesterId !== tailorId)
    return res.status(403).json({ error: "Requester is not a conversation participant" });

  try {
    if (ideaId) {
      if (!Number.isSafeInteger(ideaId)) {
        return res.status(400).json({ error: "Invalid design request" });
      }
      const [acceptedIdea] = await db
        .select({ id: customerIdeasTable.id })
        .from(customerIdeasTable)
        .where(and(
          eq(customerIdeasTable.id, ideaId),
          eq(customerIdeasTable.userId, customerId),
          eq(customerIdeasTable.paymentStatus, "accepted"),
          eq(customerIdeasTable.assignedTailorId, tailorId),
        ))
        .limit(1);
      if (!acceptedIdea) return res.status(403).json({ error: "Only the accepting tailor can open this request chat" });
    }
    if (fitId && requesterId !== tailorId) {
      return res.status(403).json({ error: "Only the assigned tailor can open this fit chat" });
    }
    if (fitId) {
      const [sharedFit] = await db
        .select({ id: blouseFitsTable.id })
        .from(blouseFitsTable)
        .where(
          and(
            eq(blouseFitsTable.id, fitId),
            eq(blouseFitsTable.userId, customerId),
            eq(blouseFitsTable.findMyTailor, true),
          ),
        )
        .limit(1);
      if (!sharedFit) return res.status(403).json({ error: "This fit is not available for tailor contact" });

      const [assignedConversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.fitId, fitId))
        .limit(1);
      if (assignedConversation && assignedConversation.tailorId !== tailorId) {
        return res.status(409).json({ error: "This fit is already assigned to another tailor" });
      }
    }

    const existing = await db
      .select()
      .from(conversations)
      .where(
        fitId
          ? and(
              eq(conversations.customerId, customerId),
              eq(conversations.tailorId, tailorId),
              eq(conversations.fitId, fitId),
            )
          : and(
              eq(conversations.customerId, customerId),
              eq(conversations.tailorId, tailorId),
              isNull(conversations.fitId),
            )
      )
      .limit(1);

    if (existing.length > 0) {
      if (ideaId && existing[0].ideaId !== ideaId) {
        const [updated] = await db
          .update(conversations)
          .set({ ideaId, ...(title ? { title } : {}) })
          .where(eq(conversations.id, existing[0].id))
          .returning();
        return res.json(updated);
      }
      return res.json(existing[0]);
    }

    const [created] = await db
      .insert(conversations)
      .values({
        title: title ?? `Chat with ${customerId.slice(0, 6)}`,
        customerId,
        tailorId,
        ideaId: ideaId ?? null,
        fitId: fitId ?? null,
      })
      .returning();

    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/messages", async (req, res) => {
  const { conversationId } = req.query as { conversationId?: string };
  const userId = req.userId;
  const parsedConversationId = Number(conversationId);
  if (!Number.isSafeInteger(parsedConversationId) || parsedConversationId <= 0) return res.status(400).json({ error: "conversationId required" });
  if (!isValidUserId(userId)) return res.status(401).json({ error: "Authentication required" });

  try {
    const { convo, allowed } = await getConversationForParticipant(parsedConversationId, userId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });

    const msgs = await withRlsUser(userId, (tx) =>
      tx.select().from(messages).where(eq(messages.conversationId, parsedConversationId)).orderBy(messages.createdAt),
    );
    res.json(msgs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/messages", async (req, res) => {
  const { conversationId, content } = req.body as {
    conversationId: number;
    content: string;
  };
  const senderId = req.userId;
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0 || !isValidUserId(senderId) || typeof content !== "string")
    return res.status(400).json({ error: "conversationId, senderId, content required" });
  const safeContent = content.trim();
  if (!safeContent || safeContent.length > 4_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(safeContent)) {
    return res.status(400).json({ error: "Message content is invalid" });
  }

  try {
    const { convo, allowed } = await getConversationForParticipant(conversationId, senderId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });

    const msg = await withRlsUser(senderId, async (tx) => {
      const [message] = await tx
        .insert(messages)
        .values({ conversationId, senderId, content: safeContent, role: "user", isRead: false })
        .returning();
      await tx
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));
      return message;
    });

    broadcastChatMessage(conversationId, msg);
    res.status(201).json(msg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/messages/read", async (req, res) => {
  const { conversationId } = req.body as {
    conversationId: number;
  };
  const userId = req.userId;
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0 || !isValidUserId(userId))
    return res.status(400).json({ error: "conversationId and userId required" });

  try {
    const { convo, allowed } = await getConversationForParticipant(conversationId, userId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });

    await withRlsUser(userId, (tx) =>
      tx
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.isRead, false),
            or(ne(messages.senderId, userId), isNull(messages.senderId))
          )
        ),
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
