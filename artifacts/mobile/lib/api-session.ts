export interface SessionStore {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
}

const SESSION_COOKIE = "blousley_session";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,}$/;

function sessionTokenFromResponse(response: Response): string | null {
  const header = response.headers.get("set-cookie");
  return header?.match(/(?:^|[,;\s])blousley_session=([A-Za-z0-9_-]{40,})(?=;|,|\s|$)/)?.[1] ?? null;
}

/**
 * Native requests use one origin-bound, securely stored session instead of
 * depending on the Android cookie jar. Web requests keep HttpOnly browser cookies.
 */
export function createSessionApiClient({
  baseUrl,
  native,
  store,
  fetcher = globalThis.fetch,
}: {
  baseUrl: string;
  native: boolean;
  store: SessionStore;
  fetcher?: typeof fetch;
}) {
  const base = baseUrl.replace(/\/+$/, "");

  function apiUrl(input: RequestInfo | URL): URL {
    if (!base) throw new Error("The API host is not configured.");
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== new URL(base).origin || !url.pathname.startsWith("/api/")) {
      throw new Error("Refusing to send an API session to a different host.");
    }
    return url;
  }

  async function readToken(): Promise<string | null> {
    if (!native) return null;
    const raw = await store.read();
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      if (value.origin === new URL(base).origin && typeof value.token === "string" && TOKEN_PATTERN.test(value.token)) {
        return value.token;
      }
    } catch {
      // Invalid secure-storage data must never become a Cookie header.
    }
    await store.clear();
    return null;
  }

  async function cookieHeader(forUrl?: string): Promise<string | undefined> {
    if (forUrl) apiUrl(forUrl);
    const token = await readToken();
    return token ? `${SESSION_COOKIE}=${token}` : undefined;
  }

  const request: typeof fetch = async (input, init = {}) => {
    const url = apiUrl(input);
    const method = (init.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    const signingIn = method === "POST" && /^\/api\/auth\/(?:login|register)\/?$/.test(url.pathname);
    const headers = new Headers(typeof input === "object" && "headers" in input ? input.headers : undefined);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    const token = native && !signingIn ? await readToken() : null;
    if (native) {
      headers.delete("Cookie");
      if (token) headers.set("Cookie", `${SESSION_COOKIE}=${token}`);
    }

    const response = await fetcher(input, {
      ...init,
      headers,
      // Android's automatic cookie jar can override an explicit Cookie header.
      // Disable it on native; the browser still owns its HttpOnly cookie.
      credentials: native ? "omit" : "include",
    });

    if (native && signingIn && response.ok) {
      const issuedToken = sessionTokenFromResponse(response);
      if (!issuedToken) {
        await store.clear();
        throw new Error("Sign-in did not return a session cookie that could be saved securely. Please try again.");
      }
      await store.write(JSON.stringify({ origin: url.origin, token: issuedToken }));
    } else if (native && response.status === 401 && token && await readToken() === token) {
      await store.clear();
    }
    return response;
  };

  async function logout(): Promise<void> {
    try {
      const response = await request(`${base}/api/auth/logout`, { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error("Could not sign out of the API.");
    } finally {
      await store.clear();
    }
  }

  return { request, cookieHeader, logout, clear: () => store.clear() };
}
