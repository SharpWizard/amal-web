// ওয়েব পুশ নোটিফিকেশন — অ্যাপ বন্ধ থাকলেও সময়মতো অনুস্মারক পাঠানোর জন্য।
import webpush from 'web-push';
import * as store from './db.js';
import { SESSIONS, WINDOW_MINUTES, getTz, getReminderSettings, loadSessionTimes, zonedParts, bn } from './logic.js';

const CONTACT = process.env.AMAL_CONTACT || 'mailto:amal@example.com';

/** VAPID কী — প্রথমবার তৈরি হয়ে ডাটাবেসে থাকে। */
async function vapidKeys() {
  let keys = await store.getSetting('vapid');
  if (!keys) {
    keys = webpush.generateVAPIDKeys();
    await store.setSetting('vapid', keys);
  }
  return keys;
}

const KEYS = await vapidKeys();
webpush.setVapidDetails(CONTACT, KEYS.publicKey, KEYS.privateKey);

export const publicKey = KEYS.publicKey;

export async function subscribe(subscription) {
  if (!subscription?.endpoint) throw new Error('invalid subscription');
  await store.saveSubscription(subscription.endpoint, subscription);
}

export async function unsubscribe(endpoint) {
  await store.deleteSubscription(endpoint);
}

/** সব সাবস্ক্রাইব করা ডিভাইসে পাঠায়। অবৈধ সাবস্ক্রিপশন মুছে ফেলে। */
async function sendToAll(payload) {
  const subs = await store.allSubscriptions();
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 });
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await store.deleteSubscription(sub.endpoint);
        } else {
          console.error('push failed:', err.statusCode ?? err.message);
        }
      }
    })
  );
}

async function sendOnce(dedupeKey, payload) {
  if (!(await store.allSubscriptions()).length) return;
  if (!(await store.claimReminder(dedupeKey))) return;
  await sendToAll(payload);
}

const sessionPayload = (s, nag) => ({
  title: `${s.emoji} ${s.label}ের আমল`,
  body: nag
    ? 'এখনো পড়া হয়নি — সূরা ও দোয়াগুলো পড়ে নিন।'
    : 'এখন তিলাওয়াতের সময়। পড়ে নিন।',
  tag: `session-${s.key}`,
  url: '/#/amal',
  requireInteraction: true
});

/**
 * প্রতি মিনিটে চলে (Vercel cron বা লোকাল টাইমার) — নির্ধারিত সময়ে ও নাগ-ইন্টারভালে অনুস্মারক পাঠায়।
 * একই অনুস্মারক দুবার যায় না (claimReminder)।
 */
export async function tick(now = new Date()) {
  if (!(await store.allSubscriptions()).length) return;
  const settings = await getReminderSettings();
  const z = zonedParts(await getTz(), now);

  if (settings.enabled) {
    const times = await loadSessionTimes();
    const day = await store.getDay(z.iso);
    for (const s of SESSIONS) {
      const t = times[s.key];
      const start = t.hour * 60 + t.minute;
      const since = z.mins - start;
      const isRead = day[s.key === 'MORNING' ? 'm' : s.key === 'EVENING' ? 'e' : 'n'];
      if (isRead || since < 0 || since >= WINDOW_MINUTES) continue;

      if (since === 0) {
        await sendOnce(`${z.iso}:${s.key}:start`, sessionPayload(s, false));
      } else if (since % settings.nagMinutes === 0) {
        await sendOnce(`${z.iso}:${s.key}:${since}`, sessionPayload(s, true));
      }
    }
  }

  const j = settings.jumma;
  if (j.enabled && z.dow === 5 && z.mins === j.hour * 60 + j.minute && !(await store.jummaDone(z.iso))) {
    await sendOnce(`${z.iso}:jumma`, {
      title: '🕌 জুমার ডাক',
      body: 'আজ জুমার দিন। গোসল করে সুগন্ধি মেখে এখনই মসজিদের দিকে রওনা হন।',
      tag: 'jumma',
      url: '/#/jumma',
      requireInteraction: true
    });
  }

  if (settings.sadaqahReminder && z.d === 1 && z.mins === 11 * 60) {
    await sendOnce(`${z.iso}:sadaqah`, {
      title: '🤲 নতুন মাস — সদকার নিয়ত করুন',
      body: `এ মাসে অন্তত ${bn(settings.sadaqahTarget)} টাকা দান করার নিয়ত করুন।`,
      tag: 'sadaqah',
      url: '/#/sadaqah'
    });
  }
}

/** পরীক্ষার জন্য একটি নমুনা নোটিফিকেশন */
export async function sendTest() {
  await sendToAll({
    title: '🔔 আমল — পরীক্ষা',
    body: 'নোটিফিকেশন ঠিকভাবে কাজ করছে।',
    tag: 'test',
    url: '/#/settings'
  });
}
