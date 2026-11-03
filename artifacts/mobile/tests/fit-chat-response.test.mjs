import assert from "node:assert/strict";
import test from "node:test";
import { readApiJson, resolvePrivateFitImageUrl } from "../lib/api-base-url.ts";

test("quote HTML and malformed JSON never leak a raw JSON parse error", async () => {
  for (const [body, contentType] of [
    ["<html>Service unavailable</html>", "text/html"],
    ["<html>Service unavailable</html>", "application/json"],
    ["{", "application/json"],
  ]) {
    await assert.rejects(
      readApiJson(new Response(body, { status: 502, headers: { "Content-Type": contentType } })),
      { message: "Server connection error: API host returned an invalid response" },
    );
  }
});

test("missing quote endpoint reports that the quote was not sent", async () => {
  const message = "Quote service is unavailable on this API version. The API needs to be updated; your quote was not sent.";
  await assert.rejects(
    readApiJson(new Response("<html>Cannot POST</html>", {
      status: 404, headers: { "Content-Type": "text/html" },
    }), message),
    { message },
  );
  assert.deepEqual(
    await readApiJson(Response.json({ error: "Conversation not found" }, { status: 404 }), message),
    { error: "Conversation not found" },
  );
});

test("valid quote responses retain their exact server values", async () => {
  const quote = { fitQuoteCents: 12345, fitPaidAt: null };
  assert.deepEqual(await readApiJson(Response.json(quote)), quote);
});

test("Hub fit pictures use the configured API origin only when an image exists", () => {
  assert.equal(
    resolvePrivateFitImageUrl("https://blousley.replit.app", 42, true),
    "https://blousley.replit.app/api/images/fits/42",
  );
  assert.equal(
    resolvePrivateFitImageUrl("blousley.replit.app", 42, false),
    null,
  );
  assert.throws(() => resolvePrivateFitImageUrl("https://blousley.replit.app", 0, true), /Invalid fit/);
});
