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

export function resolvePrivateFitImageUrl(baseUrl: string, fitId: number, userId?: string): string {
  if (!Number.isSafeInteger(fitId) || fitId <= 0) throw new Error("Invalid fit image ID.");
  const url = new URL(`/api/images/fits/${fitId}`, resolveApiBaseUrl(baseUrl));
  if (userId) url.searchParams.set("userId", userId);
  return url.href;
}

export async function readApiJson<T>(
  response: Response,
  invalidResponseMessage = "Server connection error: API host returned an invalid response",
): Promise<T> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    throw new Error(invalidResponseMessage);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(invalidResponseMessage);
  }
}

export const readAuthJson = readApiJson;
