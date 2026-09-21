import type { NextFunction, Request, RequestHandler, Response } from "express";

type Bucket = { startedAt: number; count: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: Request, scope: "ip" | "user") {
  if (scope === "ip") return `ip:${req.ip || "unknown"}`;
  const userId = req.body?.userId ?? req.query?.userId ?? req.query?.tailorId;
  return typeof userId === "string" ? `user:${userId}` : `ip:${req.ip || "unknown"}`;
}

export function rateLimit(
  windowMs: number,
  max: number,
  prefix: string,
  scope: "ip" | "user" = "ip",
  methods?: string[],
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (methods && !methods.includes(req.method)) {
      next();
      return;
    }
    const now = Date.now();
    const key = `${prefix}:${clientKey(req, scope)}`;
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      next();
      return;
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((windowMs - (now - bucket.startedAt)) / 1000));
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
  );
  if (req.secure || req.header("x-forwarded-proto") === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export function requireHttps(req: Request, res: Response, next: NextFunction) {
  // The publisher probes the internal health endpoint over plain HTTP before
  // TLS is terminated at the edge. Redirecting this request makes the probe
  // follow HTTPS back to the internal HTTP router and fail readiness.
  if (req.path === "/api/healthz" || req.path === "/healthz") {
    next();
    return;
  }
  if (process.env.NODE_ENV === "production" && !req.secure && req.header("x-forwarded-proto") !== "https") {
    res.redirect(`https://${req.get("host")}${req.originalUrl}`);
    return;
  }
  next();
}