// Copyright © 2026 Blousley. All rights reserved.
import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, customerIdeasTable } from "@workspace/db/schema";
import { eq, or, desc, and, ne, isNull } from "drizzle-orm";

const router = Router();

router.get("/conversations", async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const convos = await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.customerId, userId), eq(conversations.tailorId, userId)))
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
  if (!id) return res.status(400).json({ error: "conversation id required" });

  try {
    const convoRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    const convo = convoRows[0];
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
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
  const { customerId, tailorId, title, ideaId } = req.body as {
    customerId: string;
    tailorId: string;
    title?: string;
    ideaId?: number;
  };
  if (!customerId || !tailorId)
    return res.status(400).json({ error: "customerId and tailorId required" });

  try {
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.customerId, customerId), eq(conversations.tailorId, tailorId))
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
      })
      .returning();

    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/messages", async (req, res) => {
  const { conversationId } = req.query as { conversationId?: string };
  if (!conversationId) return res.status(400).json({ error: "conversationId required" });

  try {
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
    const [msg] = await db
      .insert(messages)
      .values({ conversationId, senderId, content, role: "user", isRead: false })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

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
