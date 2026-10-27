import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { authDiagnostics } from "../src/lib/authDiagnostics.ts";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("diagnostics only log approved redacted fields and normalized route patterns", async () => {
  const logs = [];
  const originalInfo = console.info;
  console.info = (...args) => logs.push(args);
  const app = express();
  app.use(cookieParser(), authDiagnostics(true));
  app.post("/api/ideas/:id/checkout", (req, res) => {
    if (req.headers["x-test-auth"] === "yes") req.userId = "private-user-id";
    res.status(req.userId ? 403 : 401).json({ error: "private email@example.invalid and request details" });
  });
  app.post("/api/unapproved", (_req, res) => res.json({}));
  const syntheticCookie = "Z".repeat(43);
  try {
    await withServer(app, async (base) => {
      await fetch(`${base}/api/ideas/123/checkout`, { method: "POST" });
      await fetch(`${base}/api/ideas/456/checkout`, {
        method: "POST", headers: { Cookie: `blousley_session=${syntheticCookie}`, "x-test-auth": "yes" },
      });
      await fetch(`${base}/api/unapproved`, { method: "POST" });
    });
  } finally { console.info = originalInfo; }
  assert.equal(logs.length, 2);
  const expected = ["route", "status", "cookieHeaderReceived", "sessionCookiePresent", "sessionAuthenticated", "errorReason"].sort();
  for (const [label, data] of logs) {
    assert.equal(label, "auth_request_diagnostic");
    const record = JSON.parse(data);
    assert.deepEqual(Object.keys(record).sort(), expected);
    assert.equal(record.route, "/api/ideas/:id/checkout");
    assert.equal(data.includes(syntheticCookie), false);
    assert.equal(data.includes("private-user-id"), false);
    assert.equal(data.includes("email@"), false);
  }
  assert.deepEqual(JSON.parse(logs[0][1]), {
    route: "/api/ideas/:id/checkout", status: 401, cookieHeaderReceived: false,
    sessionCookiePresent: false, sessionAuthenticated: false, errorReason: "authentication_required",
  });
  assert.deepEqual(JSON.parse(logs[1][1]), {
    route: "/api/ideas/:id/checkout", status: 403, cookieHeaderReceived: true,
    sessionCookiePresent: true, sessionAuthenticated: true, errorReason: "access_denied",
  });
});

test("disabled diagnostics do not emit a log", async () => {
  const logs = [];
  const originalInfo = console.info;
  console.info = (...args) => logs.push(args);
  const app = express();
  app.use(authDiagnostics(false));
  app.post("/api/ideas", (_req, res) => res.status(401).json({ error: "Authentication required" }));
  try {
    await withServer(app, (base) => fetch(`${base}/api/ideas`, { method: "POST" }));
  } finally { console.info = originalInfo; }
  assert.deepEqual(logs, []);
});

test("the actual API rejects all four approved routes without a cookie", async () => {
  if (process.env.NODE_ENV === "production") throw new Error("Workspace tests only");
  const { default: app } = await import("../src/app.ts");
  await withServer(app, async (base) => {
    for (const route of [
      "/api/generate-blouse-image/style", "/api/ideas",
      "/api/ideas/1/checkout", "/api/chat/conversations/1/fit-checkout",
    ]) {
      const response = await fetch(`${base}${route}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      assert.equal(response.status, 401, route);
      assert.deepEqual(await response.json(), { error: "Authentication required" });
    }
  });
});
