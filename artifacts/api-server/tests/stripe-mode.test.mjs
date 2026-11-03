import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

const originalMode = process.env.STRIPE_MODE;
process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture";

async function importFreshStripeClient(mode, secretKey) {
  if (mode === undefined) delete process.env.STRIPE_MODE;
  else process.env.STRIPE_MODE = mode;
  if (secretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = secretKey;
  return import(`../src/stripeClient.ts?fixture=${randomBytes(8).toString("hex")}`);
}

test("STRIPE_MODE=test rejects a live secret key", async () => {
  try {
    const stripeClient = await importFreshStripeClient("test", "sk_live_synthetic_fixture");
    await assert.rejects(stripeClient.getStripeClient(), /does not match STRIPE_MODE=test/);
  } finally {
    if (originalMode === undefined) delete process.env.STRIPE_MODE;
    else process.env.STRIPE_MODE = originalMode;
    process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture";
  }
});

test("STRIPE_MODE=live rejects a test secret key", async () => {
  try {
    const stripeClient = await importFreshStripeClient("live", "sk_test_synthetic_fixture");
    await assert.rejects(stripeClient.getStripeClient(), /does not match STRIPE_MODE=live/);
  } finally {
    if (originalMode === undefined) delete process.env.STRIPE_MODE;
    else process.env.STRIPE_MODE = originalMode;
    process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture";
  }
});

test("test and live modes accept only matching synthetic secret-key prefixes", async () => {
  const previousMode = process.env.STRIPE_MODE;
  try {
    const testClient = await importFreshStripeClient("test", "sk_test_synthetic_fixture");
    assert.ok(await testClient.getStripeClient());
    const liveClient = await importFreshStripeClient("live", "rk_live_synthetic_fixture");
    assert.ok(await liveClient.getStripeClient());
  } finally {
    if (previousMode === undefined) delete process.env.STRIPE_MODE;
    else process.env.STRIPE_MODE = previousMode;
    process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture";
  }
});

test("unset or invalid STRIPE_MODE fails closed", async (t) => {
  await t.test("unset", async () => {
    const stripeClient = await importFreshStripeClient(undefined, "sk_test_synthetic_fixture");
    assert.throws(() => stripeClient.getStripeMode(), /STRIPE_MODE must be 'test' or 'live'/);
    await assert.rejects(stripeClient.getStripeClient(), /STRIPE_MODE must be 'test' or 'live'/);
  });

  await t.test("invalid", async () => {
    const stripeClient = await importFreshStripeClient("sandbox", "sk_test_synthetic_fixture");
    assert.throws(() => stripeClient.getStripeMode(), /STRIPE_MODE must be 'test' or 'live'/);
    await assert.rejects(stripeClient.getStripeClient(), /STRIPE_MODE must be 'test' or 'live'/);
  });

  if (originalMode === undefined) delete process.env.STRIPE_MODE;
  else process.env.STRIPE_MODE = originalMode;
  process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture";
});
