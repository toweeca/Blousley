import type { RequestHandler } from "express";

function diagnosticRoute(path: string): string | null {
  if (/^\/api\/generate-blouse-image\/style\/?$/.test(path)) return "/api/generate-blouse-image/style";
  if (/^\/api\/ideas\/?$/.test(path)) return "/api/ideas";
  if (/^\/api\/ideas\/\d+\/checkout\/?$/.test(path)) return "/api/ideas/:id/checkout";
  if (/^\/api\/chat\/conversations\/\d+\/fit-checkout\/?$/.test(path)) return "/api/chat/conversations/:id/fit-checkout";
  return null;
}

/** Temporary workspace-only diagnostics. Never record headers or response bodies. */
export function authDiagnostics(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    const route = req.method === "POST" ? diagnosticRoute(req.path) : null;
    if (!enabled || !route) {
      next();
      return;
    }
    const cookieHeaderReceived = typeof req.headers.cookie === "string" && req.headers.cookie.length > 0;
    const sessionCookiePresent = typeof req.cookies?.blousley_session === "string"
      && req.cookies.blousley_session.length > 0;
    res.once("finish", () => {
      const status = res.statusCode;
      const errorReason = status === 401 ? "authentication_required"
        : status === 403 ? "access_denied"
        : status === 400 ? "invalid_request"
        : status === 404 ? "not_found"
        : status === 409 ? "request_state_conflict"
        : status === 429 ? "rate_limited"
        : status >= 500 ? "server_or_provider_error"
        : status >= 400 ? "request_rejected"
        : null;
      console.info("auth_request_diagnostic", JSON.stringify({
        route, status, cookieHeaderReceived, sessionCookiePresent,
        sessionAuthenticated: Boolean(req.userId), errorReason,
      }));
    });
    next();
  };
}
