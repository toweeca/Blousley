// Copyright © 2026 Blousley. All rights reserved.
import { Router } from "express";
import type { Server } from "node:http";
import { db } from "@workspace/db";
import { conversations, messages, customerIdeasTable, blouseFitsTable } from "@workspace/db/schema";
import { eq, or, desc, and, ne, isNull } from "drizzle-orm";
import { WebSocket, WebSocketServer } from "ws";

const router = Router();
const chatSockets = new Map<number, Set<WebSocket>>();

export function attachChatRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/chat/ws" });

  wss.on("connection", async (socket, request) => {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
    const conversationId = Number(url.searchParams.get("conversationId"));
    const userId = url.searchParams.get("userId");
    if (!conversationId || !userId) {
      socket.close(1008, "conversationId and userId required");
      return;
    }

    try {
      const [conversation] = await db
        .select({ customerId: conversations.customerId, tailorId: conversations.tailorId })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
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
  const { userId, fitId } = req.query as { userId?: string; fitId?: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

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
        const unreadRows = await db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, c.id), eq(messages.isRead, false)));
        const unread = unreadRows.filter((m) => m.senderId !== userId).length;

        const lastMsgRows = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, c.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

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
  const { userId } = req.query as { userId?: string };
  if (!id) return res.status(400).json({ error: "conversation id required" });
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { convo, allowed } = await getConversationForParticipant(id, userId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });
    if (!convo.ideaId) return res.json(null);

    const ideaRows = await db
      .select()
      .from(customerIdeasTable)
      .where(eq(customerIdeasTable.id, convo.ideaId))
      .limit(1);
    res.json(ideaRows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/conversations", async (req, res) => {
  const { customerId, tailorId, requesterId, title, ideaId, fitId } = req.body as {
    customerId: string;
    tailorId: string;
    requesterId: string;
    title?: string;
    ideaId?: number;
    fitId?: number;
  };
  if (!customerId || !tailorId || !requesterId)
    return res.status(400).json({ error: "customerId, tailorId, and requesterId required" });
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
  const { conversationId, userId } = req.query as { conversationId?: string; userId?: string };
  if (!conversationId) return res.status(400).json({ error: "conversationId required" });
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { convo, allowed } = await getConversationForParticipant(Number(conversationId), userId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, Number(conversationId)))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/messages", async (req, res) => {
  const { conversationId, senderId, content } = req.body as {
    conversationId: number;
    senderId: string;
    content: string;
  };
  if (!conversationId || !senderId || !content)
    return res.status(400).json({ error: "conversationId, senderId, content required" });

  try {
    const { convo, allowed } = await getConversationForParticipant(conversationId, senderId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });

    const [msg] = await db
      .insert(messages)
      .values({ conversationId, senderId, content, role: "user", isRead: false })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    broadcastChatMessage(conversationId, msg);
    res.status(201).json(msg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/messages/read", async (req, res) => {
  const { conversationId, userId } = req.body as {
    conversationId: number;
    userId: string;
  };
  if (!conversationId || !userId)
    return res.status(400).json({ error: "conversationId and userId required" });

  try {
    const { convo, allowed } = await getConversationForParticipant(conversationId, userId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (!allowed) return res.status(403).json({ error: "Not a participant in this conversation" });

    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false),
          or(ne(messages.senderId, userId), isNull(messages.senderId))
        )
      );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
