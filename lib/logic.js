// অ্যাপের মূল নিয়মগুলো — Android-এর Reminders.kt, AppPrefs.kt ও SadaqahDb.kt থেকে নেওয়া।
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** সূরা ও দোয়ার তথ্য — SurahData.kt থেকে তৈরি data/surahs.json */
export const CONTENT = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'data', 'surahs.json'), 'utf8')
);
export const SURAHS = CONTENT.surahs;

export const SESSIONS = [
  {
    key: 'MORNING', label: 'সকাল', emoji: '🌅', hour: 6, minute: 0,
    digest: 'আয়াতুল কুরসী · সূরা ইখলাস · ফালাক · নাস'
  },
  {
    key: 'EVENING', label: 'সন্ধ্যা', emoji: '🌇', hour: 16, minute: 0,
    digest: 'আয়াতুল কুরসী · সূরা কাফিরূন · দুরুদ শরীফ'
  },
  {
    key: 'NIGHT', label: 'রাত', emoji: '🌙', hour: 20, minute: 0,
    digest: 'সূরা ইখলাস · ফালাক · নাস · মাসনূন দোয়া'
  }
];

/** সেশন শুরুর পর কত ঘণ্টা পর্যন্ত অপঠিত থাকলে ডাকা চলবে */
export const WINDOW_MINUTES = 5 * 60;
export const NAG_OPTIONS = [15, 30, 45, 60];
export const DEFAULT_NAG = 30;
export const DEFAULT_TZ = process.env.AMAL_TZ || 'Asia/Dhaka';
export const DEFAULT_SADAQAH_TARGET = 5000;
export const SADAQAH_TARGET_OPTIONS = [1000, 2000, 3000, 5000, 10000, 20000];
export const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export const DHIKR = [
  { key: 'subhanallah', bangla: 'সুবহানাল্লাহ', arabic: 'سُبْحَانَ اللَّهِ', target: 33, meaning: 'আল্লাহ পবিত্র ও মহান' },
  { key: 'alhamdulillah', bangla: 'আলহামদুলিল্লাহ', arabic: 'الْحَمْدُ لِلَّهِ', target: 33, meaning: 'সমস্ত প্রশংসা আল্লাহর' },
  { key: 'allahuakbar', bangla: 'আল্লাহু আকবার', arabic: 'اللَّهُ أَكْبَرُ', target: 34, meaning: 'আল্লাহ সবচেয়ে বড়' },
  { key: 'tahlil', bangla: 'লা ইলাহা ইল্লাল্লাহ', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 100, meaning: 'আল্লাহ ছাড়া কোনো উপাস্য নেই' },
  { key: 'istighfar', bangla: 'আস্তাগফিরুল্লাহ', arabic: 'أَسْتَغْفِرُ اللَّهَ', target: 100, meaning: 'আমি আল্লাহর কাছে ক্ষমা চাই' },
  { key: 'durud', bangla: 'দরুদ শরীফ', arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', target: 100, meaning: 'নবী ﷺ-এর প্রতি দরুদ' }
];

export const JUMMA_TASKS = [
  { key: 'gosol', emoji: '🚿', title: 'গোসল করা', detail: 'জুমার দিন গোসল করা সুন্নাত' },
  { key: 'pak', emoji: '👕', title: 'পরিষ্কার পোশাক', detail: 'সবচেয়ে সুন্দর ও পরিচ্ছন্ন কাপড় পরুন' },
  { key: 'attar', emoji: '🌸', title: 'সুগন্ধি ব্যবহার', detail: 'মিসওয়াক ও সুগন্ধি ব্যবহার করুন' },
  { key: 'early', emoji: '🕌', title: 'আগেভাগে মসজিদে যাওয়া', detail: 'আগে গেলে বেশি সওয়াব' },
  { key: 'kahf', emoji: '📖', title: 'সূরা কাহফ পড়া', detail: 'দুই জুমার মাঝে আলো হয়ে থাকে' },
  { key: 'durud', emoji: '🌿', title: 'বেশি বেশি দরুদ', detail: 'এ দিনে দরুদ পেশ করা হয়' },
  { key: 'dua', emoji: '🤲', title: 'দোয়া কবুলের সময়', detail: 'আসরের পর থেকে মাগরিব পর্যন্ত দোয়া করুন' }
];

// ── বাংলা অঙ্ক ও সময় ───────────────────────────────────────────────────

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bn = (v) => String(v).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
const pad2 = (n) => String(n).padStart(2, '0');

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];
export const bnMonth = (zeroBased) => BN_MONTHS[Math.min(Math.max(zeroBased, 0), 11)];

const WEEK_LABELS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** ২৪-ঘণ্টার সময়কে বাংলা লেবেলে — যেমন "বিকেল ৪:০০" */
export function banglaTimeLabel(hour, minute) {
  const period =
    hour <= 3 ? 'রাত' :
    hour <= 5 ? 'ভোর' :
    hour <= 11 ? 'সকাল' :
    hour <= 14 ? 'দুপুর' :
    hour <= 17 ? 'বিকেল' :
    hour <= 19 ? 'সন্ধ্যা' : 'রাত';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${bn(h12)}:${bn(pad2(minute))}`;
}

export function greetingFor(hour) {
  if (hour >= 4 && hour <= 5) return 'শুভ ভোর';
  if (hour <= 11) return 'শুভ সকাল';
  if (hour <= 14) return 'শুভ দুপুর';
  if (hour <= 17) return 'শুভ বিকেল';
  if (hour <= 19) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত';
}

/** নির্দিষ্ট টাইমজোনে এখনকার তারিখ-সময়ের অংশ। */
export function zonedParts(tz, date = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const y = Number(p.year);
  const mo = Number(p.month);
  const d = Number(p.day);
  const h = Number(p.hour);
  const mi = Number(p.minute);
  return {
    y, mo, d, h, mi,
    dow: DOW[p.weekday],
    iso: `${y}-${pad2(mo)}-${pad2(d)}`,
    mins: h * 60 + mi
  };
}

export function isValidTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** ISO তারিখ থেকে সপ্তাহের দিন (০ = রবি) */
function dowOfIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function dayOfYear(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

const HIJRI_MONTHS = [
  'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জমাদিউল আউয়াল', 'জমাদিউস সানি',
  'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'
];

/** গাণিতিক (tabular) ইসলামি ক্যালেন্ডার — Kotlin-এর integer division মিলিয়ে। */
const idiv = (a, b) => Math.trunc(a / b);
export function hijriFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const a = idiv(14 - m, 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  const jd = d + idiv(153 * m2 + 2, 5) + 365 * y2 + idiv(y2, 4) - idiv(y2, 100) + idiv(y2, 400) - 32045;
  let l = jd - 1948440 + 10632;
  const n = idiv(l - 1, 10631);
  l = l - 10631 * n + 354;
  const j = idiv(10985 - l, 5316) * idiv(50 * l, 17719) + idiv(l, 5670) * idiv(43 * l, 15238);
  l = l - idiv(30 - j, 15) * idiv(17719 * j, 50) - idiv(j, 16) * idiv(15238 * j, 43) + 29;
  const hMonth = idiv(24 * l, 709);
  const hDay = l - idiv(709 * hMonth, 24);
  return `${bn(hDay)} ${HIJRI_MONTHS[Math.min(Math.max(hMonth - 1, 0), 11)]}`;
}

export function banglaDateFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${bn(d)} ${bnMonth(m - 1)} ${bn(y)}`;
}

/** "২ ঘণ্টা ১৫ মিনিট বাকি" — Reminders.kt-এর remainingLabel-এর মতো */
export function remainingLabel(minutes) {
  if (minutes <= 1) return 'এখনই';
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  if (d > 0 && h > 0) return `${bn(d)} দিন ${bn(h)} ঘণ্টা বাকি`;
  if (d > 0) return `${bn(d)} দিন বাকি`;
  if (h > 0 && m > 0) return `${bn(h)} ঘণ্টা ${bn(m)} মিনিট বাকি`;
  if (h > 0) return `${bn(h)} ঘণ্টা বাকি`;
  return `${bn(m)} মিনিট বাকি`;
}

// ── সেটিংস ──────────────────────────────────────────────────────────────

export function getTz() {
  return store.getSetting('tz', DEFAULT_TZ);
}

export function sessionTime(key) {
  const def = SESSIONS.find((s) => s.key === key);
  return store.getSetting(`time_${key}`, { hour: def.hour, minute: def.minute });
}

export function getReminderSettings() {
  return {
    enabled: store.getSetting('reminders_enabled', true),
    forceAlert: store.getSetting('force_alert', true),
    voice: store.getSetting('voice', true),
    askOnOpen: store.getSetting('ask_on_open', true),
    nagMinutes: store.getSetting('nag_minutes', DEFAULT_NAG),
    jumma: {
      enabled: store.getSetting('jumma_enabled', true),
      hour: store.getSetting('jumma_hour', 12),
      minute: store.getSetting('jumma_minute', 30)
    },
    sadaqahReminder: store.getSetting('sadaqah_reminder', true),
    sadaqahTarget: store.getSetting('sadaqah_target', DEFAULT_SADAQAH_TARGET)
  };
}

// ── সেশনের অবস্থা ──────────────────────────────────────────────────────

/** এখন কোন সেশনের উইন্ডো চলছে — Reminders.kt-এর activeSession */
export function activeSessionKey(z) {
  let result = null;
  let bestStart = -1;
  for (const s of SESSIONS) {
    const t = sessionTime(s.key);
    const start = t.hour * 60 + t.minute;
    const end = Math.min(start + WINDOW_MINUTES, 24 * 60);
    if (z.mins >= start && z.mins < end && start > bestStart) {
      result = s.key;
      bestStart = start;
    }
  }
  return result;
}

export function sessionStates(z) {
  const day = store.getDay(z.iso);
  const active = activeSessionKey(z);
  return SESSIONS.map((s) => {
    const t = sessionTime(s.key);
    const isRead = day[s.key === 'MORNING' ? 'm' : s.key === 'EVENING' ? 'e' : 'n'];
    return {
      key: s.key,
      label: s.label,
      emoji: s.emoji,
      digest: s.digest,
      hour: t.hour,
      minute: t.minute,
      timeLabel: banglaTimeLabel(t.hour, t.minute),
      isRead,
      isActive: s.key === active
    };
  });
}

/** আজকে কোন সেশনে দেখানো হবে — চলমান অপঠিত, নইলে প্রথম অপঠিত, নইলে প্রথমটি */
export function focusSession(states) {
  return states.find((s) => s.isActive && !s.isRead)
    ?? states.find((s) => !s.isRead)
    ?? states[0];
}

/** সময় পেরিয়েছে কিন্তু পড়া হয়নি — অ্যাপ খুললে জিজ্ঞেস করা হয় */
export function pendingSessionKeys(z, states) {
  return states
    .filter((s) => {
      const t = sessionTime(s.key);
      return z.mins >= t.hour * 60 + t.minute && !s.isRead;
    })
    .map((s) => s.key);
}

// ── স্ট্রিক, সপ্তাহ, পরবর্তী জুমা ─────────────────────────────────────

export function currentStreak(z) {
  const set = store.practicedDates();
  let iso = z.iso;
  if (!set.has(iso)) iso = addDays(iso, -1);
  let streak = 0;
  while (set.has(iso)) {
    streak++;
    iso = addDays(iso, -1);
  }
  return streak;
}

/** শনি থেকে শুক্র — চলতি সপ্তাহের প্রতিটি দিনের সম্পন্ন সেশন সংখ্যা */
export function weekPicture(z) {
  const counts = store.allDayCounts();
  const offset = (z.dow + 1) % 7; // শনিবার = ০
  const start = addDays(z.iso, -offset);
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(start, i);
    return {
      iso,
      label: WEEK_LABELS[dowOfIso(iso)],
      count: counts[iso] ?? 0,
      isToday: iso === z.iso
    };
  });
}

/** পরবর্তী শুক্রবার কত মিনিট পরে */
export function minutesUntilJumma(z, hour, minute) {
  const target = hour * 60 + minute;
  for (let i = 0; i < 8; i++) {
    const iso = addDays(z.iso, i);
    if (dowOfIso(iso) !== 5) continue;
    if (i === 0 && target <= z.mins) continue;
    return i * 1440 + target - z.mins;
  }
  return 7 * 1440;
}

// ── সম্পূর্ণ "আজ" অবস্থা ────────────────────────────────────────────────

export function buildToday(z = zonedParts(getTz())) {
  const settings = getReminderSettings();
  const states = sessionStates(z);
  const focus = focusSession(states);
  const lastId = store.getSetting('last_read', 1);
  const lastRead = SURAHS.find((s) => s.id === lastId) ?? SURAHS[0];
  const ayahOfDay = SURAHS[dayOfYear(z.iso) % SURAHS.length];
  const isFriday = z.dow === 5;
  const jummaDone = store.jummaDone(z.iso);
  const jMinutes = minutesUntilJumma(z, settings.jumma.hour, settings.jumma.minute);

  return {
    date: {
      iso: z.iso,
      hour: z.h,
      clock: `${bn(pad2(z.h))}:${bn(pad2(z.mi))}`,
      greeting: greetingFor(z.h),
      bangla: banglaDateFromIso(z.iso),
      hijri: hijriFromIso(z.iso)
    },
    sessions: states,
    doneCount: states.filter((s) => s.isRead).length,
    total: states.length,
    focusKey: focus.key,
    activeKey: states.find((s) => s.isActive)?.key ?? null,
    streak: currentStreak(z),
    week: weekPicture(z),
    lastRead: { id: lastRead.id, nameBangla: lastRead.nameBangla },
    ayahOfDay: { id: ayahOfDay.id, nameBangla: ayahOfDay.nameBangla, subtitle: ayahOfDay.subtitle },
    pending: settings.askOnOpen && settings.enabled ? pendingSessionKeys(z, states) : [],
    jumma: {
      enabled: settings.jumma.enabled,
      hour: settings.jumma.hour,
      minute: settings.jumma.minute,
      timeLabel: banglaTimeLabel(settings.jumma.hour, settings.jumma.minute),
      isFriday,
      done: jummaDone,
      minutesUntil: jMinutes,
      remainingLabel: remainingLabel(jMinutes),
      checks: store.jummaChecks(z.iso)
    },
    settings
  };
}

