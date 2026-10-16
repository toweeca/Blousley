import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { db, customerIdeasTable } from "@workspace/db";
import { getStripeClient, getStripeSync, getStripeWebhookSecret } from "./stripeClient";

export async function processStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  const stripe = await getStripeClient();
  const event = stripe.webhooks.constructEvent(payload, signature, await getStripeWebhookSecret());
  if (event.livemode) throw new Error("Live-mode Stripe events are not accepted");

  const sync = await getStripeSync();
  await sync.processWebhook(payload, signature);

  if (event.type !== "checkout.session.completed") return;
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
