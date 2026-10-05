import type { Express } from "express";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Anonymous aggregate analytics.
 *
 * IMPORTANT: This intentionally does NOT use a database. Only aggregate
 * counters are persisted to a small JSON file on the server. No IP address,
 * name, email, phone, photo, user profile or request details are stored.
 */
type Stats = {
  scans: number;
  visits: number;
  starts: number;
  bounces: number;
  greetings: number;
  qrGreetings: number;
  since: string;
  updatedAt: string;
};

const dataDir = path.resolve(process.cwd(), "server", "data");
const statsFile = path.join(dataDir, "analytics.json");

const defaultStats = (): Stats => ({
  scans: 0,
  visits: 0,
  starts: 0,
  bounces: 0,
  greetings: 0,
  qrGreetings: 0,
  since: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function loadStats(): Stats {
  try {
    if (!fs.existsSync(statsFile)) return defaultStats();
    const parsed = JSON.parse(fs.readFileSync(statsFile, "utf8"));
    return { ...defaultStats(), ...parsed };
  } catch (error) {
    console.error("Could not read analytics file; starting with empty counters.", error);
    return defaultStats();
  }
}

let stats = loadStats();

// Single-admin authentication. Credentials live only on the server in .env.
const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminTokens = new Set<string>();
if (!adminPassword) console.warn("ADMIN_PASSWORD is not configured; admin login is disabled until .env is set.");

function cookieToken(req: any) {
  const raw = req.headers?.cookie || "";
  const match = raw.split(";").map((v: string) => v.trim()).find((v: string) => v.startsWith("qrm_admin="));
  return match ? decodeURIComponent(match.slice("qrm_admin=".length)) : "";
}

function requireAdmin(req: any, res: any, next: any) {
  const token = cookieToken(req);
  if (!token || !adminTokens.has(token)) return res.status(401).json({ message: "Admin login required" });
  next();
}

function saveStats() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    stats.updatedAt = new Date().toISOString();
    const tempFile = `${statsFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(stats, null, 2), "utf8");
    fs.renameSync(tempFile, statsFile);
  } catch (error) {
    // Analytics must never be allowed to break the public greeting flow.
    console.error("Could not persist analytics counters.", error);
  }
}

function increment(event: string) {
  if (event === "visit") stats.visits++;
  if (event === "start") stats.starts++;
  if (event === "bounce") stats.bounces++;
  if (event === "greeting") stats.greetings++;
  if (event === "qrGreeting") stats.qrGreetings++;
  saveStats();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  /**
   * DYNAMIC QR ENDPOINT
   * The printed QR points to /go. Every request increments the anonymous scan counter,
   * then redirects to QR_TARGET. No request details are saved.
   */
  app.get("/go", (_req, res) => {
    stats.scans++;
    saveStats();

    const target = process.env.QR_TARGET || "/#/";
    const hashIndex = target.indexOf("#");
    const beforeHash = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    const hash = hashIndex >= 0 ? target.slice(hashIndex) : "";
    const join = beforeHash.includes("?") ? "&" : "?";
    const markedTarget = `${beforeHash}${join}qr=1${hash}`;
    res.redirect(302, markedTarget);
  });

  app.post("/api/admin/login", (req, res) => {
    if (!adminPassword) return res.status(503).json({ message: "Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env." });
    const username = String(req.body?.username || "");
    const password = String(req.body?.password || "");
    if (username !== adminUsername || password !== adminPassword) return res.status(401).json({ message: "Invalid admin credentials" });
    const token = crypto.randomBytes(32).toString("hex");
    adminTokens.add(token);
    res.setHeader("Set-Cookie", `qrm_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
    res.json({ ok: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    const token = cookieToken(req);
    if (token) adminTokens.delete(token);
    res.setHeader("Set-Cookie", "qrm_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    res.json({ ok: true });
  });

  app.get("/api/admin/me", requireAdmin, (_req, res) => res.json({ ok: true, username: adminUsername }));

  // Anonymous aggregate analytics: event name only.
  app.post("/api/track", (req, res) => {
    const event = req.body?.event;
    const allowed = new Set(["visit", "start", "bounce", "greeting", "qrGreeting"]);
    if (typeof event === "string" && allowed.has(event)) increment(event);
    res.json({ ok: true });
  });

  app.get("/api/stats", requireAdmin, (_req, res) => {
    res.json({
      ...stats,
      qrTarget: process.env.QR_TARGET || "/#/",
      publicUrl: process.env.PUBLIC_URL || "",
    });
  });

  return httpServer;
}
