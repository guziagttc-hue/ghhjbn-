import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("videos.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    youtube_id TEXT NOT NULL,
    instructor TEXT DEFAULT 'মো: মশিফুকর রহমান',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/videos", (req, res) => {
    const videos = db.prepare("SELECT * FROM videos ORDER BY created_at DESC").all();
    res.json(videos);
  });

  app.post("/api/videos", (req, res) => {
    const { title, category, youtube_id } = req.body;
    if (!title || !category || !youtube_id) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const info = db.prepare("INSERT INTO videos (title, category, youtube_id) VALUES (?, ?, ?)").run(title, category, youtube_id);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
