import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const distDir = join(__dirname, "dist");

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.use(express.static(distDir));

app.get("*", (_req, res) => {
  res.sendFile(join(distDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FloX frontend serving on port ${PORT}`);
});
