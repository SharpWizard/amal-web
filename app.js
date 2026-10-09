// আমল — Express অ্যাপ (লোকালি server.js থেকে, Vercel-এ api/index.js থেকে চলে)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './lib/db.js';
import * as L from './lib/logic.js';
import * as push from './lib/push.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
// Express 5 leaves req.body undefined when a request has no body
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

// ক্লায়েন্টের টাইমজোন — সব "আজ" ও সময়ের হিসাব এই জোনে হয়।
app.use('/api', async (req, res, next) => {
  try {
    const tz = req.get('X-TZ');
    if (tz && L.isValidTz(tz) && tz !== (await L.getTz())) await store.setSetting('tz', tz);
    next();
  } catch (err) {
    next(err);
  }
});

const today = async () => L.zonedParts(await L.getTz());
const isoRe = /^\d{4}-\d{2}-\d{2}$/;
const sessionKeys = L.SESSIONS.map((s) => s.key);
const toInt = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

// ── আজ ─────────────────────────────────────────────────────────────────

app.get('/api/today', async (req, res) => {
  res.json(await L.buildToday());
});

app.post('/api/sessions/:key', async (req, res) => {
  const { key } = req.params;
  if (!sessionKeys.includes(key)) return res.status(400).json({ error: 'bad session' });
  if (typeof req.body.read !== 'boolean') return res.status(400).json({ error: 'read must be boolean' });
  await store.setSessionRead((await today()).iso, key, req.body.read);
  res.json(await L.buildToday());
});

app.put('/api/sessions/:key/time', async (req, res) => {
  const { key } = req.params;
  if (!sessionKeys.includes(key)) return res.status(400).json({ error: 'bad session' });
  const hour = toInt(req.body.hour, 0, 23);
  const minute = toInt(req.body.minute, 0, 59);
  if (hour === null || minute === null) return res.status(400).json({ error: 'bad time' });
  await store.setSetting(`time_${key}`, { hour, minute });
  res.json(await L.buildToday());
});

app.post('/api/last-read', async (req, res) => {
  const id = toInt(req.body.surahId, 1, 9999);
  if (id === null) return res.status(400).json({ error: 'bad surah' });
  await store.setSetting('last_read', id);
  res.json({ ok: true });
});

// ── জুমা ───────────────────────────────────────────────────────────────

app.post('/api/jumma/done', async (req, res) => {
  if (typeof req.body.done !== 'boolean') return res.status(400).json({ error: 'done must be boolean' });
  await store.setJummaDone((await today()).iso, req.body.done);
  res.json(await L.buildToday());
});

app.post('/api/jumma/check', async (req, res) => {
  const { key, done } = req.body;
  if (!L.JUMMA_TASKS.some((t) => t.key === key)) return res.status(400).json({ error: 'bad item' });
  await store.setJummaCheck((await today()).iso, key, !!done);
  res.json(await L.buildToday());
});

// ── সেটিংস ─────────────────────────────────────────────────────────────

app.get('/api/settings', async (req, res) => {
  const times = await L.loadSessionTimes();
  res.json({
    ...(await L.getReminderSettings()),
    tz: await L.getTz(),
    sessions: L.SESSIONS.map((s) => ({ key: s.key, ...times[s.key] }))
  });
});

app.patch('/api/settings', async (req, res) => {
  const b = req.body;
  if (b.nagMinutes !== undefined && !L.NAG_OPTIONS.includes(b.nagMinutes)) {
    return res.status(400).json({ error: 'bad nag' });
  }
  const bools = { enabled: 'reminders_enabled', forceAlert: 'force_alert', voice: 'voice', askOnOpen: 'ask_on_open', sadaqahReminder: 'sadaqah_reminder' };
  for (const [field, key] of Object.entries(bools)) {
    if (typeof b[field] === 'boolean') await store.setSetting(key, b[field]);
  }
  if (b.nagMinutes !== undefined) await store.setSetting('nag_minutes', b.nagMinutes);
  if (b.jumma) {
    if (typeof b.jumma.enabled === 'boolean') await store.setSetting('jumma_enabled', b.jumma.enabled);
    const hour = toInt(b.jumma.hour, 0, 23);
    const minute = toInt(b.jumma.minute, 0, 59);
    if (hour !== null && minute !== null) {
      await store.setSetting('jumma_hour', hour);
      await store.setSetting('jumma_minute', minute);
    }
  }
  res.json(await L.getReminderSettings());
});

// ── সদকা ───────────────────────────────────────────────────────────────

async function sadaqahView() {
  const z = await today();
  const settings = await L.getReminderSettings();
  const cal = [];
  let [y, m] = [z.y, z.mo];
  for (let i = 0; i < 6; i++) {
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    cal.push({ prefix, label: L.bnMonth(m - 1), year: L.bn(y), total: await store.sadaqahMonthTotal(prefix) });
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return {
    target: settings.sadaqahTarget,
    reminder: settings.sadaqahReminder,
    monthTotal: await store.sadaqahMonthTotal(z.iso.slice(0, 7)),
    lifetime: await store.sadaqahLifetime(),
    monthsGiven: await store.sadaqahMonthsGiven(),
    lastMonths: cal,
    entries: await store.sadaqahEntries(),
    quickAmounts: L.QUICK_AMOUNTS,
    targetOptions: L.SADAQAH_TARGET_OPTIONS
  };
}

app.get('/api/sadaqah', async (req, res) => res.json(await sadaqahView()));

app.post('/api/sadaqah', async (req, res) => {
  const amount = toInt(req.body.amount, 1, 100_000_000);
  if (amount === null) return res.status(400).json({ error: 'bad amount' });
  const note = String(req.body.note ?? '').slice(0, 200);
  const date = isoRe.test(req.body.date ?? '') ? req.body.date : (await today()).iso;
  await store.addSadaqah(date, amount, note);
  res.json(await sadaqahView());
});

app.delete('/api/sadaqah/:id', async (req, res) => {
  const id = toInt(req.params.id, 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return res.status(400).json({ error: 'bad id' });
  await store.deleteSadaqah(id);
  res.json(await sadaqahView());
});

app.put('/api/sadaqah/target', async (req, res) => {
  const t = toInt(req.body.target, 0, 100_000_000);
  if (t === null) return res.status(400).json({ error: 'bad target' });
  await store.setSetting('sadaqah_target', t);
  res.json(await sadaqahView());
});

// ── তাসবীহ / জিকির ──────────────────────────────────────────────────────

async function tasbeehView() {
  const counts = await store.tasbeehCounts((await today()).iso);
  const todayTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    dhikr: L.DHIKR.map((d) => ({ ...d, count: counts[d.key] ?? 0 })),
    todayTotal,
    lifetime: await store.getSetting('tasbeeh_total', 0)
  };
}

app.get('/api/tasbeeh', async (req, res) => res.json(await tasbeehView()));

app.post('/api/tasbeeh', async (req, res) => {
  const { key, action } = req.body;
  if (!L.DHIKR.some((x) => x.key === key)) return res.status(400).json({ error: 'bad dhikr' });
  const iso = (await today()).iso;
  const current = (await store.tasbeehCounts(iso))[key] ?? 0;
  if (action === 'tap') {
    await store.setTasbeehCount(iso, key, current + 1);
    await store.setSetting('tasbeeh_total', (await store.getSetting('tasbeeh_total', 0)) + 1);
  } else if (action === 'reset') {
    await store.setTasbeehCount(iso, key, 0);
  } else {
    return res.status(400).json({ error: 'bad action' });
  }
  res.json(await tasbeehView());
});

// ── আমার (পরিসংখ্যান) ──────────────────────────────────────────────────

app.get('/api/profile', async (req, res) => {
  const z = await today();
  const settings = await L.getReminderSettings();
  const jMin = L.minutesUntilJumma(z, settings.jumma.hour, settings.jumma.minute);
  res.json({
    streak: await L.currentStreak(z),
    totalDays: await store.countWhere('m + e + n > 0'),
    completedDays: await store.countWhere('m = 1 AND e = 1 AND n = 1'),
    counts: await store.allDayCounts(),
    sadaqahTarget: settings.sadaqahTarget,
    sadaqahGiven: await store.sadaqahMonthTotal(z.iso.slice(0, 7)),
    jummaRemaining: L.remainingLabel(jMin),
    today: { y: z.y, month: z.mo - 1, iso: z.iso, d: z.d }
  });
});

// ── পুশ নোটিফিকেশন ───────────────────────────────────────────────────

app.get('/api/push/public-key', (req, res) => res.json({ key: push.publicKey }));

app.post('/api/push/subscribe', async (req, res) => {
  try {
    await push.subscribe(req.body.subscription);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/push/unsubscribe', async (req, res) => {
  if (req.body.endpoint) await push.unsubscribe(req.body.endpoint);
  res.json({ ok: true });
});

app.post('/api/push/test', async (req, res) => {
  await push.sendTest();
  res.json({ ok: true });
});

// Vercel Cron প্রতি মিনিটে এটিকে ডাকে। CRON_SECRET সেট থাকলে সেটি মিললেই চলে।
app.get('/api/cron/tick', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const ok = secret ? req.get('Authorization') === `Bearer ${secret}` : !process.env.VERCEL;
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  await push.tick();
  res.json({ ok: true });
});

// ── স্ট্যাটিক ফাইল ও ফলব্যাক ───────────────────────────────────────────

app.get('/api/surahs', (req, res) => res.json(L.CONTENT));

app.use(express.static(path.join(here, 'public'), { extensions: ['html'], maxAge: 0 }));

app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

app.use((err, req, res, next) => {
  // ভুল JSON বা অন্য ক্লায়েন্ট-ত্রুটি — 4xx হিসেবে ফেরত দেওয়া হয়
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'invalid request' });
  }
  console.error(err);
  res.status(500).json({ error: 'server error' });
});
