import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let managedWebhookSecret: string | undefined;

export function setManagedWebhookSecret(secret: string): void {
  managedWebhookSecret = secret;
}

async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!hostname || !token) throw new Error("Stripe connection is unavailable");

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`Stripe connection lookup failed (${response.status})`);
  const data = await response.json() as { items?: Array<{ settings?: { secret_key?: string; webhook_secret?: string } }> };
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret_key?.startsWith("sk_test_")) {
    throw new Error("Stripe must be connected with a test-mode secret key");
  }
  return { secretKey: settings.secret_key, webhookSecret: settings.webhook_secret };
}

export async function getStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: managedWebhookSecret ?? webhookSecret ?? "",
  });
}

export async function getStripeWebhookSecret(): Promise<string> {
  const { webhookSecret } = await getStripeCredentials();
  const resolved = managedWebhookSecret ?? webhookSecret;
  if (!resolved) throw new Error("Stripe webhook is not configured");
  return resolved;
}
