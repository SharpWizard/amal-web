// সার্ভিস ওয়ার্কার — অফলাইনে অ্যাপ শেল, এবং ব্যাকগ্রাউন্ড নোটিফিকেশন।
const VERSION = 'amal-v2';
const SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/manifest.webmanifest',
  '/icons/app-logo.png',
  '/fonts/hind_siliguri_regular.ttf',
  '/fonts/hind_siliguri_bold.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// API সবসময় নেটওয়ার্ক থেকে; অন্য ফাইল আগে নেটওয়ার্ক, না পেলে ক্যাশ
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html')))
  );
});

// সার্ভার থেকে রিমাইন্ডার এলে
self.addEventListener('push', (event) => {
  let data = { title: 'আমল', body: '' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appVisible = windows.some((w) => w.visibilityState === 'visible');

    const note = await self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'amal',
      icon: '/icons/app-logo.png',
      badge: '/icons/app-logo.png',
      data: { url: data.url || '/#/today' },
      requireInteraction: !!data.requireInteraction && !appVisible,
      silent: appVisible,
      renotify: !appVisible,
      vibrate: appVisible ? undefined : [400, 200, 400, 200, 400]
    });

    // অ্যাপ খোলা থাকলে ভেতরের পূর্ণ-স্ক্রিন অ্যালার্টই যথেষ্ট — ব্যানারটি অল্প পরে সরে যায়
    if (appVisible) {
      setTimeout(() => note.close(), 3000);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/#/today', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((w) => w.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      if (existing.url !== target) await existing.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
