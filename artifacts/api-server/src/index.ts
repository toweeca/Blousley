// Copyright © 2026 Blousley. All rights reserved.
import app from "./app";
import { attachChatRealtime } from "./routes/chat";
import { runMigrations } from "stripe-replit-sync";
import { getStripeClient, getStripeSync } from "./stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  try {
    await getStripeClient();
    await runMigrations({ databaseUrl: process.env.DATABASE_URL });
    const sync = await getStripeSync();
    const host = (process.env.REPLIT_DOMAINS ?? process.env.REPLIT_DEV_DOMAIN ?? "").split(",")[0];
    if (!host) throw new Error("App domain is required");
    const events = ["checkout.session.completed", "checkout.session.async_payment_succeeded"] as const;
    const webhook = await sync.findOrCreateManagedWebhook(`https://${host}/api/stripe/webhook`, {
      enabled_events: [...events],
      description: "Blousley test-mode customer design request payments",
    });
    const stripe = await getStripeClient();
    await stripe.webhookEndpoints.update(webhook.id, { enabled_events: [...events] });
    console.log("Stripe test-mode payments initialized");
  } catch {
    console.error("Stripe test-mode payment setup unavailable. Check the backend test key and Stripe webhook configuration.");
  }

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  attachChatRealtime(server);
}

start().catch((error) => {
  console.error("API startup failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
