import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeClient: Stripe | undefined;
let stripeSync: StripeSync | undefined;

export type StripeMode = "test" | "live";

export function getStripeMode(): StripeMode {
  const mode = process.env.STRIPE_MODE;
  if (mode !== "test" && mode !== "live") {
    throw new Error("STRIPE_MODE must be 'test' or 'live'");
  }
  return mode;
}

function configuredSecretKey(): string {
  const mode = getStripeMode();
  const key = process.env.STRIPE_SECRET_KEY;
  const prefixes = mode === "test"
    ? ["sk_test_", "rk_test_"]
    : ["sk_live_", "rk_live_"];
  if (!key || !prefixes.some((prefix) => key.startsWith(prefix))) {
    throw new Error(`STRIPE_SECRET_KEY does not match STRIPE_MODE=${mode}`);
  }
  return key;
}

export async function getStripeClient(): Promise<Stripe> {
  stripeClient ??= new Stripe(configuredSecretKey());
  return stripeClient;
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  stripeSync ??= new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL, max: 2 },
    stripeSecretKey: configuredSecretKey(),
    // The sync library verifies signatures with its persisted managed webhook secret.
  });
  return stripeSync;
}
