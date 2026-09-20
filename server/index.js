import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import "dotenv/config";
import { readFileSync } from "fs";
import { redis } from "./redis.js";

console.log("[START] index.js - start");

// === Firebase Admin init ===
let serviceAccount;
try {
  serviceAccount = JSON.parse(
    readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
  );
  console.log("[START] serviceAccountKey.json read, project:", serviceAccount.project_id);
} catch (e) {
  console.error("[START] Cannot read serviceAccountKey.json:", e.message);
  process.exit(1);
}

try {
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log("[START] Firebase Admin initialized");
} catch (e) {
  console.error("[START] Firebase Admin error:", e.message);
  process.exit(1);
}

// === Express ===
const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
console.log("[START] Express configured");

// === Middleware: Firebase ID token check ===
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    console.log("[auth] Called:", req.method, req.path);

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      console.log("[auth] No token");
      return res.status(401).json({ error: "No token provided" });
    }

    console.log("[auth] Token length:", token.length);

    const decoded = await getAuth().verifyIdToken(token);
    console.log("[auth] Token OK, uid:", decoded.uid);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[auth] ERROR code:", err.code, "| message:", err.message);
    res.status(401).json({
      error: "Invalid token",
      code: err.code,
      message: err.message,
    });
  }
}

// === Health check ===
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// === Presence: user online ===
app.post("/api/presence/online", authMiddleware, async (req, res) => {
  try {
    const { uid, name, picture } = req.user;
    const payload = JSON.stringify({
      uid,
      name: name || req.user.email || "Kasutaja",
      photo: picture || "",
      lastSeen: Date.now(),
    });

    await redis.setex(`online:${uid}`, 60, payload);
    res.json({ ok: true });
  } catch (err) {
    console.error("Presence online error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Presence: heartbeat ===
app.post("/api/presence/heartbeat", authMiddleware, async (req, res) => {
  try {
    await redis.expire(`online:${req.user.uid}`, 60);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Presence: online list ===
app.get("/api/presence/online", authMiddleware, async (req, res) => {
  try {
    const keys = await redis.keys("online:*");
    if (keys.length === 0) {
      return res.json({ users: [], count: 0 });
    }

    const values = await redis.mget(...keys);
    const users = values
      .filter(Boolean)
      .map((v) => JSON.parse(v))
      .sort((a, b) => b.lastSeen - a.lastSeen);

    res.json({ users, count: users.length });
  } catch (err) {
    console.error("Presence list error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Presence: offline ===
app.post("/api/presence/offline", authMiddleware, async (req, res) => {
  try {
    await redis.del(`online:${req.user.uid}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Rate limit ===
app.post("/api/messages/rate-check", authMiddleware, async (req, res) => {
  try {
    const key = `rate:${req.user.uid}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 10);
    }

    const limit = 20;
    if (count > limit) {
      return res.status(429).json({ error: "Liiga palju sonumeid. Palun oota." });
    }

    res.json({ ok: true, count, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Start ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});