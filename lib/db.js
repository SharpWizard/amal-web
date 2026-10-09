// ডাটাবেস — Node-এর বিল্ট-ইন SQLite (node:sqlite), আলাদা কোনো native প্যাকেজ লাগে না।
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.AMAL_DATA_DIR || path.join(here, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'amal.db'));

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- একদিনের তিলাওয়াত রেকর্ড (m = সকাল, e = সন্ধ্যা, n = রাত)
CREATE TABLE IF NOT EXISTS day_record (
  date TEXT PRIMARY KEY,
  m INTEGER NOT NULL DEFAULT 0,
  e INTEGER NOT NULL DEFAULT 0,
  n INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sadaqah (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  date   TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasbeeh (
  date  TEXT NOT NULL,
  key   TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, key)
);

CREATE TABLE IF NOT EXISTS jumma_check (
  date TEXT NOT NULL,
  key  TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, key)
);

CREATE TABLE IF NOT EXISTS jumma_day (
  date TEXT PRIMARY KEY,
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS push_subscription (
  endpoint TEXT PRIMARY KEY,
  data     TEXT NOT NULL
);

-- একই রিমাইন্ডার যেন দুবার না যায়
CREATE TABLE IF NOT EXISTS push_log (
  key     TEXT PRIMARY KEY,
  sent_at INTEGER NOT NULL
);
`);

const stmt = (sql) => db.prepare(sql);

// ── সেটিংস (JSON মান) ───────────────────────────────────────────────────

const getSettingStmt = stmt('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = stmt(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

export function getSetting(key, fallback = null) {
  const row = getSettingStmt.get(key);
  if (!row) return fallback;
  return JSON.parse(row.value) ?? fallback;
}

export function setSetting(key, value) {
  setSettingStmt.run(key, JSON.stringify(value));
}

// ── দিনের তিলাওয়াত ──────────────────────────────────────────────────────

const COLUMN = { MORNING: 'm', EVENING: 'e', NIGHT: 'n' };
const getDayStmt = stmt('SELECT m, e, n FROM day_record WHERE date = ?');
const upsertDayStmt = {
  m: stmt(`INSERT INTO day_record (date, m) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET m = excluded.m`),
  e: stmt(`INSERT INTO day_record (date, e) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET e = excluded.e`),
  n: stmt(`INSERT INTO day_record (date, n) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET n = excluded.n`)
};

export function getDay(date) {
  const r = getDayStmt.get(date);
  return { m: !!r?.m, e: !!r?.e, n: !!r?.n };
}

export function setSessionRead(date, sessionKey, value) {
  upsertDayStmt[COLUMN[sessionKey]].run(date, value ? 1 : 0);
}

export function allDayCounts() {
  const rows = stmt('SELECT date, m, e, n FROM day_record').all();
  const out = {};
  for (const r of rows) out[r.date] = r.m + r.e + r.n;
  return out;
}

export function practicedDates() {
  return new Set(
    stmt('SELECT date FROM day_record WHERE m + e + n > 0').all().map((r) => r.date)
  );
}

export function countWhere(where) {
  return stmt(`SELECT COUNT(*) AS c FROM day_record WHERE ${where}`).get().c;
}

// ── সদকা ─────────────────────────────────────────────────────────────────

export function addSadaqah(date, amount, note) {
  return stmt('INSERT INTO sadaqah (date, amount, note) VALUES (?, ?, ?)')
    .run(date, amount, note).lastInsertRowid;
}

export function deleteSadaqah(id) {
  stmt('DELETE FROM sadaqah WHERE id = ?').run(id);
}

export function sadaqahEntries(limit = 200) {
  return stmt('SELECT id, date, amount, note FROM sadaqah ORDER BY date DESC, id DESC LIMIT ?')
    .all(limit);
}

export function sadaqahMonthTotal(prefix) {
  return stmt("SELECT COALESCE(SUM(amount), 0) AS t FROM sadaqah WHERE date LIKE ?")
    .get(`${prefix}%`).t;
}

export function sadaqahLifetime() {
  return stmt('SELECT COALESCE(SUM(amount), 0) AS t FROM sadaqah').get().t;
}

export function sadaqahMonthsGiven() {
  return stmt('SELECT COUNT(DISTINCT substr(date, 1, 7)) AS c FROM sadaqah').get().c;
}

// ── তাসবীহ ──────────────────────────────────────────────────────────────

export function tasbeehCounts(date) {
  const out = {};
  for (const r of stmt('SELECT key, count FROM tasbeeh WHERE date = ?').all(date)) {
    out[r.key] = r.count;
  }
  return out;
}

export function setTasbeehCount(date, key, count) {
  stmt(
    `INSERT INTO tasbeeh (date, key, count) VALUES (?, ?, ?)
     ON CONFLICT(date, key) DO UPDATE SET count = excluded.count`
  ).run(date, key, count);
}

// ── জুমা ────────────────────────────────────────────────────────────────

export function jummaDone(date) {
  return !!stmt('SELECT done FROM jumma_day WHERE date = ?').get(date)?.done;
}

export function setJummaDone(date, done) {
  stmt(
    `INSERT INTO jumma_day (date, done) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET done = excluded.done`
  ).run(date, done ? 1 : 0);
}

export function jummaChecks(date) {
  const out = {};
  for (const r of stmt('SELECT key, done FROM jumma_check WHERE date = ?').all(date)) {
    out[r.key] = !!r.done;
  }
  return out;
}

export function setJummaCheck(date, key, done) {
  stmt(
    `INSERT INTO jumma_check (date, key, done) VALUES (?, ?, ?)
     ON CONFLICT(date, key) DO UPDATE SET done = excluded.done`
  ).run(date, key, done ? 1 : 0);
}

// ── পুশ সাবস্ক্রিপশন ও রিমাইন্ডার লগ ───────────────────────────────────

export function saveSubscription(endpoint, data) {
  stmt(
    `INSERT INTO push_subscription (endpoint, data) VALUES (?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET data = excluded.data`
  ).run(endpoint, JSON.stringify(data));
}

export function deleteSubscription(endpoint) {
  stmt('DELETE FROM push_subscription WHERE endpoint = ?').run(endpoint);
}

export function allSubscriptions() {
  return stmt('SELECT endpoint, data FROM push_subscription').all()
    .map((r) => JSON.parse(r.data));
}

/** কী আগে পাঠানো না হয়ে থাকলে true দেয় এবং চিহ্নিত করে। */
export function claimReminder(key) {
  const res = stmt('INSERT OR IGNORE INTO push_log (key, sent_at) VALUES (?, ?)')
    .run(key, Date.now());
  if (Math.random() < 0.01) {
    // পুরোনো লগ পরিষ্কার — পাঁচ দিনের বেশি পুরোনো
    stmt('DELETE FROM push_log WHERE sent_at < ?').run(Date.now() - 5 * 86400000);
  }
  return res.changes > 0;
}
