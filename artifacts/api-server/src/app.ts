import express, { type Express } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/diag", (_req, res) => {
  const p = path.join(process.cwd(), "../../artifacts/mobile/public/diag.html");
  if (fs.existsSync(p)) {
    res.setHeader("Content-Type", "text/html");
    res.send(fs.readFileSync(p, "utf-8"));
  } else {
    res.status(404).send("diag.html not found at " + p);
  }
});

export default app;
