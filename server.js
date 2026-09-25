import express from "express";
import pg from "pg";

// Light Cloud tells the app which port to listen on through PORT.
// 8080 is the fallback for running it on your own machine.
const PORT = Number(process.env.PORT) || 8080;

// DATABASE_URL comes from Light Cloud. It must end with
// ?sslmode=require&uselibpqcompat=true for the node-postgres driver.
// max: 3 keeps the pool small: every running instance opens its own.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// One JSON object per line. The Logs tab reads "severity" for the level.
function log(severity, message, fields = {}) {
  console.log(JSON.stringify({ severity, message, ...fields }));
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    const severity = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARNING" : "INFO";
    log(severity, "request", { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started });
  });
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "Notes API", routes: ["GET /notes", "POST /notes", "GET /health"] });
});

app.get("/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch (err) {
    next(err);
  }
});

app.get("/notes", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT 50");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/notes", async (req, res, next) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 500) {
    return res.status(400).json({ error: "Send {\"text\": \"...\"} with 1 to 500 characters." });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO notes (text) VALUES ($1) RETURNING id, text, created_at",
      [text]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  log("ERROR", err.message, { path: req.path });
  res.status(500).json({ error: "Something went wrong" });
});

// Create the table on start. A real project would use migrations.
await pool.query(`
  CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`).catch((err) => log("ERROR", `database not ready: ${err.message}`));

const server = app.listen(PORT, () => {
  log("INFO", `listening on port ${PORT}`);
});

// Light Cloud stops old instances with SIGTERM after a new version is live.
// Finish the requests in flight, then exit.
process.on("SIGTERM", () => {
  log("INFO", "SIGTERM received, shutting down");
  server.close(() => pool.end().then(() => process.exit(0)));
});
