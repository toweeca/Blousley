// Copyright © 2026 Blousley. All rights reserved.
import { Router } from "express";
import type { Server } from "node:http";
import { db } from "@workspace/db";
import { conversations, messages, customerIdeasTable, blouseFitsTable } from "@workspace/db/schema";
import { eq, or, desc, and, ne, isNull } from "drizzle-orm";
import { WebSocket, WebSocketServer } from "ws";
import { isValidUserId, withRlsUser } from "../../lib/rls";
import { findSessionUser } from "../../lib/auth";

const router = Router();
const chatSockets = new Map<number, Set<WebSocket>>();

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
