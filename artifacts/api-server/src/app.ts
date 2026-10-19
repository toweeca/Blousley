// Copyright © 2026 Blousley. All rights reserved.
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import router from "./routes";
import { rateLimit, requireHttps, securityHeaders } from "./lib/security";
import { processStripeWebhook } from "./webhookHandlers";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requireHttps);
app.use(securityHeaders);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("stripe-signature");
  if (!signature || !Buffer.isBuffer(req.body)) {
    res.status(400).send("Invalid webhook");
    return;
  }
  try {
    await processStripeWebhook(req.body, signature);
    res.sendStatus(200);
  } catch {
    res.status(400).send("Webhook verification failed");
  }
});
app.get("/api/ideas/checkout/success", (_req, res) => {
  res.type("html").send("<!doctype html><meta name=\"viewport\" content=\"width=device-width\"><title>Payment submitted</title><p>Payment submitted. Return to Blousley; your request or conversation will update when payment is confirmed.</p>");
});
app.get("/api/ideas/checkout/cancel", (_req, res) => {
  res.type("html").send("<!doctype html><meta name=\"viewport\" content=\"width=device-width\"><title>Checkout cancelled</title><p>Checkout was cancelled. Return to Blousley and try again when you are ready.</p>");
});
// 5 MB binary images expand to about 6.7 MB as base64.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/blouse/fits", rateLimit(60 * 60 * 1000, 20, "upload", "ip", ["POST"]));
app.use("/api/blouse/fits", rateLimit(60 * 60 * 1000, 20, "upload-user", "user", ["POST"]));
app.use("/api/tailor/fits", rateLimit(60 * 60 * 1000, 20, "upload", "ip", ["POST"]));
app.use("/api/tailor/fits", rateLimit(60 * 60 * 1000, 20, "upload-user", "user", ["POST"]));
app.use("/api/blouse/analyze", rateLimit(60 * 60 * 1000, 15, "analyze"));
app.use("/api/generate-blouse-image", rateLimit(60 * 60 * 1000, 20, "generation"));
app.use("/api/users", rateLimit(15 * 60 * 1000, 20, "identity"));
app.use("/api/auth", rateLimit(15 * 60 * 1000, 10, "auth"));
app.use("/api", rateLimit(60_000, 120, "api"), router);

app.get("/api/diag", (_req, res) => {
  const p = path.join(process.cwd(), "../../artifacts/mobile/public/diag.html");
  if (fs.existsSync(p)) {
    res.setHeader("Content-Type", "text/html");
    res.send(fs.readFileSync(p, "utf-8"));
  } else {
    res.status(404).send("diag.html not found at " + p);
  }
});

app.get("/api/proof", (_req, res) => {
  const p = path.join(process.cwd(), "../../artifacts/mobile/public/proof.html");
  if (fs.existsSync(p)) { res.setHeader("Content-Type", "text/html"); res.send(fs.readFileSync(p, "utf-8")); }
  else res.status(404).send("not found");
});

app.get("/api/diag-capture", (_req, res) => {
  const p = path.join(process.cwd(), "../../artifacts/mobile/public/diag_capture.html");
  if (fs.existsSync(p)) { res.setHeader("Content-Type", "text/html"); res.send(fs.readFileSync(p, "utf-8")); }
  else res.status(404).send("not found at " + p);
});

app.get("/api/diag3d", (_req, res) => {
  const p = path.join(process.cwd(), "../../artifacts/mobile/public/diag3d.html");
  if (fs.existsSync(p)) {
    res.setHeader("Content-Type", "text/html");
    res.send(fs.readFileSync(p, "utf-8"));
  } else {
    res.status(404).send("diag3d.html not found at " + p);
  }
});

app.get("/api/diag-grid", (_req, res) => {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:100%; height:100%; background:#111; }
.grid { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; width:100%; height:100%; gap:4px; padding:4px; }
.cell { position:relative; }
.cell label { position:absolute; top:4px; left:50%; transform:translateX(-50%); z-index:9; color:#C9A96E; font:bold 11px monospace; background:rgba(0,0,0,0.7); padding:2px 8px; border-radius:4px; white-space:nowrap; }
iframe { width:100%; height:100%; border:none; }
</style></head><body>
<div class="grid">
  <div class="cell"><label>SOLID COLOR — both meshes</label><iframe src="/api/diag3d?mode=solid"></iframe></div>
  <div class="cell"><label>FRONT MESH ONLY — SVG texture</label><iframe src="/api/diag3d?mode=frontOnly"></iframe></div>
  <div class="cell"><label>BACK MESH ONLY — SVG texture</label><iframe src="/api/diag3d?mode=backOnly"></iframe></div>
  <div class="cell"><label>BACK VISIBLE (red) through front</label><iframe src="/api/diag3d?mode=backThrough"></iframe></div>
</div>
</body></html>`;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default app;
