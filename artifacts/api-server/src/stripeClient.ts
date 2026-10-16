import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeClient: Stripe | undefined;
let stripeSync: StripeSync | undefined;

function testSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode secret key");
  }
  return key;
}

export async function getStripeClient(): Promise<Stripe> {
  stripeClient ??= new Stripe(testSecretKey());
  return stripeClient;
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  stripeSync ??= new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL, max: 2 },
    stripeSecretKey: testSecretKey(),
    // The sync library verifies signatures with its persisted managed webhook secret.
  });
  return stripeSync;
}
