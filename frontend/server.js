import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distDir = join(__dirname, "dist");

// Serve static files from the dist directory
app.use(express.static(distDir));

// SPA fallback — serve index.html for any unmatched route so that
// client-side routing (React Router) works correctly
app.get("*", (_req, res) => {
  res.sendFile(join(distDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FloX frontend serving on http://0.0.0.0:${PORT}`);
});
