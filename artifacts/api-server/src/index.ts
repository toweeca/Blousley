// Copyright © 2026 Blousley. All rights reserved.
import app from "./app";
import { attachChatRealtime } from "./routes/chat";
import { runMigrations } from "stripe-replit-sync";
import { getStripeClient, getStripeSync, setManagedWebhookSecret } from "./stripeClient";

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
  await runMigrations({ databaseUrl: process.env.DATABASE_URL });
  await getStripeClient();
  const sync = await getStripeSync();
  const host = (process.env.REPLIT_DOMAINS ?? process.env.REPLIT_DEV_DOMAIN ?? "").split(",")[0];
  if (!host) throw new Error("App domain is required to configure Stripe webhooks");
  const webhook = await sync.findOrCreateManagedWebhook(`https://${host}/api/stripe/webhook`, {
    enabled_events: ["checkout.session.completed"],
    description: "Blousley test-mode customer design request payments",
  });
  if (webhook.secret) setManagedWebhookSecret(webhook.secret);

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  attachChatRealtime(server);
}

start().catch((error) => {
  console.error("API startup failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
