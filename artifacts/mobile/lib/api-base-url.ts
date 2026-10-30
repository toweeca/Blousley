export function resolveApiBaseUrl(configured: string | undefined): string {
  const value = configured?.trim();
  if (!value) {
    throw new Error("Server configuration error: API host is missing from this build.");
  }

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new Error("Server configuration error: API host is invalid.");
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Server configuration error: API host is invalid.");
  }
  return parsed.origin;
}

export async function readAuthJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    throw new Error("Server configuration error: API host is incorrect.");
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error("Server configuration error: API host returned invalid JSON.");
  }
}
