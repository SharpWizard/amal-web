// আমল — ওয়েব সার্ভার (Express)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './lib/db.js';
import * as L from './lib/logic.js';
import * as push from './lib/push.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
// Express 5 leaves req.body undefined when a request has no body
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

// ক্লায়েন্টের টাইমজোন — সব "আজ" ও সময়ের হিসাব এই জোনে হয়।
app.use('/api', (req, res, next) => {
  const tz = req.get('X-TZ');
  if (tz && L.isValidTz(tz) && tz !== L.getTz()) store.setSetting('tz', tz);
  next();
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const today = () => L.zonedParts(L.getTz());
const isoRe = /^\d{4}-\d{2}-\d{2}$/;
const sessionKeys = L.SESSIONS.map((s) => s.key);
const toInt = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

// ── আজ ─────────────────────────────────────────────────────────────────

app.get('/api/today', (req, res) => {
  res.json(L.buildToday());
});

app.post('/api/sessions/:key', (req, res) => {
  const { key } = req.params;
  if (!sessionKeys.includes(key)) return res.status(400).json({ error: 'bad session' });
  if (typeof req.body.read !== 'boolean') return res.status(400).json({ error: 'read must be boolean' });
  store.setSessionRead(today().iso, key, req.body.read);
  res.json(L.buildToday());
});

app.put('/api/sessions/:key/time', (req, res) => {
  const { key } = req.params;
  if (!sessionKeys.includes(key)) return res.status(400).json({ error: 'bad session' });
  const hour = toInt(req.body.hour, 0, 23);
  const minute = toInt(req.body.minute, 0, 59);
  if (hour === null || minute === null) return res.status(400).json({ error: 'bad time' });
  store.setSetting(`time_${key}`, { hour, minute });
  res.json(L.buildToday());
});

app.post('/api/last-read', (req, res) => {
  const id = toInt(req.body.surahId, 1, 9999);
  if (id === null) return res.status(400).json({ error: 'bad surah' });
  store.setSetting('last_read', id);
  res.json({ ok: true });
});

// ── জুমা ───────────────────────────────────────────────────────────────

app.post('/api/jumma/done', (req, res) => {
  if (typeof req.body.done !== 'boolean') return res.status(400).json({ error: 'done must be boolean' });
  store.setJummaDone(today().iso, req.body.done);
  res.json(L.buildToday());
});

app.post('/api/jumma/check', (req, res) => {
  const { key, done } = req.body;
  if (!L.JUMMA_TASKS.some((t) => t.key === key)) return res.status(400).json({ error: 'bad item' });
  store.setJummaCheck(today().iso, key, !!done);
  res.json(L.buildToday());
});

// ── সেটিংস ─────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  res.json({ ...L.getReminderSettings(), tz: L.getTz(), sessions: L.SESSIONS.map((s) => ({ key: s.key, ...L.sessionTime(s.key) })) });
});

app.patch('/api/settings', (req, res) => {
  const b = req.body;
  if (typeof b.enabled === 'boolean') store.setSetting('reminders_enabled', b.enabled);
  if (typeof b.forceAlert === 'boolean') store.setSetting('force_alert', b.forceAlert);
  if (typeof b.voice === 'boolean') store.setSetting('voice', b.voice);
  if (typeof b.askOnOpen === 'boolean') store.setSetting('ask_on_open', b.askOnOpen);
  if (typeof b.sadaqahReminder === 'boolean') store.setSetting('sadaqah_reminder', b.sadaqahReminder);
  if (b.nagMinutes !== undefined) {
    if (!L.NAG_OPTIONS.includes(b.nagMinutes)) return res.status(400).json({ error: 'bad nag' });
    store.setSetting('nag_minutes', b.nagMinutes);
  }
  if (b.jumma) {
    if (typeof b.jumma.enabled === 'boolean') store.setSetting('jumma_enabled', b.jumma.enabled);
    const hour = toInt(b.jumma.hour, 0, 23);
    const minute = toInt(b.jumma.minute, 0, 59);
    if (hour !== null && minute !== null) {
      store.setSetting('jumma_hour', hour);
      store.setSetting('jumma_minute', minute);
    }
  }
  res.json(L.getReminderSettings());
});

// ── সদকা ───────────────────────────────────────────────────────────────

function sadaqahView() {
  const z = today();
  const cal = [];
  let [y, m] = [z.y, z.mo];
  for (let i = 0; i < 6; i++) {
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    cal.push({ prefix, label: L.bnMonth(m - 1), year: L.bn(y), total: store.sadaqahMonthTotal(prefix) });
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return {
    target: L.getReminderSettings().sadaqahTarget,
    reminder: L.getReminderSettings().sadaqahReminder,
    monthTotal: store.sadaqahMonthTotal(z.iso.slice(0, 7)),
    lifetime: store.sadaqahLifetime(),
    monthsGiven: store.sadaqahMonthsGiven(),
    lastMonths: cal,
    entries: store.sadaqahEntries(),
    quickAmounts: L.QUICK_AMOUNTS,
    targetOptions: L.SADAQAH_TARGET_OPTIONS
  };
}

app.get('/api/sadaqah', (req, res) => res.json(sadaqahView()));

app.post('/api/sadaqah', (req, res) => {
  const amount = toInt(req.body.amount, 1, 100_000_000);
  if (amount === null) return res.status(400).json({ error: 'bad amount' });
  const note = String(req.body.note ?? '').slice(0, 200);
  const date = isoRe.test(req.body.date ?? '') ? req.body.date : today().iso;
  store.addSadaqah(date, amount, note);
  res.json(sadaqahView());
});

app.delete('/api/sadaqah/:id', (req, res) => {
  const id = toInt(req.params.id, 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return res.status(400).json({ error: 'bad id' });
  store.deleteSadaqah(id);
  res.json(sadaqahView());
});

app.put('/api/sadaqah/target', (req, res) => {
  const t = toInt(req.body.target, 0, 100_000_000);
  if (t === null) return res.status(400).json({ error: 'bad target' });
  store.setSetting('sadaqah_target', t);
  res.json(sadaqahView());
});

// ── তাসবীহ / জিকির ──────────────────────────────────────────────────────

function tasbeehView() {
  const counts = store.tasbeehCounts(today().iso);
  const todayTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    dhikr: L.DHIKR.map((d) => ({ ...d, count: counts[d.key] ?? 0 })),
    todayTotal,
    lifetime: store.getSetting('tasbeeh_total', 0)
  };
}

app.get('/api/tasbeeh', (req, res) => res.json(tasbeehView()));

app.post('/api/tasbeeh', (req, res) => {
  const { key, action } = req.body;
  const d = L.DHIKR.find((x) => x.key === key);
  if (!d) return res.status(400).json({ error: 'bad dhikr' });
  const iso = today().iso;
  const current = store.tasbeehCounts(iso)[key] ?? 0;
  if (action === 'tap') {
    store.setTasbeehCount(iso, key, current + 1);
    store.setSetting('tasbeeh_total', store.getSetting('tasbeeh_total', 0) + 1);
  } else if (action === 'reset') {
    store.setTasbeehCount(iso, key, 0);
  } else {
    return res.status(400).json({ error: 'bad action' });
  }
  res.json(tasbeehView());
});

// ── আমার (পরিসংখ্যান) ──────────────────────────────────────────────────

app.get('/api/profile', (req, res) => {
  const z = today();
  const counts = store.allDayCounts();
  const totalDays = store.countWhere('m + e + n > 0');
  const completedDays = store.countWhere('m = 1 AND e = 1 AND n = 1');
  const settings = L.getReminderSettings();
  const jMin = L.minutesUntilJumma(z, settings.jumma.hour, settings.jumma.minute);
  res.json({
    streak: L.currentStreak(z),
    totalDays,
    completedDays,
    counts,
    sadaqahTarget: settings.sadaqahTarget,
    sadaqahGiven: store.sadaqahMonthTotal(z.iso.slice(0, 7)),
    jummaRemaining: L.remainingLabel(jMin),
    today: { y: z.y, month: z.mo - 1, iso: z.iso, d: z.d }
  });
});

// ── পুশ নোটিফিকেশন ───────────────────────────────────────────────────

app.get('/api/push/public-key', (req, res) => res.json({ key: push.publicKey }));

app.post('/api/push/subscribe', (req, res) => {
  try {
    push.subscribe(req.body.subscription);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/push/unsubscribe', (req, res) => {
  if (req.body.endpoint) push.unsubscribe(req.body.endpoint);
  res.json({ ok: true });
});

app.post('/api/push/test', wrap(async (req, res) => {
  await push.sendTest();
  res.json({ ok: true });
}));

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

// প্রতি ৩০ সেকেন্ডে রিমাইন্ডার পরীক্ষা
setInterval(() => {
  push.tick().catch((err) => console.error('tick failed:', err));
}, 30_000);

app.listen(PORT, () => {
  console.log(`আমল চালু আছে — http://localhost:${PORT}`);
});
