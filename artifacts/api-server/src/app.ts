// Copyright © 2026 Blousify. All rights reserved.
import express, { type Express } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
// Base64-encoded photos can be several MB, so raise the body size limit
// well above Express's 100kb default to avoid PayloadTooLargeError.
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", router);

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
