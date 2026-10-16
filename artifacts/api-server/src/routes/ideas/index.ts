// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { db, customerIdeasTable, usersTable } from "@workspace/db";
import { eq, desc, asc, and, gte, lt, isNull } from "drizzle-orm";
import { isValidUserId } from "../../lib/rls";
import { getStripeClient } from "../../stripeClient";

const router: IRouter = Router();
const MIN_REQUEST_PRICE_CENTS = 4000;
const MAX_REQUEST_PRICE_CENTS = 10000;
let requestProductId: string | undefined;

async function getRequestProduct(stripe: Stripe): Promise<string> {
  if (requestProductId) return requestProductId;
  const found = await stripe.products.search({
    query: "metadata['blousley_type']:'customer_design_request'",
    limit: 1,
  });
  const product = found.data[0] ?? await stripe.products.create({
    name: "Blousley Customer Design Request",
    metadata: { blousley_type: "customer_design_request" },
  });
  requestProductId = product.id;
  return product.id;
}

const isSafeText = (value: unknown, maxLength: number) =>
  value === undefined || value === null ||
  (typeof value === "string" && value.length <= maxLength && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/.test(value));

router.get("/", async (req, res) => {
  try {
    const { userId, tailorView, sort, from, to } = req.query as {
      userId?: string;
      tailorView?: string;
      sort?: string;
      from?: string;
      to?: string;
    };
    if (!isValidUserId(userId)) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (tailorView === "true") {
      const dateFilters = [
        eq(customerIdeasTable.sharedWithTailors, true),
        eq(customerIdeasTable.paymentStatus, "paid_open"),
        ...(typeof from === "string" && !Number.isNaN(Date.parse(from))
          ? [gte(customerIdeasTable.createdAt, new Date(from))]
          : []),
        ...(typeof to === "string" && !Number.isNaN(Date.parse(to))
          ? [lt(customerIdeasTable.createdAt, new Date(to))]
          : []),
      ];
      const ideas = await db
        .select()
        .from(customerIdeasTable)
        .where(and(...dateFilters))
        .orderBy(sort === "oldest" ? asc(customerIdeasTable.createdAt) : desc(customerIdeasTable.createdAt));
      res.json(ideas);
    } else {
      const ideas = await db
        .select()
        .from(customerIdeasTable)
        .where(eq(customerIdeasTable.userId, userId))
        .orderBy(desc(customerIdeasTable.createdAt));
      res.json(ideas);
    }
  } catch (err) {
    console.error("GET /ideas error:", err);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, imageUrl, sketchCanvas, notes, title, requestPriceCents } = req.body as {
      userId: string;
      imageUrl?: string | null;
      sketchCanvas?: unknown;
      notes?: string;
      title?: string;
      requestPriceCents?: number;
    };
    if (!isValidUserId(userId) || req.userId !== userId || !Number.isInteger(requestPriceCents) || requestPriceCents! < MIN_REQUEST_PRICE_CENTS || requestPriceCents! > MAX_REQUEST_PRICE_CENTS || !isSafeText(title, 160) || !isSafeText(notes, 4_000) || (imageUrl != null && (typeof imageUrl !== "string" || imageUrl.length > 7_000_000))) {
      res.status(400).json({ error: "A request price from CAD $40.00 to $100.00 is required" });
      return;
    }
    const inserted = await db
      .insert(customerIdeasTable)
      .values({
        userId,
        imageUrl,
        sketchCanvas: sketchCanvas as any,
        notes,
        title,
        sharedWithTailors: false,
        requestPriceCents,
        paymentStatus: "unpaid",
      })
      .returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("POST /ideas error:", err);
    res.status(500).json({ error: "Failed to save idea" });
  }
});

router.post("/:id/checkout", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || !isValidUserId(req.userId)) {
      res.status(400).json({ error: "A valid request is required" });
      return;
    }
    let [idea] = await db.select().from(customerIdeasTable)
      .where(and(eq(customerIdeasTable.id, id), eq(customerIdeasTable.userId, req.userId)))
      .limit(1);
    if (!idea) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (idea.paymentStatus !== "unpaid") {
      res.status(409).json({ error: "Only unpaid requests can be paid" });
      return;
    }
    if (idea.requestPriceCents === null) {
      const enteredAmount = req.body?.requestPriceCents;
      if (!Number.isInteger(enteredAmount) || enteredAmount < MIN_REQUEST_PRICE_CENTS || enteredAmount > MAX_REQUEST_PRICE_CENTS) {
        res.status(400).json({ error: "Enter a request price from CAD $40.00 to $100.00" });
        return;
      }
      const [pricedIdea] = await db.update(customerIdeasTable)
        .set({ requestPriceCents: enteredAmount, updatedAt: new Date() })
        .where(and(
          eq(customerIdeasTable.id, idea.id),
          eq(customerIdeasTable.userId, req.userId),
          eq(customerIdeasTable.paymentStatus, "unpaid"),
          isNull(customerIdeasTable.requestPriceCents),
          isNull(customerIdeasTable.stripeCheckoutSessionId),
        )).returning();
      if (!pricedIdea) {
        res.status(409).json({ error: "Request changed; refresh before starting Checkout" });
        return;
      }
      idea = pricedIdea;
    }
    const amount = idea.requestPriceCents;
    if (!Number.isInteger(amount) || amount! < MIN_REQUEST_PRICE_CENTS || amount! > MAX_REQUEST_PRICE_CENTS) {
      res.status(400).json({ error: "Request price must be CAD 4000–10000 cents" });
      return;
    }
    const stripe = await getStripeClient();
    if (idea.stripeCheckoutSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(idea.stripeCheckoutSessionId);
      if (existing.status === "open" && existing.url) {
        res.json({ url: existing.url });
        return;
      }
      if (existing.payment_status === "paid") {
        res.status(409).json({ error: "Payment is being confirmed" });
        return;
      }
    }
    const productId = await getRequestProduct(stripe);
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
      metadata: { ideaId: String(idea.id), customerId: idea.userId },
    });
    const [saved] = await db.update(customerIdeasTable)
      .set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
      .where(and(
        eq(customerIdeasTable.id, idea.id),
        eq(customerIdeasTable.userId, idea.userId),
        eq(customerIdeasTable.paymentStatus, "unpaid"),
        idea.stripeCheckoutSessionId
          ? eq(customerIdeasTable.stripeCheckoutSessionId, idea.stripeCheckoutSessionId)
          : isNull(customerIdeasTable.stripeCheckoutSessionId),
      ))
      .returning({ id: customerIdeasTable.id });
    if (!saved) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      res.status(409).json({ error: "Checkout is already being prepared" });
      return;
    }
    res.json({ url: session.url });
  } catch (err) {
    console.error("POST /ideas/:id/checkout failed");
    res.status(500).json({ error: "Could not start Checkout" });
  }
});

router.post("/:id/accept", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const tailorId = req.userId;
    if (!Number.isSafeInteger(id) || !isValidUserId(tailorId)) {
      res.status(400).json({ error: "A valid request and tailor are required" });
      return;
    }
    const [tailor] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, tailorId), eq(usersTable.role, "tailor"))).limit(1);
    if (!tailor) {
      res.status(403).json({ error: "Only tailors can accept requests" });
      return;
    }
    const [accepted] = await db.update(customerIdeasTable)
      .set({ paymentStatus: "accepted", assignedTailorId: tailorId, acceptedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(customerIdeasTable.id, id),
        eq(customerIdeasTable.paymentStatus, "paid_open"),
        isNull(customerIdeasTable.assignedTailorId),
        isNull(customerIdeasTable.acceptedAt),
      ))
      .returning();
    if (!accepted) {
      const [current] = await db.select().from(customerIdeasTable)
        .where(eq(customerIdeasTable.id, id)).limit(1);
      if (!current) {
        res.status(404).json({ error: "Design request not found" });
        return;
      }
      if (current.paymentStatus === "unpaid") {
        res.status(409).json({ error: "Design request is unpaid and cannot be accepted" });
        return;
      }
      if (current.paymentStatus === "cancelled") {
        res.status(409).json({ error: "Design request is cancelled" });
        return;
      }
      if (current.paymentStatus === "completed") {
        res.status(409).json({ error: "Design request is already completed" });
        return;
      }
      if (
        current.paymentStatus === "accepted" &&
        current.assignedTailorId === tailorId &&
        current.acceptedAt !== null
      ) {
        res.json(current);
        return;
      }
      if (current.paymentStatus === "accepted" || current.assignedTailorId !== null || current.acceptedAt !== null) {
        res.status(409).json({ error: "Design request has already been accepted" });
        return;
      }
      res.status(409).json({ error: "Design request is not open for acceptance" });
      return;
    }
    res.json(accepted);
  } catch (err) {
    console.error("POST /ideas/:id/accept error:", err);
    res.status(500).json({ error: "Could not accept request" });
  }
});

router.patch("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, sharedWithTailors } = req.body as { userId?: string; sharedWithTailors?: boolean };
    if (!isValidUserId(userId) || !Number.isSafeInteger(Number(id)) || typeof sharedWithTailors !== "boolean") {
      res.status(400).json({ error: "Valid idea, user, and share setting are required" });
      return;
    }
    if (sharedWithTailors) {
      res.status(409).json({ error: "Requests are shared only after successful payment" });
      return;
    }
    const updated = await db
      .update(customerIdeasTable)
      .set({ sharedWithTailors, updatedAt: new Date() })
      .where(and(eq(customerIdeasTable.id, Number(id)), eq(customerIdeasTable.userId, userId)))
      .returning();
    if (!updated.length) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.json(updated[0]);
  } catch (err) {
    console.error("PATCH /ideas/:id/share error:", err);
    res.status(500).json({ error: "Failed to update share status" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query as { userId?: string };
    if (!isValidUserId(userId) || !Number.isSafeInteger(Number(id))) {
      res.status(400).json({ error: "Valid idea and user are required" });
      return;
    }
    const deleted = await db
      .delete(customerIdeasTable)
      .where(and(
        eq(customerIdeasTable.id, Number(id)),
        eq(customerIdeasTable.userId, userId),
        eq(customerIdeasTable.paymentStatus, "unpaid"),
        isNull(customerIdeasTable.stripeCheckoutSessionId),
      ))
      .returning({ id: customerIdeasTable.id });
    if (!deleted.length) {
      res.status(409).json({ error: "Only unpaid requests without a Checkout session can be deleted" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /ideas/:id error:", err);
    res.status(500).json({ error: "Failed to delete idea" });
  }
});

export default router;
