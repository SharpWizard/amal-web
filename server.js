// লোকাল চালানো — `npm start`। Vercel-এ এই ফাইল ব্যবহৃত হয় না (api/index.js দেখুন)।
import { app } from './app.js';
import * as push from './lib/push.js';

const PORT = Number(process.env.PORT) || 3000;

// লোকালি প্রতি ৩০ সেকেন্ডে রিমাইন্ডার পরীক্ষা (Vercel-এ এটির কাজ Cron করে)
setInterval(() => {
  push.tick().catch((err) => console.error('tick failed:', err));
}, 30_000);

app.listen(PORT, () => {
  console.log(`আমল চালু আছে — http://localhost:${PORT}`);
});
