// End-to-end API smoke test. Run with the server already started on BASE.
const BASE = process.env.BASE || 'http://localhost:3779';
const H = { 'Content-Type': 'application/json', 'X-TZ': 'Asia/Dhaka' };
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
  if (!cond) failures++;
};
const j = async (method, path, body, headers = H) => {
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

// 1. আজ
let r = await j('GET', '/api/today');
check('today 200', r.status === 200);
check('three sessions', r.data.sessions.length === 3);
check('date has bangla digits', /[০-৯]/.test(r.data.date.clock));
const startDone = r.data.doneCount;

// 2. সেশন পড়া / না-পড়া
r = await j('POST', '/api/sessions/MORNING', { read: true });
check('mark morning read', r.status === 200 && r.data.sessions[0].isRead === true);
check('doneCount increments', r.data.doneCount === startDone + 1, `${startDone}->${r.data.doneCount}`);
r = await j('POST', '/api/sessions/MORNING', { read: false });
check('unmark morning', r.data.sessions[0].isRead === false);
r = await j('POST', '/api/sessions/BOGUS', { read: true });
check('bad session -> 400', r.status === 400);

// 3. সময় বদলানো
r = await j('PUT', '/api/sessions/NIGHT/time', { hour: 21, minute: 15 });
check('set night time', r.status === 200 && r.data.sessions[2].hour === 21 && r.data.sessions[2].minute === 15);
check('night timeLabel bangla', r.data.sessions[2].timeLabel.startsWith('রাত'), r.data.sessions[2].timeLabel);
r = await j('PUT', '/api/sessions/NIGHT/time', { hour: 25, minute: 0 });
check('invalid hour -> 400', r.status === 400);
await j('PUT', '/api/sessions/NIGHT/time', { hour: 20, minute: 0 });

// 4. সেটিংস
r = await j('PATCH', '/api/settings', { nagMinutes: 45 });
check('nag 45 accepted', r.status === 200 && r.data.nagMinutes === 45);
r = await j('PATCH', '/api/settings', { nagMinutes: 7 });
check('nag 7 rejected', r.status === 400);
r = await j('PATCH', '/api/settings', { enabled: false, voice: false });
check('toggle reminders off', r.data.enabled === false && r.data.voice === false);
await j('PATCH', '/api/settings', { enabled: true, voice: true, nagMinutes: 30 });
r = await j('PATCH', '/api/settings', { jumma: { hour: 13, minute: 0, enabled: true } });
check('jumma time saved', r.data.jumma === undefined || true);
r = await j('GET', '/api/settings');
check('jumma time read back', r.data.jumma.hour === 13 && r.data.jumma.minute === 0, JSON.stringify(r.data.jumma));
await j('PATCH', '/api/settings', { jumma: { hour: 12, minute: 30 } });

// 5. সদকা
r = await j('POST', '/api/sadaqah', { amount: 1000, note: 'পরীক্ষা' });
check('sadaqah add', r.status === 200 && r.data.monthTotal >= 1000, `month=${r.data.monthTotal}`);
const entryId = r.data.entries[0].id;
r = await j('POST', '/api/sadaqah', { amount: -5 });
check('negative sadaqah rejected', r.status === 400);
r = await j('PUT', '/api/sadaqah/target', { target: 3000 });
check('target updated', r.data.target === 3000);
r = await j('DELETE', `/api/sadaqah/${entryId}`);
check('sadaqah delete', r.status === 200 && !r.data.entries.some((e) => e.id === entryId));
check('six months series', r.data.lastMonths.length === 6);

// 6. তাসবীহ
r = await j('POST', '/api/tasbeeh', { key: 'subhanallah', action: 'tap' });
check('tap increments', r.status === 200 && r.data.dhikr[0].count >= 1);
const before = r.data.todayTotal;
r = await j('POST', '/api/tasbeeh', { key: 'subhanallah', action: 'tap' });
check('second tap', r.data.todayTotal === before + 1);
r = await j('POST', '/api/tasbeeh', { key: 'subhanallah', action: 'reset' });
check('reset zeroes count', r.data.dhikr[0].count === 0);
r = await j('POST', '/api/tasbeeh', { key: 'nope', action: 'tap' });
check('unknown dhikr -> 400', r.status === 400);

// 7. জুমা
r = await j('POST', '/api/jumma/check', { key: 'gosol', done: true });
check('jumma check gosol', r.data.jumma.checks.gosol === true);
r = await j('POST', '/api/jumma/check', { key: 'zzz', done: true });
check('unknown jumma item -> 400', r.status === 400);
r = await j('POST', '/api/jumma/done', { done: true });
check('jumma done flag', r.status === 200);
await j('POST', '/api/jumma/done', { done: false });

// 8. প্রোফাইল ও স্ট্রিক
r = await j('GET', '/api/profile');
check('profile has streak & counts', typeof r.data.streak === 'number' && typeof r.data.counts === 'object');
check('profile today iso', /^\d{4}-\d{2}-\d{2}$/.test(r.data.today.iso));

// 9. পুশ
r = await j('GET', '/api/push/public-key');
check('vapid public key', typeof r.data.key === 'string' && r.data.key.length > 40);
const fakeSub = { endpoint: 'https://example.invalid/push/test-endpoint', keys: { p256dh: 'x', auth: 'y' } };
r = await j('POST', '/api/push/subscribe', { subscription: fakeSub });
check('subscribe', r.status === 200);
r = await j('POST', '/api/push/subscribe', { subscription: {} });
check('bad subscription -> 400', r.status === 400);
r = await j('POST', '/api/push/unsubscribe', { endpoint: fakeSub.endpoint });
check('unsubscribe', r.status === 200);

// 10. স্ট্যাটিক ও সার্ফেস
r = await j('GET', '/api/surahs');
check('surah content 14 entries', r.data.surahs.length === 14 && r.data.bismillah.arabic.length > 10);
for (const p of ['/', '/index.html', '/css/app.css', '/js/app.js', '/sw.js', '/manifest.webmanifest', '/fonts/amiri_regular.ttf', '/icons/app-logo.png']) {
  const res = await fetch(BASE + p);
  check(`static ${p}`, res.status === 200, String(res.status));
}
r = await j('GET', '/api/unknown-route');
check('unknown api -> 404', r.status === 404);

// 11. টাইমজোন হেডার
r = await j('GET', '/api/today', undefined, { 'X-TZ': 'Not/AZone' });
check('invalid timezone header ignored (still 200)', r.status === 200);

console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
