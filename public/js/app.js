// আমল — ফ্রন্টএন্ড (ভ্যানিলা JS, কোনো বিল্ড স্টেপ নেই)

// ── ইউটিলিটি ─────────────────────────────────────────────────────────────

const $ = (sel, root = document) => root.querySelector(sel);
const BN = '০১২৩৪৫৬৭৮৯';
const bn = (v) => String(v).replace(/[0-9]/g, (d) => BN[Number(d)]);
const money = (n) => '৳ ' + bn(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const bnDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${bn(d)} ${BN_MONTHS[m - 1]} ${bn(y)}`;
};
const pad2 = (n) => String(n).padStart(2, '0');
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
  beads: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  tune: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  mosque: '<path d="M3 21h18M5 21V11a7 7 0 0 1 14 0v10M12 4V2M9 21v-5a3 3 0 0 1 6 0v5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;

// ── API ─────────────────────────────────────────────────────────────────

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-TZ': TZ },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}
const get = (u) => api('GET', u);
const post = (u, b) => api('POST', u, b ?? {});
const put = (u, b) => api('PUT', u, b);
const patch = (u, b) => api('PATCH', u, b);
const del = (u) => api('DELETE', u);

// ── অবস্থা ────────────────────────────────────────────────────────────

const state = {
  today: null,
  surahs: null,
  settings: null,
  dhikr: null,
  dhikrIdx: 0,
  libCat: 'সব',
  libQuery: '',
  calMonth: null,
  arabicSize: 26,
  sizeOpen: false,
  renderSeq: 0
};

const shownAt = {};
const snoozedUntil = {};

async function loadSurahs() {
  if (!state.surahs) {
    const content = await get('/api/surahs');
    state.surahs = content.surahs;
    state.bismillah = content.bismillah.arabic;
  }
  return state.surahs;
}

async function refreshToday() {
  state.today = await get('/api/today');
  state.settings = state.today.settings;
  return state.today;
}

function toast(msg) {
  const old = document.querySelector('.toast');
  old?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ── রাউটার ────────────────────────────────────────────────────────────

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'today', id: parts[1], params: Object.fromEntries(new URLSearchParams(query)) };
}

const TABS = [
  { name: 'today', href: '#/today', label: 'আজ', icon: 'calendar' },
  { name: 'library', href: '#/library', label: 'পাঠ', icon: 'book' },
  { name: 'dhikr', href: '#/dhikr', label: 'জিকির', icon: 'beads' },
  { name: 'me', href: '#/me', label: 'আমার', icon: 'user' }
];
const TAB_NAMES = TABS.map((t) => t.name);

function renderTabbar(active) {
  const bar = $('#tabbar');
  if (!TAB_NAMES.includes(active)) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  bar.classList.toggle('dark', active === 'dhikr');
  bar.innerHTML = TABS.map((t) => `
    <a class="tab ${t.name === active ? 'on' : ''}" href="${t.href}" ${t.name === active ? 'aria-current="page"' : ''}>
      ${icon(t.icon)}<span>${t.label}</span>
    </a>`).join('');
}

const VIEWS = {};

async function render() {
  const seq = ++state.renderSeq;
  const r = parseRoute();
  if (r.name !== state.lastRoute) {
    window.scrollTo(0, 0);
    state.lastRoute = r.name;
  }
  const view = $('#view');
  const page = VIEWS[r.name] ? r.name : 'today';
  renderTabbar(page);
  view.className = 'view';
  if (!state.today) view.innerHTML = '<div class="spinner"></div>';
  try {
    await VIEWS[page](r, view);
  } catch (err) {
    if (seq !== state.renderSeq) return;
    view.innerHTML = `<div class="empty">সমস্যা হয়েছে: ${esc(err.message)}<br><br><button class="btn btn-soft btn-sm" data-action="reload">আবার চেষ্টা করুন</button></div>`;
  }
}

/** সাব-স্ক্রিনের উপরের হেডার */
function subHead(title, subtitle, backHref, right = '') {
  return `
    <header class="page-head">
      <div class="head-bar">
        <button class="icon-btn" data-go="${backHref}" aria-label="পেছনে">${icon('back')}</button>
        <div class="head-title">${title}${subtitle ? `<small>${subtitle}</small>` : ''}</div>
        ${right}
      </div>
    </header>`;
}

// ── আজ ────────────────────────────────────────────────────────────────

VIEWS.today = async (r, view) => {
  const t = state.today ?? (await refreshToday());
  const focus = t.sessions.find((s) => s.key === t.focusKey);

  view.innerHTML = `
    <header class="hero">
      <div class="row">
        <div class="grow">
          <div class="greet-kicker">আসসালামু আলাইকুম</div>
          <div class="greet-title">${t.date.greeting}</div>
        </div>
        <button class="icon-btn" data-go="#/settings" aria-label="অনুস্মারক সেটিংস">${icon('bell')}</button>
      </div>
      <div class="clock-row">
        <div class="grow">
          <div class="clock">${t.date.clock}</div>
          <div class="date-line">${t.date.bangla} · ${t.date.hijri}</div>
        </div>
        <div class="progress-count"><b>${bn(t.doneCount)}/${bn(t.total)}</b><span>আজকের আমল</span></div>
      </div>
      <div class="segments" aria-hidden="true">
        ${t.sessions.map((s) => `<i class="${s.isRead ? 'on' : ''}"></i>`).join('')}
      </div>
    </header>

    <section class="stack" style="padding: 18px 18px 0;">
      <article class="card">
        <div class="kicker ${focus.isRead ? 'done' : 'go'}"><span class="dot"></span>${focus.isRead ? 'আজকের এই আমল সম্পন্ন' : 'এখন পড়ার সময়'}</div>
        <div class="focus-head" style="margin-top: 14px;">
          <div class="focus-badge ${focus.isRead ? '' : 'pulse'}"><span>${focus.emoji}</span></div>
          <div class="grow">
            <div class="focus-title">${focus.label}ের আমল</div>
            <div class="focus-sub">${focus.digest}</div>
          </div>
        </div>
        <div class="focus-actions">
          <button class="btn btn-primary" data-action="read-last">${icon('play', 'icon-sm')} তিলাওয়াত শুরু করুন</button>
          <button class="btn-check ${focus.isRead ? 'on' : ''}" data-action="mark" data-key="${focus.key}" data-read="${focus.isRead ? 0 : 1}" ${focus.isRead ? 'disabled' : ''} aria-label="পড়া হয়েছে">${icon('check')}</button>
        </div>
      </article>

      <article class="card tap" data-go="#/amal">
        <div class="rhythm-head">
          <div class="card-title">দিনের ছন্দ</div>
          <span class="streak">${icon('flame')} ${bn(t.streak)} দিন</span>
        </div>
        ${t.sessions.map((s, i) => `
          <div class="rhythm-item" style="${i ? 'margin-top: 6px;' : ''}">
            <div class="dot-state ${s.isRead ? 'done' : s.isActive ? 'active' : ''}">${s.isRead ? icon('check', 'icon-sm') : `<span style="font-size:15px">${s.emoji}</span>`}</div>
            <div class="grow">
              <div class="rhythm-name">${s.label}</div>
              <div class="rhythm-meta">${s.timeLabel} · ${s.isRead ? 'সম্পন্ন' : s.isActive ? 'এখন সময়' : 'বাকি'}</div>
            </div>
          </div>`).join('')}
      </article>

      <article class="card tap ayah-card" data-go="#/surah/${t.ayahOfDay.id}">
        <div class="ayah-glyph">۝</div>
        <div class="grow">
          <div class="muted small">আজকের সূরা ও দোয়া</div>
          <div class="ayah-name">${t.ayahOfDay.nameBangla}</div>
          <div class="muted small">${t.ayahOfDay.subtitle}</div>
        </div>
        ${icon('chev', 'muted')}
      </article>

      <div class="quick-row">
        <button class="quick" data-go="#/library">${icon('book')}<b>পাঠ</b></button>
        <button class="quick" data-go="#/jumma"><span style="font-size:24px;line-height:1">🕌</span><b>জুমা</b></button>
        <button class="quick" data-go="#/sadaqah"><span style="font-size:24px;line-height:1">🤲</span><b>সদকা</b></button>
      </div>
    </section>`;
};

// ── আজকের আমল ─────────────────────────────────────────────────────────

VIEWS.amal = async (r, view) => {
  const t = await refreshToday();
  const streakChip = `<span class="streak" style="color: var(--brass);">${icon('flame', 'icon-sm')} ${bn(t.streak)} দিন</span>`;

  view.innerHTML = `
    ${subHead('আজকের আমল', bnDate(t.date.iso), '#/today',
      `<button class="icon-btn" data-go="#/settings" aria-label="সময় বদলান">${icon('tune')}</button>`)}
    <section class="stack" style="padding: 18px;">
      <div class="card" style="background: linear-gradient(160deg, var(--emerald-lift), var(--emerald-deep)); border: 0; color: var(--cream);">
        <div class="row between">
          <div>
            <div class="display" style="font-size: 44px; color: var(--cream-bright); line-height: 1.05;">${bn(t.doneCount)} <span style="font-size: 22px; color: var(--cream-muted);">/ ${bn(t.total)}</span></div>
            <div class="small" style="color: var(--cream-muted); margin-top: 4px;">${bn(t.date.hijri)}</div>
          </div>
          <div class="chip" style="background: transparent; border-color: rgba(195,155,62,.5); height: auto; padding: 6px 12px;">${streakChip}</div>
        </div>
      </div>

      ${t.sessions.map((s) => {
        const active = s.isActive && !s.isRead;
        return `
        <article class="session-card ${active ? 'active' : ''}">
          <div class="session-top">
            <div class="session-icon ${s.isRead ? 'done' : active ? 'active' : ''}">${s.emoji}</div>
            <div class="grow">
              <div class="session-name">${s.label} ${active ? '<span class="badge">এখন</span>' : ''}</div>
              <div class="session-meta ${s.isRead ? 'ok' : ''}">
                <button data-action="edit-time" data-key="${s.key}" style="text-decoration: underline dotted; text-underline-offset: 3px;">${s.timeLabel}</button>
                · ${s.isRead ? 'আলহামদুলিল্লাহ, সম্পন্ন' : active ? 'এখন পড়ার উত্তম সময়' : 'আজ এখনো বাকি'}
              </div>
            </div>
            ${!active ? `
              <button class="session-toggle ${s.isRead ? 'on' : ''}" data-action="mark" data-key="${s.key}" data-read="${s.isRead ? 0 : 1}" aria-label="${s.isRead ? 'সম্পন্ন' : 'বাকি'}">
                ${icon(s.isRead ? 'check' : 'beads')}
              </button>` : ''}
          </div>
          ${active ? `
            <div class="session-actions">
              <button class="btn btn-primary" data-action="read-last">${icon('play', 'icon-sm')} পড়তে শুরু করুন</button>
              <button class="btn btn-ghost" data-action="mark" data-key="${s.key}" data-read="1">পড়া হয়েছে</button>
            </div>` : ''}
        </article>`;
      }).join('')}

      <p class="small muted" style="line-height: 1.8; padding: 0 4px;">
        প্রতিটি সেশন শেষে “পড়া হয়েছে” চিহ্নিত করুন — তাহলে অনুস্মারক বন্ধ হবে।
      </p>

      <section class="week-panel">
        <div class="row gap-10">${icon('sparkle', 'icon-sm')}<div class="card-title" style="font-size:15px">সপ্তাহের ছবি</div></div>
        <div class="week">
          ${t.week.map((d) => `
            <div class="week-cell ${d.isToday ? 'today' : ''}">
              <div class="week-bar ${d.count >= 3 ? 'l3' : d.count === 2 ? 'l2' : d.count === 1 ? 'l1' : ''} ${d.isToday ? 'today' : ''}"></div>
              <span>${d.label}</span>
            </div>`).join('')}
        </div>
      </section>
    </section>`;
};

// ── পাঠ (তালিকা) ──────────────────────────────────────────────────────

const categoryOf = (s) => (s.type === 'দোয়া' ? 'দোয়া' : s.type === 'দরুদ' ? 'দরুদ' : 'সূরা');

function surahRows(list) {
  const q = state.libQuery.trim();
  const filtered = list.filter((s) =>
    (state.libCat === 'সব' || categoryOf(s) === state.libCat) &&
    (!q || [s.nameBangla, s.meaning, s.subtitle, s.nameArabic].some((x) => x.includes(q)))
  );
  if (!filtered.length) return '<div class="empty">কিছু পাওয়া যায়নি</div>';
  return filtered.map((s) => `
    <button class="surah-row" data-go="#/surah/${s.id}">
      <div class="surah-no">${bn(s.id)}</div>
      <div class="grow" style="min-width:0">
        <div class="surah-name">${esc(s.nameBangla)}</div>
        <div class="surah-sub">${bn(s.ayahCount)} আয়াত · ${s.type}</div>
      </div>
      <div class="surah-arabic">${esc(s.nameArabic)}</div>
    </button>`).join('');
}

VIEWS.library = async (r, view) => {
  const [list, t] = await Promise.all([loadSurahs(), state.today ?? refreshToday()]);
  if (r.params.cat) state.libCat = r.params.cat;
  const last = list.find((s) => s.id === t.lastRead.id) ?? list[0];
  const cats = ['সব', 'সূরা', 'দোয়া', 'দরুদ'];

  view.innerHTML = `
    <header class="page-head">
      <div class="head-title" style="font-size: 30px; line-height: 1.2;">পাঠ</div>
      <div class="small" style="color: var(--cream-muted); margin-top: 4px;">${bn(list.length)}টি সূরা, দোয়া ও দরুদ</div>
    </header>
    <section class="stack" style="padding: 18px;">
      <label class="search">${icon('search', 'icon-sm')}<input id="lib-search" type="search" placeholder="সূরা বা দোয়া খুঁজুন" value="${esc(state.libQuery)}" autocomplete="off"></label>
      <div class="chips" role="tablist">
        ${cats.map((c) => `<button class="chip ${c === state.libCat ? 'on' : ''}" data-action="lib-cat" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <button class="card tap row" data-go="#/surah/${last.id}" style="gap:14px; text-align:left; width:100%">
        <div class="surah-no" style="background: var(--brass-tint); color: var(--brass-deep)">${icon('history', 'icon-sm')}</div>
        <div class="grow">
          <div class="muted tiny">যেখানে ছিলেন</div>
          <div class="surah-name">${esc(last.nameBangla)}</div>
        </div>
        ${icon('chev', 'muted')}
      </button>
      <div id="lib-list" class="stack" style="margin-top: 4px;">${surahRows(list)}</div>
    </section>`;
};

// ── জিকির ─────────────────────────────────────────────────────────────

const RING_R = 112;
const RING_C = 2 * Math.PI * RING_R;

VIEWS.dhikr = async (r, view) => {
  const d = (state.dhikr = await get('/api/tasbeeh'));
  const cur = d.dhikr[state.dhikrIdx] ?? d.dhikr[0];
  const inRound = cur.count % cur.target;
  const rounds = Math.floor(cur.count / cur.target);
  const offset = RING_C * (1 - inRound / cur.target);

  view.innerHTML = `
    <section class="dark-page">
      <div class="row">
        <div class="grow">
          <div class="dark-title">জিকির</div>
          <div class="dark-sub">আজ ${bn(d.todayTotal)} · সর্বমোট ${bn(d.lifetime)}</div>
        </div>
        <button class="icon-btn" data-action="dhikr-history" aria-label="হিসাব">${icon('history')}</button>
      </div>

      <div class="chips" style="margin-top: 20px;">
        ${d.dhikr.map((x, i) => `<button class="chip-dark ${i === state.dhikrIdx ? 'on' : ''}" data-action="dhikr-select" data-idx="${i}">${x.bangla}</button>`).join('')}
      </div>

      <div class="arabic-big">${cur.arabic}</div>
      <div class="dhikr-meaning">${cur.meaning}</div>

      <div class="counter-wrap">
        <div class="counter" data-action="dhikr-tap" role="button" tabindex="0" aria-label="গণনা বাড়ান">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle class="track" cx="120" cy="120" r="${RING_R}"></circle>
            <circle class="bar" cx="120" cy="120" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
          </svg>
          <div class="face">
            <div>
              <div class="count">${bn(inRound)}</div>
              <div class="of">${bn(cur.target)}-এর মধ্যে</div>
            </div>
          </div>
        </div>
      </div>

      <p class="dhikr-meaning">বৃত্তে ট্যাপ করুন · পূর্ণ হয়েছে ${bn(rounds)} বার</p>

      <div class="dhikr-actions">
        <button class="btn" data-action="dhikr-reset">${icon('reset', 'icon-sm')} রিসেট</button>
        <button class="btn solid" data-action="dhikr-next">পরবর্তী ${icon('chev', 'icon-sm')}</button>
      </div>

      <div class="dark-card">
        <div class="line"><span>${cur.bangla}</span><b>${bn(cur.count)} বার আজ</b></div>
        <div class="line"><span>আজকের মোট</span><b>${bn(d.todayTotal)}</b></div>
        <div class="line"><span>সর্বমোট</span><b>${bn(d.lifetime)}</b></div>
      </div>
    </section>`;
};

// ── আমার ──────────────────────────────────────────────────────────────

VIEWS.me = async (r, view) => {
  const [p, t] = await Promise.all([get('/api/profile'), state.today ?? refreshToday()]);
  if (!state.calMonth) state.calMonth = { y: p.today.y, m: p.today.month };
  view.innerHTML = `
    <header class="page-head">
      <div class="head-title" style="font-size: 30px; line-height: 1.2;">আমার</div>
      <div class="stat-row">
        <div class="stat gold"><b>${bn(p.streak)}</b><span>দিন স্ট্রিক</span></div>
        <div class="stat"><b>${bn(p.completedDays)}</b><span>পূর্ণ দিন</span></div>
        <div class="stat"><b>${bn(p.totalDays)}</b><span>মোট দিন</span></div>
      </div>
    </header>

    <section class="stack" style="padding: 18px;">
      <article class="card">
        <div id="cal-box">${calendarHtml(p.counts, p.today)}</div>
        <div class="legend">
          <span><i style="background: var(--partial)"></i>আংশিক</span>
          <span><i style="background: #5E9C80"></i>দুইটি</span>
          <span><i style="background: var(--emerald-deep)"></i>পূর্ণ</span>
        </div>
      </article>

      <div class="menu-group">
        <button class="menu-item" data-go="#/sadaqah">
          <span class="menu-ico gold">🤲</span>
          <span class="grow"><span class="menu-title" style="display:block">সদকা ও দান</span><span class="menu-sub">এ মাসে ${money(p.sadaqahGiven)} / ${money(p.sadaqahTarget)}</span></span>
          ${icon('chev', 'menu-chev')}
        </button>
        <button class="menu-item" data-go="#/jumma">
          <span class="menu-ico">🕌</span>
          <span class="grow"><span class="menu-title" style="display:block">জুমার দিন</span><span class="menu-sub">${t.jumma.enabled ? 'পরবর্তী জুমা: ' + p.jummaRemaining : 'জুমার অ্যালার্ম বন্ধ'}</span></span>
          ${icon('chev', 'menu-chev')}
        </button>
        <button class="menu-item" data-go="#/amal">
          <span class="menu-ico">${icon('calendar')}</span>
          <span class="grow"><span class="menu-title" style="display:block">আজকের আমল</span><span class="menu-sub">${bn(t.doneCount)} / ${bn(t.total)} সম্পন্ন</span></span>
          ${icon('chev', 'menu-chev')}
        </button>
        <button class="menu-item" data-go="#/settings">
          <span class="menu-ico">${icon('bell')}</span>
          <span class="grow"><span class="menu-title" style="display:block">অনুস্মারক ও সেটিংস</span><span class="menu-sub">সময়, অ্যালার্ট ও নোটিফিকেশন</span></span>
          ${icon('chev', 'menu-chev')}
        </button>
      </div>
    </section>`;
};

function calendarHtml(counts, today) {
  const { y, m } = state.calMonth;
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const todayIso = today.iso;
  const wd = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<div class="cal-cell blank"></div>');
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${pad2(m + 1)}-${pad2(d)}`;
    const c = counts[iso] ?? 0;
    cells.push(`<div class="cal-cell ${c ? 'p' + c : ''} ${iso === todayIso ? 'today' : ''}">${bn(d)}</div>`);
  }
  return `
    <div class="cal-head">
      <button class="cal-nav" data-action="cal-prev" aria-label="আগের মাস">${icon('back', 'icon-sm')}</button>
      <div class="card-title">${BN_MONTHS[m]} ${bn(y)}</div>
      <button class="cal-nav" data-action="cal-next" aria-label="পরের মাস">${icon('chev', 'icon-sm')}</button>
    </div>
    <div class="cal-grid">
      ${wd.map((w) => `<div class="cal-wd">${w}</div>`).join('')}
      ${cells.join('')}
    </div>`;
}

// ── সদকা ──────────────────────────────────────────────────────────────

VIEWS.sadaqah = async (r, view) => {
  const s = await get('/api/sadaqah');
  const pct = Math.min(100, s.target ? (s.monthTotal / s.target) * 100 : 0);
  const maxBar = Math.max(1, ...s.lastMonths.map((m) => m.total));

  view.innerHTML = `
    ${subHead('সদকা ও দান', 'মাসিক হিসাব', '#/me')}
    <section class="stack" style="padding: 18px;">
      <article class="card brass">
        <div class="muted small">এ মাসের দান</div>
        <div class="display" style="font-size: 32px; margin-top: 4px; font-variant-numeric: tabular-nums;">${money(s.monthTotal)} <span class="small muted" style="font-family: var(--font-body); font-weight: 400;">/ ${money(s.target)}</span></div>
        <div class="progress-bar"><i style="width: ${pct.toFixed(1)}%"></i></div>
        <div class="row between small muted" style="margin-top: 8px;"><span>${bn(Math.round(pct))}% পূর্ণ</span><span>${s.monthTotal >= s.target ? 'লক্ষ্য পূরণ হয়েছে 🎉' : money(Math.max(0, s.target - s.monthTotal)) + ' বাকি'}</span></div>
        <button class="btn btn-primary btn-block" style="margin-top: 16px;" data-action="sadaqah-add">${icon('tune', 'icon-sm')} দান যোগ করুন</button>
      </article>

      <div class="mini-stats">
        <div class="mini-stat"><b>${money(s.lifetime)}</b><span>সর্বমোট</span></div>
        <div class="mini-stat"><b>${bn(s.monthsGiven)}</b><span>যেসব মাসে দান</span></div>
        <div class="mini-stat"><b>${bn(s.entries.length)}</b><span>মোট হিসাব</span></div>
      </div>

      <div class="menu-group">
        <div class="setting-row">
          <div class="grow"><div class="setting-title">মাসিক লক্ষ্য</div><div class="setting-sub">প্রতি মাসে কত টাকা দিতে চান</div></div>
          <select class="input" style="width: auto; height: 40px; padding: 0 10px;" data-action="sadaqah-target">
            ${s.targetOptions.map((o) => `<option value="${o}" ${o === s.target ? 'selected' : ''}>${money(o)}</option>`).join('')}
          </select>
        </div>
        <div class="setting-row">
          <div class="grow"><div class="setting-title">মাসিক অনুস্মারক</div><div class="setting-sub">প্রতি মাসের ১ তারিখে দানের কথা মনে করিয়ে দেবে</div></div>
          <label class="switch"><input type="checkbox" data-setting="sadaqahReminder" ${s.reminder ? 'checked' : ''}><span></span></label>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom: 8px;">শেষ ৬ মাস</div>
        <div class="bars">
          ${[...s.lastMonths].reverse().map((m) => `
            <div>
              <i class="${m.total > 0 ? 'hit' : ''}" style="height: ${Math.max(6, (m.total / maxBar) * 100)}%"></i>
              <span>${bn(Number(m.prefix.slice(5)))}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="guide">
        <b class="card-title" style="display:block; font-size:15px; margin-bottom:6px;">✦ দানের ফযীলত</b>
        “সদকা কখনো সম্পদ কমায় না।” — (মুসলিম ২৫৮৮)<br>
        ইসলামি নিয়ম: ডান হাতে দিলে বাম হাত যেন না জানে — গোপনে দান করা উত্তম।
      </div>

      <div>
        <div class="h-section" style="margin: 6px 4px 6px;">দানের ইতিহাস</div>
        <div class="card" style="padding: 6px 18px;">
          ${s.entries.length ? s.entries.map((e) => `
            <div class="entry">
              <div>
                <div class="entry-amt">${money(e.amount)}</div>
                <div class="entry-date">${bnDate(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div>
              </div>
              <button class="entry-del" data-action="sadaqah-del" data-id="${e.id}" aria-label="মুছুন">${icon('trash', 'icon-sm')}</button>
            </div>`).join('') : '<div class="empty">এখনো কোনো দান যোগ করা হয়নি</div>'}
        </div>
      </div>
    </section>`;
};

// ── জুমা ──────────────────────────────────────────────────────────────

const JUMMA_TASKS = [
  { key: 'gosol', emoji: '🚿', title: 'গোসল করা', detail: 'জুমার দিন গোসল করা সুন্নাত' },
  { key: 'pak', emoji: '👕', title: 'পরিষ্কার পোশাক', detail: 'সবচেয়ে সুন্দর ও পরিচ্ছন্ন কাপড় পরুন' },
  { key: 'attar', emoji: '🌸', title: 'সুগন্ধি ব্যবহার', detail: 'মিসওয়াক ও সুগন্ধি ব্যবহার করুন' },
  { key: 'early', emoji: '🕌', title: 'আগেভাগে মসজিদে যাওয়া', detail: 'আগে গেলে বেশি সওয়াব' },
  { key: 'kahf', emoji: '📖', title: 'সূরা কাহফ পড়া', detail: 'দুই জুমার মাঝে আলো হয়ে থাকে' },
  { key: 'durud', emoji: '🌿', title: 'বেশি বেশি দরুদ', detail: 'এ দিনে দরুদ পেশ করা হয়' },
  { key: 'dua', emoji: '🤲', title: 'দোয়া কবুলের সময়', detail: 'আসরের পর থেকে মাগরিব পর্যন্ত দোয়া করুন' }
];

VIEWS.jumma = async (r, view) => {
  const t = await refreshToday();
  const j = t.jumma;
  const mins = Math.max(0, j.minutesUntil);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;

  view.innerHTML = `
    <header class="page-head">
      <div class="head-bar">
        <button class="icon-btn" data-go="#/today" aria-label="পেছনে">${icon('back')}</button>
        <div class="head-title">জুমার দিন<small>সপ্তাহের শ্রেষ্ঠ দিন</small></div>
      </div>
      <div class="small" style="color: var(--cream-muted); margin-top: 16px;">${j.isFriday ? 'আজ জুমাবার' : 'পরবর্তী জুমা'}</div>
      <div class="countdown">
        <div class="stat"><b>${bn(days)}</b><span>দিন</span></div>
        <div class="stat"><b>${bn(pad2(hours))}</b><span>ঘণ্টা</span></div>
        <div class="stat"><b>${bn(pad2(minutes))}</b><span>মিনিট</span></div>
      </div>
      <div class="small" style="color: var(--cream-muted); margin-top: 12px;">অ্যালার্ম ${j.timeLabel} — জুমার নামাজের আগে</div>
    </header>

    <section class="stack" style="padding: 18px;">
      <article class="card">
        <div class="row gap-14">
          <span class="menu-ico">${icon('alarm')}</span>
          <div class="grow">
            <div class="card-title">সাপ্তাহিক জুমা অ্যালার্ম</div>
            <div class="small" style="color: ${j.enabled ? 'var(--emerald)' : 'var(--muted)'}">${j.enabled ? `প্রতি শুক্রবার ${j.timeLabel}-এ ডাকবে` : 'বন্ধ আছে'}</div>
          </div>
          <label class="switch"><input type="checkbox" data-setting="jummaEnabled" ${j.enabled ? 'checked' : ''}><span></span></label>
        </div>
        <div class="btn-row" style="margin-top: 14px;">
          <button class="btn btn-soft" data-action="jumma-time">সময় বদলান</button>
          <button class="btn btn-ghost" data-action="jumma-preview">অ্যালার্ট দেখুন</button>
        </div>
      </article>

      ${j.isFriday ? `
        <button class="done-banner ${j.done ? 'on' : ''}" data-action="jumma-done" data-done="${j.done ? 0 : 1}">
          ${icon(j.done ? 'check' : 'mosque', 'icon-lg')}
          <span class="grow">
            <b>${j.done ? 'আলহামদুলিল্লাহ — জুমা আদায় হয়েছে' : 'জুমার নামাজ পড়েছেন?'}</b>
            <small>${j.done ? 'ট্যাপ করে বাতিল করতে পারেন' : 'ট্যাপ করে চিহ্নিত করুন'}</small>
          </span>
        </button>` : ''}

      <div class="h-section">জুমার প্রস্তুতি</div>
      <div class="checklist">
        ${JUMMA_TASKS.map((x) => {
          const on = !!j.checks[x.key];
          return `
          <button class="check-item ${on ? 'on' : ''}" data-action="jumma-check" data-key="${x.key}" data-done="${on ? 0 : 1}">
            <span class="em">${x.emoji}</span>
            <span class="grow"><b>${x.title}</b><small>${x.detail}</small></span>
            <span class="box">${on ? icon('check', 'icon-sm') : ''}</span>
          </button>`;
        }).join('')}
      </div>
    </section>`;
};

// ── সেটিংস ────────────────────────────────────────────────────────────

function pushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return ios ? 'ios-install' : 'unsupported';
  }
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) return 'ios-install';
  if (Notification.permission === 'denied') return 'denied';
  return window.__pushOn ? 'on' : 'off';
}

VIEWS.settings = async (r, view) => {
  const [t, sessionsRes] = await Promise.all([refreshToday(), get('/api/settings')]);
  const s = t.settings;
  const nag = s.nagMinutes;
  const status = pushStatus();
  const statusText = {
    on: 'চালু আছে — অ্যাপ বন্ধ থাকলেও ডাকবে',
    off: 'বন্ধ — চালু করলে অ্যাপ বন্ধ থাকলেও ডাকবে',
    denied: 'ব্রাউজারে নোটিফিকেশন বন্ধ করা আছে। ব্রাউজারের সেটিংস থেকে অনুমতি দিন।',
    'ios-install': 'আইফোনে: Safari-তে “Share → Add to Home Screen” করে অ্যাপটি হোম স্ক্রিন থেকে খুলুন, তারপর চালু করুন।',
    unsupported: 'এই ব্রাউজারে ব্যাকগ্রাউন্ড নোটিফিকেশন সাপোর্ট নেই।'
  }[status];

  view.innerHTML = `
    ${subHead('সেটিংস', 'অনুস্মারক ও অ্যাপ', '#/today')}
    <section class="stack" style="padding: 18px;">
      <div class="section-label" style="margin-top: 0">অনুস্মারক</div>
      <div class="menu-group">
        <div class="setting-row">
          <div class="grow"><div class="setting-title">অনুস্মারক</div><div class="setting-sub">নির্ধারিত সময়ে আমলের ডাক</div></div>
          <label class="switch"><input type="checkbox" data-setting="enabled" ${s.enabled ? 'checked' : ''}><span></span></label>
        </div>
        <div class="setting-row">
          <div class="grow"><div class="setting-title">পূর্ণ-স্ক্রিন অ্যালার্ট</div><div class="setting-sub">অ্যাপ খোলা থাকলে কলের মতো স্ক্রিনে ডাকবে</div></div>
          <label class="switch"><input type="checkbox" data-setting="forceAlert" ${s.forceAlert ? 'checked' : ''}><span></span></label>
        </div>
        <div class="setting-row">
          <div class="grow"><div class="setting-title">বাংলা ভয়েসে ডাকবে</div><div class="setting-sub">ব্রাউজারের বাংলা ভয়েস থাকলে শোনা যাবে</div></div>
          <label class="switch"><input type="checkbox" data-setting="voice" ${s.voice ? 'checked' : ''}><span></span></label>
        </div>
        <div class="setting-row">
          <div class="grow"><div class="setting-title">না পড়লে আবার ডাকবে</div><div class="setting-sub">প্রতি ${bn(nag)} মিনিট পরপর</div></div>
          <div class="seg" role="radiogroup">
            ${[15, 30, 45, 60].map((m) => `<button class="${m === nag ? 'on' : ''}" data-action="nag" data-min="${m}">${bn(m)}মি</button>`).join('')}
          </div>
        </div>
        <div class="setting-row">
          <div class="grow"><div class="setting-title">অ্যাপ খুললে জিজ্ঞেস করবে</div><div class="setting-sub">সময় পেরিয়ে গেলে “পড়েছেন?” প্রশ্ন</div></div>
          <label class="switch"><input type="checkbox" data-setting="askOnOpen" ${s.askOnOpen ? 'checked' : ''}><span></span></label>
        </div>
      </div>

      <div class="section-label">সেশনের সময়</div>
      <div class="menu-group">
        ${sessionsRes.sessions.map((x) => {
          const meta = t.sessions.find((y) => y.key === x.key);
          const hh = pad2(x.hour), mm = pad2(x.minute);
          return `
          <div class="setting-row">
            <div class="grow"><div class="setting-title">${meta.emoji} ${meta.label}ের সময়</div><div class="setting-sub">${meta.timeLabel}</div></div>
            <input class="time-input" type="time" value="${hh}:${mm}" data-session-time="${x.key}" style="width: 130px; height: 42px;">
          </div>`;
        }).join('')}
      </div>

      <div class="section-label">জুমা</div>
      <div class="menu-group">
        <button class="menu-item" data-go="#/jumma">
          <span class="menu-ico gold">🕌</span>
          <span class="grow"><span class="menu-title" style="display:block">জুমার অ্যালার্ম</span><span class="menu-sub">${s.jumma.enabled ? 'প্রতি শুক্রবার ' + t.jumma.timeLabel : 'বন্ধ আছে'}</span></span>
          ${icon('chev', 'menu-chev')}
        </button>
      </div>

      <div class="section-label">ব্যাকগ্রাউন্ড নোটিফিকেশন</div>
      <div class="card">
        <div class="setting-title" style="margin-bottom: 4px;">${status === 'on' ? 'নোটিফিকেশন চালু' : 'নোটিফিকেশন বন্ধ'}</div>
        <div class="small muted" style="line-height:1.7">${statusText}</div>
        <div class="btn-row" style="margin-top: 14px;">
          ${status === 'off' ? '<button class="btn btn-primary" data-action="push-on">চালু করুন</button>' : ''}
          ${status === 'on' ? '<button class="btn btn-soft" data-action="push-test">পরীক্ষা করুন</button><button class="btn btn-ghost" data-action="push-off">বন্ধ করুন</button>' : ''}
        </div>
      </div>

      <div class="section-label">অ্যাপ</div>
      <div class="menu-group">
        <button class="menu-item" data-action="alert-preview">
          <span class="menu-ico">${icon('bell')}</span>
          <span class="grow"><span class="menu-title" style="display:block">অ্যালার্ট পরীক্ষা করুন</span><span class="menu-sub">এখনই পূর্ণ-স্ক্রিন অ্যালার্টটি দেখুন</span></span>
        </button>
        <button class="menu-item" data-action="install-help">
          <span class="menu-ico">${icon('share')}</span>
          <span class="grow"><span class="menu-title" style="display:block">ফোনে অ্যাপ হিসেবে যোগ করুন</span><span class="menu-sub">Android: মেনু → Install app · iPhone: Share → Add to Home Screen</span></span>
        </button>
        <button class="menu-item" data-action="share-app">
          <span class="menu-ico">${icon('share')}</span>
          <span class="grow"><span class="menu-title" style="display:block">অ্যাপ শেয়ার করুন</span><span class="menu-sub">বন্ধু-বান্ধবের সাথে শেয়ার করুন</span></span>
        </button>
        <div class="menu-item">
          <span class="menu-ico">${icon('info')}</span>
          <span class="grow"><span class="menu-title" style="display:block">আমল</span><span class="menu-sub">দৈনিক কুরআন তিলাওয়াতের সঙ্গী · সংস্করণ ২.০</span></span>
        </div>
      </div>
    </section>`;
};

// ── পড়ার পাতা ───────────────────────────────────────────────────────

VIEWS.surah = async (r, view) => {
  const [list, t] = await Promise.all([loadSurahs(), state.today ?? refreshToday()]);
  const id = Number(r.id);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) {
    location.hash = '#/library';
    return;
  }
  const s = list[idx];
  const prev = list[idx - 1];
  const next = list[idx + 1];
  post('/api/last-read', { surahId: s.id }).catch(() => {});

  const active = t.sessions.find((x) => x.key === t.activeKey);
  const showMark = active && !active.isRead;
  const showDone = active && active.isRead;
  const bismillah = s.showBismillah !== false;

  view.innerHTML = `
    <div class="reader-top">
      <div class="head-bar">
        <button class="icon-btn" data-go="#/library" aria-label="ফিরে যান">${icon('back')}</button>
        <div class="head-title grow" style="min-width:0">
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(s.nameBangla)}</div>
          <small>${bn(s.ayahCount)} আয়াত · ${s.type}</small>
        </div>
        <button class="icon-btn" data-action="size-toggle" aria-label="লেখার আকার">${state.sizeOpen ? icon('x') : icon('type')}</button>
        <button class="icon-btn" data-action="share-surah" data-id="${s.id}" aria-label="শেয়ার">${icon('share')}</button>
      </div>
      ${state.sizeOpen ? `
        <div class="size-bar">
          <span>আরবি লেখার আকার</span>
          <button class="btn btn-soft btn-sm" data-action="size" data-delta="-2">A−</button>
          <button class="btn btn-soft btn-sm" data-action="size" data-delta="2">A+</button>
        </div>` : ''}
    </div>

    <article class="reader" style="--ar-size: ${state.arabicSize}px">
      ${bismillah ? `
        <div class="bismillah">
          <div class="ar">${esc(state.bismillah)}</div>
          <div class="bn">বিসমিল্লাহির রাহমানির রাহীম — পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে</div>
        </div>` : ''}

      ${s.ayahs.map((a, i) => `
        <section class="ayah">
          <div class="row between">
            <span class="ayah-num">${bn(i + 1)}</span>
            <span class="tiny muted">${s.nameBangla}</span>
          </div>
          <p class="ayah-arabic">${esc(a.arabic)}</p>
          <div class="ayah-part"><div class="lbl">উচ্চারণ</div><p>${esc(a.ucchaaron)}</p></div>
          <div class="ayah-part"><div class="lbl">অর্থ</div><p>${esc(a.ortho)}</p></div>
          ${a.beyakkha ? `<div class="ayah-part ex"><div class="lbl">ব্যাখ্যা</div><p>${esc(a.beyakkha)}</p></div>` : ''}
        </section>`).join('')}

      <section class="fazilat">
        <b>ফযীলত ও তাৎপর্য</b>
        <p>${esc(s.fazilat)}</p>
      </section>

      ${showMark ? `
        <div class="mark-bar">
          <div class="grow">
            <small>${active.label}ের আমল</small>
            <b>পড়া শেষ হয়েছে?</b>
          </div>
          <button class="btn btn-brass" data-action="mark" data-key="${active.key}" data-read="1">চিহ্নিত করুন</button>
        </div>` : ''}
      ${showDone ? `<div class="done-card">${icon('check')} মাশাআল্লাহ! আজকের এই আমল সম্পন্ন হয়েছে।</div>` : ''}

      <div class="nav-row">
        <button class="nav-card" ${prev ? `data-go="#/surah/${prev.id}"` : 'disabled'}>
          <small>← আগের</small><b>${prev ? esc(prev.nameBangla) : '—'}</b>
        </button>
        <button class="nav-card next" ${next ? `data-go="#/surah/${next.id}"` : 'disabled'}>
          <small>পরের →</small><b>${next ? esc(next.nameBangla) : '—'}</b>
        </button>
      </div>
    </article>`;
};

// ── ওভারলে: অ্যালার্ট, প্রশ্ন, দান ───────────────────────────────────

const overlayRoot = () => $('#overlay-root');
const overlayOpen = () => overlayRoot().childElementCount > 0;
const closeOverlay = () => { overlayRoot().innerHTML = ''; stopAlertFx(); };

const alertFx = { voice: null, vib: null, beep: null, audio: null };

function stopAlertFx() {
  clearInterval(alertFx.voice);
  clearInterval(alertFx.vib);
  clearInterval(alertFx.beep);
  alertFx.voice = alertFx.vib = alertFx.beep = null;
  try { speechSynthesis.cancel(); } catch {}
  try { navigator.vibrate?.(0); } catch {}
}

function speak(text) {
  if (!('speechSynthesis' in window) || !state.settings?.voice) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'bn-BD';
    u.rate = 0.95;
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('bn'));
    if (voice) u.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {}
}

function beepOnce() {
  try {
    alertFx.audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = alertFx.audio;
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.65);
  } catch {}
}

function startAlertFx(message) {
  stopAlertFx();
  speak(message);
  alertFx.voice = setInterval(() => speak(message), 14000);
  try { navigator.vibrate?.([500, 250, 500, 250, 500]); } catch {}
  alertFx.vib = setInterval(() => { try { navigator.vibrate?.([500, 250, 500]); } catch {} }, 3000);
  beepOnce();
  alertFx.beep = setInterval(beepOnce, 2400);
}

function showSessionAlert(s, { preview = false } = {}) {
  const t = state.today;
  const msg = `আসসালামু আলাইকুম। ${s.label}ের দোয়া পড়ার সময় হয়েছে। এখনই পড়ে নিন।`;
  overlayRoot().innerHTML = `
    <div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title">
      <div class="kick">আমল · তিলাওয়াতের ডাক</div>
      <div class="now">${t.date.clock}</div>
      <div class="ripple-wrap">
        <span class="ripple"></span><span class="ripple r2"></span><span class="ripple r3"></span>
        <div class="ripple-core">${s.emoji}</div>
      </div>
      <div>
        <div class="kick">এখন ডাকছে</div>
        <h2 id="alert-title">${s.label}ের তিলাওয়াত</h2>
        <p class="line">${msg}</p>
        <p class="note">সাড়া না দিলে ${bn(30)} মিনিট পর আবার ডাকবে</p>
      </div>
      <div class="actions">
        ${preview ? '<button class="btn btn-brass" data-action="alert-close">বন্ধ করুন</button>' : `
        <button class="btn btn-brass" data-action="alert-read" data-key="${s.key}">${icon('check', 'icon-sm')} আলহামদুলিল্লাহ, পড়ে ফেলেছি</button>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="alert-snooze" data-key="${s.key}">৩০ মিনিট পরে</button>
          <button class="btn btn-ghost" data-action="alert-open">পড়তে শুরু</button>
        </div>`}
      </div>
    </div>`;
  if (!preview) startAlertFx(msg);
  else speak(msg);
}

function showJummaAlert() {
  const msg = 'আসসালামু আলাইকুম। আজ জুমার দিন। জুমার নামাজের সময় হয়ে এসেছে। গোসল করে সুগন্ধি মেখে এখনই মসজিদের দিকে রওনা হন।';
  overlayRoot().innerHTML = `
    <div class="alert" role="alertdialog" aria-modal="true">
      <div class="kick">আমল · জুমার ডাক</div>
      <div class="now">${state.today?.date.clock ?? ''}</div>
      <div class="ripple-wrap">
        <span class="ripple"></span><span class="ripple r2"></span><span class="ripple r3"></span>
        <div class="ripple-core">🕌</div>
      </div>
      <div>
        <div class="kick">এখন ডাকছে</div>
        <h2>জুমার ডাক</h2>
        <p class="line">${msg}</p>
      </div>
      <div class="actions">
        <button class="btn btn-brass" data-action="jumma-ack">আলহামদুলিল্লাহ, প্রস্তুত</button>
        <button class="btn btn-ghost" data-action="alert-close">বন্ধ করুন</button>
      </div>
    </div>`;
  startAlertFx(msg);
}

/** সেশনের সময় এলে, পড়া না হলে — পূর্ণ স্ক্রিন অ্যালার্ট (শুধু অ্যাপ খোলা থাকলে) */
function checkAlerts() {
  const t = state.today;
  if (!t || !t.settings.enabled || !t.settings.forceAlert) return;
  if (document.visibilityState !== 'visible' || overlayOpen()) return;
  if (!t.activeKey) return;
  const s = t.sessions.find((x) => x.key === t.activeKey);
  if (!s || s.isRead) return;
  const now = Date.now();
  if (snoozedUntil[s.key] && now < snoozedUntil[s.key]) return;
  const last = shownAt[s.key] ?? 0;
  if (last && now - last < t.settings.nagMinutes * 60000) return;
  shownAt[s.key] = now;
  showSessionAlert(s);
}

/** অ্যাপ খোলার পর: সময় পেরিয়েছে অথচ পড়া হয়নি — জিজ্ঞেস করা */
function maybeAskOnOpen() {
  if (overlayOpen()) return;
  const t = state.today;
  if (!t?.pending?.length) return;
  const s = t.sessions.find((x) => x.key === t.pending[0]);
  overlayRoot().innerHTML = `
    <div class="scrim">
      <div class="dialog" role="dialog" aria-modal="true">
        <div class="kick go" style="color: var(--emerald); font-size: 11.5px; letter-spacing: 1.4px; font-weight:700">আমল · ${s.label}ের তিলাওয়াত</div>
        <h3 style="margin-top: 8px;">সময় ছিল ${s.timeLabel}</h3>
        <p>সত্যি করে বলুন — আজ ${s.label}ের সূরা ও দোয়া কি পড়া হয়েছে?</p>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="ask-no" data-key="${s.key}">না, এখনই পড়ব</button>
          <button class="btn btn-primary" data-action="ask-yes" data-key="${s.key}">${icon('check', 'icon-sm')} হ্যাঁ, পড়েছি</button>
        </div>
        <button class="later-link" data-action="close-overlay">পরে জিজ্ঞেস করবেন</button>
      </div>
    </div>`;
}

function openAddSadaqahSheet() {
  overlayRoot().innerHTML = `
    <div class="scrim sheet-scrim" data-dismiss>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="grab"></div>
        <div class="card-title" style="font-size:19px">কত টাকা দান করেছেন?</div>
        <div class="small muted" style="margin-top:4px">আল্লাহ আপনার দান কবুল করুন</div>
        <div class="field" style="margin-top: 14px;">
          <div class="input-wrap"><b>৳</b><input id="add-amount" class="input" type="number" inputmode="numeric" min="1" placeholder="০"></div>
        </div>
        <div class="small muted" style="margin: 14px 0 6px">দ্রুত নির্বাচন</div>
        <div class="amount-grid">
          ${[100, 200, 500, 1000, 2000, 5000].map((q) => `<button data-action="sadaqah-quick-add" data-amount="${q}">${money(q)}</button>`).join('')}
        </div>
        <div class="field" style="margin-top: 14px;">
          <label for="add-note">নোট (ঐচ্ছিক)</label>
          <input id="add-note" class="input" maxlength="200" placeholder="যেমন: মসজিদের জন্য">
        </div>
        <div class="btn-row" style="margin-top: 16px;">
          <button class="btn btn-ghost" data-action="close-overlay">বাতিল</button>
          <button class="btn btn-primary" data-action="sadaqah-save">সংরক্ষণ</button>
        </div>
      </div>
    </div>`;
  setTimeout(() => $('#add-amount')?.focus(), 80);
}

function openTimeDialog(title, hour, minute, onSave) {
  overlayRoot().innerHTML = `
    <div class="scrim">
      <div class="dialog" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <div class="field" style="margin-top: 14px;">
          <label for="time-val">সময় নির্বাচন করুন</label>
          <input id="time-val" class="time-input" type="time" value="${pad2(hour)}:${pad2(minute)}">
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="close-overlay">বাতিল</button>
          <button class="btn btn-primary" data-action="time-save">সংরক্ষণ</button>
        </div>
      </div>
    </div>`;
  overlayRoot()._onTime = onSave;
}

// ── অ্যাকশন হ্যান্ডলার ─────────────────────────────────────────────────

async function setSessionRead(key, value) {
  state.today = await post(`/api/sessions/${key}`, { read: value });
  state.settings = state.today.settings;
  if (value) {
    delete shownAt[key];
    closeOverlay();
    toast('আলহামদুলিল্লাহ — আমল সম্পন্ন');
  }
  return state.today;
}

async function openLastRead() {
  const t = await refreshToday();
  closeOverlay();
  location.hash = `#/surah/${t.lastRead.id}`;
}

async function afterAction(redraw = true) {
  await refreshToday();
  if (redraw) render();
}

const actions = {
  noop: () => {},
  reload: () => render(),
  'read-last': () => openLastRead(),
  mark: async (el) => {
    const read = el.dataset.read === '1';
    await setSessionRead(el.dataset.key, read);
    render();
  },
  'ask-yes': async (el) => {
    closeOverlay();
    await setSessionRead(el.dataset.key, true);
    maybeAskOnOpen();
    render();
  },
  'ask-no': async () => {
    closeOverlay();
    await openLastRead();
  },
  'alert-read': async (el) => {
    await setSessionRead(el.dataset.key, true);
    render();
  },
  'alert-snooze': (el) => {
    snoozedUntil[el.dataset.key] = Date.now() + 30 * 60000;
    closeOverlay();
    toast('৩০ মিনিট পরে আবার মনে করিয়ে দেবে');
  },
  'alert-open': async () => {
    closeOverlay();
    await openLastRead();
  },
  'alert-close': () => closeOverlay(),
  'alert-preview': () => {
    const s = state.today?.sessions.find((x) => x.key === state.today.focusKey) ?? state.today.sessions[0];
    showSessionAlert(s, { preview: true });
  },
  'jumma-preview': () => showJummaAlert(),
  'jumma-ack': () => closeOverlay(),
  'close-overlay': () => closeOverlay(),
  'edit-time': (el) => {
    const s = state.today.sessions.find((x) => x.key === el.dataset.key);
    openTimeDialog(`${s.label}ের সময়`, s.hour, s.minute, async (hh, mm) => {
      state.today = await put(`/api/sessions/${s.key}/time`, { hour: hh, minute: mm });
      closeOverlay();
      render();
    });
  },
  'time-save': () => {
    const v = $('#time-val')?.value;
    if (!v) return;
    const [hh, mm] = v.split(':').map(Number);
    overlayRoot()._onTime?.(hh, mm);
  },
  'lib-cat': (el) => {
    state.libCat = el.dataset.cat;
    document.querySelectorAll('[data-action="lib-cat"]').forEach((b) => b.classList.toggle('on', b === el));
    loadSurahs().then((list) => { $('#lib-list').innerHTML = surahRows(list); });
  },
  'dhikr-select': (el) => {
    state.dhikrIdx = Number(el.dataset.idx);
    render();
  },
  'dhikr-tap': async () => {
    navigator.vibrate?.(10);
    const cur = state.dhikr.dhikr[state.dhikrIdx];
    const el = document.querySelector('.counter');
    el?.classList.remove('bump');
    void el?.offsetWidth;
    el?.classList.add('bump');
    state.dhikr = await post('/api/tasbeeh', { key: cur.key, action: 'tap' });
    render();
  },
  'dhikr-reset': async () => {
    const cur = state.dhikr.dhikr[state.dhikrIdx];
    state.dhikr = await post('/api/tasbeeh', { key: cur.key, action: 'reset' });
    render();
  },
  'dhikr-next': () => {
    state.dhikrIdx = (state.dhikrIdx + 1) % state.dhikr.dhikr.length;
    render();
  },
  'dhikr-history': () => {
    const d = state.dhikr;
    overlayRoot().innerHTML = `
      <div class="scrim sheet-scrim" data-dismiss>
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="grab"></div>
          <div class="card-title" style="font-size:19px">আজকের জিকির</div>
          <div style="margin-top: 10px;">
            ${d.dhikr.map((x) => `<div class="entry"><div class="grow"><div class="rhythm-name">${x.bangla}</div><div class="entry-date">লক্ষ্য ${bn(x.target)} · ${x.meaning}</div></div><div class="entry-amt">${bn(x.count)}</div></div>`).join('')}
          </div>
          <div class="small muted" style="margin-top: 12px;">আজ মোট ${bn(d.todayTotal)} · সর্বমোট ${bn(d.lifetime)}</div>
          <button class="btn btn-soft btn-block" style="margin-top: 14px;" data-action="close-overlay">বন্ধ করুন</button>
        </div>
      </div>`;
  },
  'cal-prev': () => {
    const c = state.calMonth;
    state.calMonth = c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 };
    refreshCalendar();
  },
  'cal-next': () => {
    const c = state.calMonth;
    state.calMonth = c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 };
    refreshCalendar();
  },
  'sadaqah-add': () => openAddSadaqahSheet(),
  'sadaqah-quick-add': (el) => { $('#add-amount').value = el.dataset.amount; },
  'sadaqah-save': async () => {
    const amount = Number($('#add-amount').value);
    if (!amount || amount < 1) return toast('টাকার পরিমাণ লিখুন');
    await post('/api/sadaqah', { amount, note: $('#add-note').value });
    closeOverlay();
    toast('দান সংরক্ষিত হয়েছে');
    render();
  },
  'sadaqah-del': async (el) => {
    if (!confirm('এই দানের হিসাব মুছে ফেলবেন?')) return;
    await del(`/api/sadaqah/${el.dataset.id}`);
    render();
  },
  'jumma-done': async (el) => {
    state.today = await post('/api/jumma/done', { done: el.dataset.done === '1' });
    render();
  },
  'jumma-check': async (el) => {
    state.today = await post('/api/jumma/check', { key: el.dataset.key, done: el.dataset.done === '1' });
    render();
  },
  'jumma-time': () => {
    const j = state.today.jumma;
    openTimeDialog('জুমার অ্যালার্মের সময়', j.hour, j.minute, async (hh, mm) => {
      await patch('/api/settings', { jumma: { hour: hh, minute: mm } });
      closeOverlay();
      render();
    });
  },
  nag: async (el) => {
    await patch('/api/settings', { nagMinutes: Number(el.dataset.min) });
    render();
  },
  'size-toggle': () => {
    state.sizeOpen = !state.sizeOpen;
    render();
  },
  size: (el) => {
    state.arabicSize = Math.min(44, Math.max(18, state.arabicSize + Number(el.dataset.delta)));
    document.querySelector('.reader')?.style.setProperty('--ar-size', state.arabicSize + 'px');
  },
  'share-surah': async (el) => {
    const s = (await loadSurahs()).find((x) => x.id === Number(el.dataset.id));
    const text = `${s.nameBangla} — ${s.subtitle}\n${s.meaning}`;
    try {
      if (navigator.share) await navigator.share({ title: s.nameBangla, text, url: location.origin });
      else {
        await navigator.clipboard.writeText(text);
        toast('লেখা কপি হয়েছে');
      }
    } catch {}
  },
  'share-app': async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'আমল', text: 'দৈনিক কুরআন তিলাওয়াতের সঙ্গী', url: location.origin });
      else {
        await navigator.clipboard.writeText(location.origin);
        toast('লিংক কপি হয়েছে');
      }
    } catch {}
  },
  'install-help': () => {
    overlayRoot().innerHTML = `
      <div class="scrim" data-dismiss>
        <div class="dialog" role="dialog" aria-modal="true">
          <h3>ফোনে অ্যাপ হিসেবে যোগ করুন</h3>
          <p><b>Android (Chrome):</b> মেনু (⋮) → “Install app” বা “Add to Home screen”।<br><br>
          <b>iPhone (Safari):</b> নিচের Share বাটন → “Add to Home Screen”।<br><br>
          এরপর হোম স্ক্রিনের “আমল” আইকন থেকে খুললে পূর্ণ-স্ক্রিন অ্যাপের মতো চলবে এবং নোটিফিকেশনও আসবে।</p>
          <div class="btn-row"><button class="btn btn-primary" data-action="close-overlay">ঠিক আছে</button></div>
        </div>
      </div>`;
  },
  'push-on': () => enablePush(),
  'push-off': async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await post('/api/push/unsubscribe', { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    window.__pushOn = false;
    toast('নোটিফিকেশন বন্ধ করা হয়েছে');
    render();
  },
  'push-test': async () => {
    await post('/api/push/test');
    toast('পরীক্ষার নোটিফিকেশন পাঠানো হয়েছে');
  }
};

async function enablePush() {
  if (pushStatus() === 'ios-install') return actions['install-help']();
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return toast('এই ব্রাউজারে সাপোর্ট নেই');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('নোটিফিকেশনের অনুমতি দেওয়া হয়নি');
  try {
    const reg = await navigator.serviceWorker.ready;
    const { key } = await get('/api/push/public-key');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) });
    }
    await post('/api/push/subscribe', { subscription: sub.toJSON() });
    window.__pushOn = true;
    toast('নোটিফিকেশন চালু হয়েছে');
    render();
  } catch (err) {
    toast('চালু করা যায়নি: ' + err.message);
  }
}

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function refreshCalendar() {
  const p = await get('/api/profile');
  const box = $('#cal-box');
  if (box) box.innerHTML = calendarHtml(p.counts, p.today);
}

// ── ইভেন্ট ───────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  // পর্দার বাইরে (data-dismiss) ক্লিক করলে শুধু সাধারণ ডায়ালগ/শীট বন্ধ হয়
  if (e.target.matches?.('[data-dismiss]')) {
    closeOverlay();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) {
    e.preventDefault();
    Promise.resolve(actions[el.dataset.action](el)).catch((err) => toast(err.message || 'সমস্যা হয়েছে'));
    return;
  }
  const go = e.target.closest('[data-go]');
  if (go && !go.disabled) {
    location.hash = go.dataset.go;
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'lib-search') {
    state.libQuery = e.target.value;
    loadSurahs().then((list) => { $('#lib-list').innerHTML = surahRows(list); });
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.setting) {
    const body = t.dataset.setting === 'jummaEnabled'
      ? { jumma: { enabled: t.checked } }
      : { [t.dataset.setting]: t.checked };
    await patch('/api/settings', body);
    toast('সংরক্ষিত হয়েছে');
    render();
    return;
  }
  if (t.dataset.sessionTime) {
    const [hh, mm] = t.value.split(':').map(Number);
    state.today = await put(`/api/sessions/${t.dataset.sessionTime}/time`, { hour: hh, minute: mm });
    toast('সময় বদলানো হয়েছে');
    render();
    return;
  }
  if (t.dataset.action === 'sadaqah-target') {
    await put('/api/sadaqah/target', { target: Number(t.value) });
    toast('মাসিক লক্ষ্য বদলানো হয়েছে');
    render();
  }
});

window.addEventListener('hashchange', () => render());

// ── শুরু ও নিয়মিত হালনাগাদ ─────────────────────────────────────────────

async function tick() {
  try {
    await refreshToday();
    const r = parseRoute().name;
    if (r === 'today' || r === 'amal' || r === 'jumma') render();
    checkAlerts();
  } catch {
    // নেটওয়ার্ক না থাকলে চুপচাপ পরের চেষ্টা
  }
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

async function syncPushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    window.__pushOn = !!sub && Notification.permission === 'granted';
  } catch {}
}

async function boot() {
  registerSW();
  await syncPushState();
  try {
    await refreshToday();
  } catch (err) {
    $('#view').innerHTML = `<div class="empty">সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।<br><small>${esc(err.message)}</small></div>`;
    return;
  }
  if (!location.hash) history.replaceState(null, '', '#/today');
  await render();
  setInterval(tick, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
  // অ্যাপ খোলার সময়েই একবার: অপঠিত সেশন বা দানের প্রশ্ন (Android-এর মতো)
  setTimeout(() => { maybeAskOnOpen(); checkAlerts(); }, 400);
}

boot();
