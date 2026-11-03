import assert from "node:assert/strict";
import test from "node:test";
import { createSessionApiClient } from "../lib/api-session.ts";
import { readAuthJson, resolveApiBaseUrl } from "../lib/api-base-url.ts";

const baseUrl = "https://api.example.invalid";
const token = "A".repeat(43);
const cookie = `blousley_session=${token}`;

function fixture(fetcher, native = true) {
  let value = null;
  let writes = 0;
  const store = {
    async read() { return value; },
    async write(next) { value = next; writes++; },
    async clear() { value = null; },
  };
  return {
    client: createSessionApiClient({ baseUrl, native, store, fetcher }),
    store,
    value: () => value,
    writes: () => writes,
  };
}

function loginResponse() {
  return Response.json({ id: "test-account", role: "customer" }, {
    headers: { "Set-Cookie": `${cookie}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax` },
  });
}

test("native login persists only the issued cookie in the secure-store adapter, across client restarts", async () => {
  const calls = [];
  const f = fixture(async (url, init) => {
    calls.push({ url, init });
    return loginResponse();
  });
  const response = await f.client.request(`${baseUrl}/api/auth/login`, {
    method: "POST", body: JSON.stringify({ email: "test@example.invalid", password: "synthetic-test-only" }),
    headers: { Accept: "application/json" },
  });
  assert.deepEqual(await response.json(), { id: "test-account", role: "customer" });
  assert.deepEqual(JSON.parse(f.value()), { origin: baseUrl, token });
  assert.equal(f.writes(), 1);
  assert.equal(calls[0].init.headers.has("Cookie"), false);
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers.get("Accept"), "application/json");
  const restarted = createSessionApiClient({ baseUrl, native: true, store: f.store, fetcher: async (_url, init) => {
    assert.equal(init.headers.get("Cookie"), cookie);
    return Response.json({});
  } });
  await restarted.request(`${baseUrl}/api/ideas`);
  assert.equal(await restarted.cookieHeader(), cookie);
});

test("native login and registration both send credentials and request JSON", async () => {
  const requests = [];
  const f = fixture(async (_url, init) => {
    requests.push(init);
    return loginResponse();
  });
  for (const route of ["/api/auth/login", "/api/auth/register"]) {
    await f.client.request(`${baseUrl}${route}`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  }
  assert.equal(requests.length, 2);
  for (const init of requests) {
    assert.equal(init.credentials, "include");
    assert.equal(init.headers.get("Accept"), "application/json");
  }
});

test("all approved POST flows receive the same explicit session cookie and retain their bodies", async () => {
  const seen = [];
  const f = fixture(async (url, init) => {
    if (url.endsWith("/auth/login")) return loginResponse();
    seen.push(url);
    assert.equal(init.headers.get("Cookie"), cookie);
    assert.equal(init.headers.get("Content-Type"), "application/json");
    assert.equal(init.body, '{"unchanged":true}');
    assert.equal(init.credentials, "omit");
    return Response.json({});
  });
  await f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" });
  const routes = ["/api/generate-blouse-image/style", "/api/ideas", "/api/ideas/1/checkout", "/api/chat/conversations/1/fit-checkout"];
  for (const route of routes) {
    await f.client.request(`${baseUrl}${route}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: '{"unchanged":true}',
    });
  }
  assert.deepEqual(seen, routes.map((route) => `${baseUrl}${route}`));
});

test("native login fails explicitly when no readable session cookie is issued", async () => {
  const f = fixture(async () => Response.json({ id: "test-account" }));
  await assert.rejects(f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" }), /session cookie/);
  assert.equal(f.value(), null);
});

test("web keeps credentials include and never reads or writes native session storage", async () => {
  const f = fixture(async (_url, init) => {
    assert.equal(init.credentials, "include");
    assert.equal(init.headers.has("Cookie"), false);
    return Response.json({ id: "test-account" });
  }, false);
  f.store.read = async () => { throw new Error("Web must not read SecureStore"); };
  await f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" });
  await f.client.request(`${baseUrl}/api/ideas`);
  assert.equal(f.writes(), 0);
});

test("missing session sends no native cookie; a 401 clears an invalid stored session", async () => {
  let cookieSent;
  const f = fixture(async (url, init) => {
    if (url.endsWith("/auth/login")) return loginResponse();
    cookieSent = init.headers.get("Cookie");
    return Response.json({ error: "Authentication required" }, { status: 401 });
  });
  assert.equal((await f.client.request(`${baseUrl}/api/ideas`)).status, 401);
  assert.equal(cookieSent, null);
  await f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" });
  assert.equal((await f.client.request(`${baseUrl}/api/ideas`)).status, 401);
  assert.equal(cookieSent, cookie);
  assert.equal(f.value(), null);
});

test("native private fit-image requests use the authenticated API session", async () => {
  let sentRequest;
  const f = fixture(async (_url, init) => {
    sentRequest = init;
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  });
  await f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" });
  const response = await f.client.request(`${baseUrl}/api/images/fits/42`, {
    credentials: "include",
  });
  assert.equal(response.status, 200);
  assert.equal(sentRequest.headers.get("Cookie"), cookie);
  assert.equal(sentRequest.credentials, "omit");
});

test("logout revokes with the cookie and clears secure storage even when the network fails", async () => {
  for (const networkFails of [false, true]) {
    const f = fixture(async (url, init) => {
      if (url.endsWith("/auth/login")) return loginResponse();
      assert.equal(url, `${baseUrl}/api/auth/logout`);
      assert.equal(init.headers.get("Cookie"), cookie);
      if (networkFails) throw new Error("Network unavailable");
      return Response.json({ ok: true }, { headers: { "Set-Cookie": "blousley_session=; Max-Age=0; Path=/" } });
    });
    await f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" });
    if (networkFails) await assert.rejects(f.client.logout(), /Network unavailable/);
    else await f.client.logout();
    assert.equal(f.value(), null);
    assert.equal(await f.client.cookieHeader(), undefined);
  }
});

test("sessions cannot be sent to another API origin or restored from a different host", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return loginResponse(); });
  await f.client.request(`${baseUrl}/api/auth/login`, { method: "POST" });
  await assert.rejects(f.client.request("https://other.example.invalid/api/ideas"), /different host/);
  await assert.rejects(f.client.cookieHeader("https://other.example.invalid/api/chat/ws"), /different host/);
  assert.equal(calls, 1);
  const other = createSessionApiClient({ baseUrl: "https://other.example.invalid", native: true, store: f.store });
  assert.equal(await other.cookieHeader(), undefined);
  assert.equal(f.value(), null);
});

test("auth configuration requires an HTTPS API host and normalizes its origin", () => {
  assert.equal(resolveApiBaseUrl(" blousley.replit.app "), baseUrl.replace("api.example.invalid", "blousley.replit.app"));
  assert.throws(() => resolveApiBaseUrl(undefined), /host is missing/);
  assert.throws(() => resolveApiBaseUrl("http://blousley.replit.app"), /host is invalid/);
  assert.throws(() => resolveApiBaseUrl("https://blousley.replit.app/api"), /host is invalid/);
});

test("HTML or malformed auth responses show a clear server connection error", async () => {
  await assert.rejects(
    readAuthJson(new Response("<html>wrong host</html>", { headers: { "Content-Type": "text/html" } })),
    /Server connection error: API host returned an invalid response/,
  );
  await assert.rejects(
    readAuthJson(new Response("{", { headers: { "Content-Type": "application/json" } })),
    /Server connection error: API host returned an invalid response/,
  );
  assert.deepEqual(
    await readAuthJson(new Response('{"id":"test"}', { headers: { "Content-Type": "application/json; charset=utf-8" } })),
    { id: "test" },
  );
});
