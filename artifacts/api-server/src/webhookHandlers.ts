import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { db, customerIdeasTable } from "@workspace/db";
import { getStripeSync } from "./stripeClient";

export async function processStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  const sync = await getStripeSync();
  await sync.processWebhook(payload, signature);
  // Only inspect the payload after the sync library has verified its signature.
  const event = JSON.parse(payload.toString("utf8")) as Stripe.Event;
  if (event.livemode) throw new Error("Live-mode Stripe events are not accepted");

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return;
  const session = event.data.object as Stripe.Checkout.Session;
  const ideaId = Number(session.metadata?.ideaId);
  const customerId = session.metadata?.customerId;
  const amount = session.amount_total;
  if (
    session.payment_status !== "paid" ||
    session.currency !== "cad" ||
    !Number.isSafeInteger(ideaId) ||
    !customerId ||
    !Number.isInteger(amount) ||
    amount! < 4000 ||
    amount! > 10000
  ) return;

  await db.update(customerIdeasTable)
    .set({
      paymentStatus: "paid_open",
      paidAt: new Date(),
      sharedWithTailors: true,
      updatedAt: new Date(),
    })
    .where(and(
      eq(customerIdeasTable.id, ideaId),
      eq(customerIdeasTable.userId, customerId),
      eq(customerIdeasTable.paymentStatus, "unpaid"),
      eq(customerIdeasTable.stripeCheckoutSessionId, session.id),
      isNull(customerIdeasTable.assignedTailorId),
      eq(customerIdeasTable.requestPriceCents, amount!),
    ));
}
