// ডাটাবেস — Postgres (Vercel/Neon/যেকোনো Postgres)। টেস্টে PGlite (প্রক্রিয়ার ভেতরের Postgres)।
// দুটোই একই `query(sql, params)` ইন্টারফেস দেয়, তাই বাকি কোড একই থাকে।
import pg from 'pg';

const CONNECTION = process.env.POSTGRES_URL || process.env.DATABASE_URL;

async function createClient() {
  if (CONNECTION) {
    const pool = new pg.Pool({
      connectionString: CONNECTION,
      ssl: CONNECTION.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 3
    });
    return { query: async (sql, params) => (await pool.query(sql, params)).rows };
  }
  if (process.env.AMAL_TEST_DB === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const lite = new PGlite();
    return { query: async (sql, params) => (await lite.query(sql, params)).rows };
  }
  throw new Error('POSTGRES_URL সেট করা নেই');
}

const client = await createClient();
const q = (sql, params = []) => client.query(sql, params);

// ── স্কিমা ──────────────────────────────────────────────────────────────

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS day_record (date TEXT PRIMARY KEY, m INTEGER NOT NULL DEFAULT 0, e INTEGER NOT NULL DEFAULT 0, n INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS sadaqah (id SERIAL PRIMARY KEY, date TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS tasbeeh (date TEXT NOT NULL, key TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (date, key))`,
  `CREATE TABLE IF NOT EXISTS jumma_check (date TEXT NOT NULL, key TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (date, key))`,
  `CREATE TABLE IF NOT EXISTS jumma_day (date TEXT PRIMARY KEY, done INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS push_subscription (endpoint TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS push_log (key TEXT PRIMARY KEY, sent_at BIGINT NOT NULL)`
];

// প্রথমবার স্কিমা তৈরি — IF NOT EXISTS বলে প্রতি কোল্ড স্টার্টে নিরাপদ
for (const sql of SCHEMA) await q(sql);

// ── সেটিংস (JSON মান) ───────────────────────────────────────────────────

export async function getSetting(key, fallback = null) {
  const [row] = await q('SELECT value FROM settings WHERE key = $1', [key]);
  if (!row) return fallback;
  return JSON.parse(row.value) ?? fallback;
}

export async function setSetting(key, value) {
  await q(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)]
  );
}

// ── দিনের তিলাওয়াত ──────────────────────────────────────────────────────

// কলামের নাম এই নির্দিষ্ট তালিকা থেকে আসে — ইউজার ইনপুট থেকে নয়
const COLUMN = { MORNING: 'm', EVENING: 'e', NIGHT: 'n' };

export async function getDay(date) {
  const [r] = await q('SELECT m, e, n FROM day_record WHERE date = $1', [date]);
  return { m: r?.m === 1, e: r?.e === 1, n: r?.n === 1 };
}

export async function setSessionRead(date, sessionKey, value) {
  const col = COLUMN[sessionKey];
  await q(
    `INSERT INTO day_record (date, ${col}) VALUES ($1, $2)
     ON CONFLICT (date) DO UPDATE SET ${col} = EXCLUDED.${col}`,
    [date, value ? 1 : 0]
  );
}

export async function allDayCounts() {
  const rows = await q('SELECT date, m, e, n FROM day_record');
  const out = {};
  for (const r of rows) out[r.date] = r.m + r.e + r.n;
  return out;
}

export async function practicedDates() {
  const rows = await q('SELECT date FROM day_record WHERE m + e + n > 0');
  return new Set(rows.map((r) => r.date));
}

export async function countWhere(where) {
  const [r] = await q(`SELECT COUNT(*)::int AS c FROM day_record WHERE ${where}`);
  return r.c;
}

// ── সদকা ─────────────────────────────────────────────────────────────────

export async function addSadaqah(date, amount, note) {
  await q('INSERT INTO sadaqah (date, amount, note) VALUES ($1, $2, $3)', [date, amount, note]);
}

export async function deleteSadaqah(id) {
  await q('DELETE FROM sadaqah WHERE id = $1', [id]);
}

export async function sadaqahEntries(limit = 200) {
  return q('SELECT id, date, amount, note FROM sadaqah ORDER BY date DESC, id DESC LIMIT $1', [limit]);
}

export async function sadaqahMonthTotal(prefix) {
  const [r] = await q(
    'SELECT COALESCE(SUM(amount), 0)::int AS t FROM sadaqah WHERE date LIKE $1',
    [`${prefix}%`]
  );
  return r.t;
}

export async function sadaqahLifetime() {
  const [r] = await q('SELECT COALESCE(SUM(amount), 0)::int AS t FROM sadaqah');
  return r.t;
}

export async function sadaqahMonthsGiven() {
  const [r] = await q('SELECT COUNT(DISTINCT substr(date, 1, 7))::int AS c FROM sadaqah');
  return r.c;
}

// ── তাসবীহ ──────────────────────────────────────────────────────────────

export async function tasbeehCounts(date) {
  const rows = await q('SELECT key, count FROM tasbeeh WHERE date = $1', [date]);
  const out = {};
  for (const r of rows) out[r.key] = r.count;
  return out;
}

export async function setTasbeehCount(date, key, count) {
  await q(
    `INSERT INTO tasbeeh (date, key, count) VALUES ($1, $2, $3)
     ON CONFLICT (date, key) DO UPDATE SET count = EXCLUDED.count`,
    [date, key, count]
  );
}

// ── জুমা ────────────────────────────────────────────────────────────────

export async function jummaDone(date) {
  const [r] = await q('SELECT done FROM jumma_day WHERE date = $1', [date]);
  return r?.done === 1;
}

export async function setJummaDone(date, done) {
  await q(
    `INSERT INTO jumma_day (date, done) VALUES ($1, $2)
     ON CONFLICT (date) DO UPDATE SET done = EXCLUDED.done`,
    [date, done ? 1 : 0]
  );
}

export async function jummaChecks(date) {
  const rows = await q('SELECT key, done FROM jumma_check WHERE date = $1', [date]);
  const out = {};
  for (const r of rows) out[r.key] = r.done === 1;
  return out;
}

export async function setJummaCheck(date, key, done) {
  await q(
    `INSERT INTO jumma_check (date, key, done) VALUES ($1, $2, $3)
     ON CONFLICT (date, key) DO UPDATE SET done = EXCLUDED.done`,
    [date, key, done ? 1 : 0]
  );
}

// ── পুশ সাবস্ক্রিপশন ও রিমাইন্ডার লগ ───────────────────────────────────

export async function saveSubscription(endpoint, data) {
  await q(
    `INSERT INTO push_subscription (endpoint, data) VALUES ($1, $2)
     ON CONFLICT (endpoint) DO UPDATE SET data = EXCLUDED.data`,
    [endpoint, JSON.stringify(data)]
  );
}

export async function deleteSubscription(endpoint) {
  await q('DELETE FROM push_subscription WHERE endpoint = $1', [endpoint]);
}

export async function allSubscriptions() {
  const rows = await q('SELECT data FROM push_subscription');
  return rows.map((r) => JSON.parse(r.data));
}

/** কী আগে পাঠানো না হয়ে থাকলে true দেয় এবং চিহ্নিত করে। */
export async function claimReminder(key) {
  const rows = await q(
    'INSERT INTO push_log (key, sent_at) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING RETURNING key',
    [key, Date.now()]
  );
  // পাঁচ দিনের পুরোনো লগ মুছে ফেলা
  await q('DELETE FROM push_log WHERE sent_at < $1', [Date.now() - 5 * 86400000]);
  return rows.length > 0;
}
