/**
 * Nocturne Grimoire 🕯️ by Vespera Nocturne (@vespera.nocturne.26) — Frontend Controller
 */

const STORAGE_KEYS = {
  PROFILE: 'nocturne_grimoire_profile_v1',
  GRIMOIRE: 'nocturne_grimoire_journal_v1'
};

const DEFAULT_PROFILE = {
  name: 'Lilith',
  date: '1995-10-31',
  time: '23:11',
  city: 'New Orleans'
};

const ZODIAC_RING = [
  { sign: 'Aries', glyph: '♈' },
  { sign: 'Taurus', glyph: '♉' },
  { sign: 'Gemini', glyph: '♊' },
  { sign: 'Cancer', glyph: '♋' },
  { sign: 'Leo', glyph: '♌' },
  { sign: 'Virgo', glyph: '♍' },
  { sign: 'Libra', glyph: '♎' },
  { sign: 'Scorpio', glyph: '♏' },
  { sign: 'Sagittarius', glyph: '♐' },
  { sign: 'Capricorn', glyph: '♑' },
  { sign: 'Aquarius', glyph: '♒' },
  { sign: 'Pisces', glyph: '♓' }
];


// ---------------------------------------------------------------------------
// Grimoire Pass ($4.99/mo). Free: Tonight's Omen. Premium: everything else.
// ---------------------------------------------------------------------------
const Pass = (() => {
  const KEY = 'nocturne_grimoire_pass_v1';
  const BUY_URL = 'https://buy.stripe.com/4gMbJ22c77vQa9r6FL7ss12';
  const PREMIUM_TABS = ['pendulum', 'synastry', 'chart', 'numbers', 'sanctuary'];
  const NAMES = { pendulum: 'Crystal Pendulum', synastry: 'Twin Synastry', chart: '360° Natal Wheel', numbers: 'Occult Numbers', sanctuary: 'Ritual & Journal' };
  let token = null;
  const read = () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } };
  const write = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch (_) {} };
  const expOf = (t) => { try { return JSON.parse(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).exp; } catch (_) { return 0; } };
  const active = () => !!token && expOf(token) > Date.now();

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('unlock');
    if (sessionId) {
      try {
        const r = await fetch('/api/unlock?session_id=' + encodeURIComponent(sessionId));
        const d = await r.json();
        if (d.success) { token = d.token; write(token); toast('🕯️ Welcome to the full Grimoire. Every chamber is open.'); }
        else toast('We could not confirm that payment yet. Refresh in a minute, or email readings@vespera.cards.');
      } catch (_) {}
      params.delete('unlock');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
    } else {
      token = read();
      if (token) {
        const { status, data } = await post('/api/pass', { token }).catch(() => ({ status: 0 }));
        if (status === 200 && data.token) { token = data.token; write(token); }
        else if (status === 402 || status === 401) { token = null; write(null); }
        // network or server hiccup: keep the current token until it expires
      }
    }
    renderBadge();
  }

  async function fetchJson(url, opts = {}) {
    const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Grimoire-Pass': token || '', ...(opts.headers || {}) } });
    if (r.status === 402) { token = null; write(null); renderBadge(); showPaywall(); return null; }
    return r.json();
  }

  function renderBadge() {
    document.querySelectorAll('.premium-tab').forEach(b => b.classList.toggle('locked', !active()));
    let el = document.getElementById('pass-badge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pass-badge';
      el.style.cssText = 'display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px auto 0;font-size:13px';
      const nav = document.querySelector('.nav-tab')?.parentElement;
      nav ? nav.insertAdjacentElement('afterend', el) : document.body.prepend(el);
    }
    el.innerHTML = active()
      ? '<span style="color:#F59E0B;font-weight:700">✦ Grimoire Pass active</span><button id="pass-manage" style="background:none;border:1px solid #6b5a3a;color:#d8c9a8;border-radius:999px;padding:4px 12px;cursor:pointer">Manage or cancel</button>'
      : '<button id="pass-open" style="background:linear-gradient(135deg,#F59E0B,#BE185D);border:0;color:#170711;font-weight:800;border-radius:999px;padding:7px 16px;cursor:pointer">🔓 Unlock the full Grimoire · $4.99/mo</button>';
    el.querySelector('#pass-open')?.addEventListener('click', () => showPaywall());
    el.querySelector('#pass-manage')?.addEventListener('click', manage);
  }

  async function manage() {
    const { data } = await post('/api/portal', { token }).catch(() => ({ data: {} }));
    location.href = data.url || 'https://billing.stripe.com/p/login/8x2fZibMH6rMftL7JP7ss00';
  }

  function showPaywall(tabId) {
    document.getElementById('paywall')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'paywall';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(8,4,10,.82);display:grid;place-items:center;padding:16px';
    wrap.innerHTML = `
      <div role="dialog" aria-modal="true" style="max-width:440px;width:100%;background:linear-gradient(160deg,#2a1020,#140a12);border:1.5px solid #F59E0B;border-radius:18px;padding:26px 22px;color:#f3e9d2;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.7)">
        <div style="font-size:12px;letter-spacing:3px;color:#F59E0B;font-weight:800">GRIMOIRE PASS</div>
        <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;margin:6px 0 8px">${tabId ? 'Unlock ' + NAMES[tabId] : 'Open every chamber'}</h3>
        <p style="color:#d8c9a8;margin:0 0 14px">Tonight's Omen stays free. The Pass opens the rest of the Grimoire:</p>
        <ul style="text-align:left;margin:0 auto 18px;padding-left:20px;line-height:1.8;color:#f3e9d2;max-width:320px">
          <li>🔮 Crystal Pendulum horary questions</li><li>🩸 Two-person synastry</li><li>🧭 Your 360° natal wheel</li><li>✦ Occult numbers</li><li>🎧 Ritual sounds &amp; private journal</li>
        </ul>
        <a href="${BUY_URL}" style="display:block;background:linear-gradient(135deg,#F59E0B,#D4AF37);color:#170711;font-weight:800;text-decoration:none;border-radius:999px;padding:14px 18px;font-size:16px">Start my Pass · $4.99/month</a>
        <p style="font-size:12px;color:#a8977a;margin:12px 0 0">Renews monthly. Cancel anytime in two clicks. For reflection and entertainment.</p>
        <p style="font-size:12px;margin:10px 0 0"><a href="https://billing.stripe.com/p/login/8x2fZibMH6rMftL7JP7ss00" style="color:#d8c9a8">Already subscribed on another device? Manage your Pass</a></p>
        <button id="paywall-close" style="margin-top:14px;background:none;border:0;color:#a8977a;cursor:pointer;font-size:14px">Not now</button>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('#paywall-close').addEventListener('click', close);
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#2a1020;border:1px solid #F59E0B;color:#f3e9d2;padding:12px 18px;border-radius:12px;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.6)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 6000);
  }

  return { PREMIUM_TABS, active, init, fetchJson, showPaywall };
})();

const state = {
  profile: loadProfile(),
  natalData: null,
  dailyData: null,
  selectedSign: 'Scorpio',
  selectedLens: 'rising_sun_reading',
  selectedAngel: '444',
  transitDate: new Date().toISOString().slice(0, 10),
  audioCtx: null,
  oscillator: null
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...DEFAULT_PROFILE };
}

function saveProfile(p) {
  state.profile = p;
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p));
  syncProfileInputs();
}

function syncProfileInputs() {
  const pill = document.getElementById('active-user-pill');
  if (pill) {
    pill.textContent = `Active Chart: ${state.profile.name} · ${state.profile.date} · ${state.profile.city}`;
  }
  const fields = [
    ['inline-name', state.profile.name],
    ['inline-date', state.profile.date],
    ['inline-time', state.profile.time],
    ['inline-city', state.profile.city],
    ['input-name', state.profile.name],
    ['input-date', state.profile.date],
    ['input-time', state.profile.time],
    ['input-city', state.profile.city],
    ['syn-a-name', state.profile.name],
    ['syn-a-date', state.profile.date],
    ['syn-a-time', state.profile.time],
    ['syn-a-city', state.profile.city]
  ];
  for (const [id, val] of fields) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await Pass.init();
  syncProfileInputs();
  initTabs();
  initSubtabs();
  initBirthForms();
  initTransitScrubber();
  initPendulumStage();
  initSynastryForm();
  initAudioBath();
  initGrimoire();

  await Promise.all([
    fetchAndRenderNatal(),
    fetchAndRenderDaily(),
    fetchAndRenderPendulum('What am I avoiding deciding right now?'),
    fetchAndRenderSynastry(),
    fetchAndRenderNumbers('444')
  ]);
});

function initTabs() {
  const navBtns = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  function activateTab(tabId) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    panes.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const go = (tabId) => {
    if (Pass.PREMIUM_TABS.includes(tabId) && !Pass.active()) return Pass.showPaywall(tabId);
    activateTab(tabId);
  };
  navBtns.forEach(btn => {
    if (Pass.PREMIUM_TABS.includes(btn.dataset.tab)) { btn.classList.add('premium-tab'); btn.classList.toggle('locked', !Pass.active()); }
    btn.addEventListener('click', () => go(btn.dataset.tab));
  });

  document.querySelectorAll('[data-goto-tab]').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.gotoTab));
  });
}

function initSubtabs() {
  const btns = document.querySelectorAll('.subtab-btn');
  const panes = document.querySelectorAll('.subtab-pane');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.toggle('active', b === btn));
      panes.forEach(p => p.classList.toggle('active', p.id === btn.dataset.subtab));
    });
  });
}

function initBirthForms() {
  const modal = document.getElementById('birth-modal');
  const openBtn = document.getElementById('open-birth-modal-btn');
  const openBtn2 = document.getElementById('edit-chart-btn-2');
  const closeBtn = document.getElementById('close-birth-modal-btn');
  const modalForm = document.getElementById('birth-form');
  const inlineForm = document.getElementById('inline-birth-form');

  function openModal() {
    syncProfileInputs();
    modal.classList.remove('hidden');
  }

  openBtn?.addEventListener('click', openModal);
  openBtn2?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));

  async function applyNewProfile(updated) {
    saveProfile(updated);
    modal.classList.add('hidden');
    await Promise.all([
      fetchAndRenderNatal(),
      fetchAndRenderTransits(state.transitDate),
      fetchAndRenderPendulum(document.getElementById('pendulum-question-input')?.value),
      fetchAndRenderSynastry(),
      fetchAndRenderNumbers(state.selectedAngel)
    ]);
  }

  inlineForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await applyNewProfile({
      name: document.getElementById('inline-name').value.trim() || 'Sovereign',
      date: document.getElementById('inline-date').value,
      time: document.getElementById('inline-time').value,
      city: document.getElementById('inline-city').value.trim() || 'New York'
    });
  });

  modalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await applyNewProfile({
      name: document.getElementById('input-name').value.trim() || 'Sovereign',
      date: document.getElementById('input-date').value,
      time: document.getElementById('input-time').value,
      city: document.getElementById('input-city').value.trim() || 'New York'
    });
  });

  document.getElementById('download-wheel-btn')?.addEventListener('click', () => {
    if (!state.natalData?.svg) return;
    const blob = new Blob([state.natalData.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.profile.name.replace(/\s+/g, '_')}_Nocturne_Grimoire_Wheel.svg`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function initTransitScrubber() {
  const dateInput = document.getElementById('transit-date-input');
  if (dateInput) dateInput.value = state.transitDate;

  function shiftDate(days) {
    const d = new Date(`${state.transitDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    state.transitDate = d.toISOString().slice(0, 10);
    if (dateInput) dateInput.value = state.transitDate;
    fetchAndRenderTransits(state.transitDate);
  }

  document.getElementById('transit-prev-btn')?.addEventListener('click', () => shiftDate(-1));
  document.getElementById('transit-next-btn')?.addEventListener('click', () => shiftDate(1));
  document.getElementById('transit-today-btn')?.addEventListener('click', () => {
    state.transitDate = new Date().toISOString().slice(0, 10);
    if (dateInput) dateInput.value = state.transitDate;
    fetchAndRenderTransits(state.transitDate);
  });
  dateInput?.addEventListener('change', (e) => {
    if (e.target.value) {
      state.transitDate = e.target.value;
      fetchAndRenderTransits(state.transitDate);
    }
  });
}

// ============================================================================
// CRYSTAL PENDULUM STAGE
// ============================================================================
function initPendulumStage() {
  const ring = document.getElementById('dowsing-zodiac-ring');
  if (ring) {
    let html = '';
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = 250 + 162 * Math.cos(angle);
      const y = 250 + 162 * Math.sin(angle);
      html += `<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle" fill="#FDE68A" font-size="18" id="dowsing-sign-${i}">${ZODIAC_RING[i].glyph}</text>`;
    }
    ring.innerHTML = html;
  }

  document.querySelectorAll('.preset-q-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const inp = document.getElementById('pendulum-question-input');
      if (inp) inp.value = q;
      fetchAndRenderPendulum(q);
    });
  });

  document.getElementById('pendulum-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('pendulum-question-input')?.value;
    fetchAndRenderPendulum(q);
  });
}

async function fetchAndRenderPendulum(question) {
  try {
    const payload = {
      ...state.profile,
      question: question || 'What am I avoiding deciding right now?'
    };
    if (!Pass.active()) return;
    const data = await Pass.fetchJson('/api/pendulum', { method: 'POST', body: JSON.stringify(payload) });
    if (!data || !data.success) return;

    const pGroup = document.getElementById('crystal-pendulum-group');
    if (pGroup) {
      pGroup.className.baseVal = `swing-${data.swing_mode}`;
    }

    for (let i = 0; i < 12; i++) {
      const el = document.getElementById(`dowsing-sign-${i}`);
      if (el) {
        el.setAttribute('fill', i === data.target_sign_index ? '#F43F5E' : '#FDE68A');
        el.setAttribute('font-size', i === data.target_sign_index ? '25' : '18');
      }
    }

    const box = document.getElementById('pendulum-result-box');
    if (box) {
      box.innerHTML = `
        <div class="diagnostic-item-top" style="margin-bottom:8px;">
          <span class="diagnostic-title" style="font-size:1.08rem;">${data.verdict}</span>
          <span class="diagnostic-badge">${data.target_glyph} ${data.target_sign} · House ${data.target_house}</span>
        </div>
        <p class="muted-sub" style="color:#FDE68A;margin-bottom:8px;">
          ⏳ Cast in the <strong>${data.planetary_hour.title} (${data.planetary_hour.glyph})</strong> · Horary Moon: <code>${data.horary_moon}</code> · Horary Ascendant: <code>${data.horary_ascendant}</code>
        </p>
        <p class="diagnostic-body" style="font-size:0.93rem;margin-bottom:12px;">${data.oracle_decree}</p>
        <div class="helena-quote-box" style="margin-bottom:0;">
          <strong>🕯️ Vespera’s Altar Prescription:</strong> ${data.ritual_prescription}
        </div>
      `;
    }
  } catch (err) {
    console.error('Pendulum error:', err);
  }
}

// ============================================================================
// TWIN-CHART SYNASTRY
// ============================================================================
function initSynastryForm() {
  document.getElementById('synastry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetchAndRenderSynastry();
  });
}

async function fetchAndRenderSynastry() {
  try {
    const personA = {
      name: document.getElementById('syn-a-name')?.value || state.profile.name,
      date: document.getElementById('syn-a-date')?.value || state.profile.date,
      time: document.getElementById('syn-a-time')?.value || state.profile.time,
      city: document.getElementById('syn-a-city')?.value || state.profile.city
    };
    const personB = {
      name: document.getElementById('syn-b-name')?.value || 'Julian',
      date: document.getElementById('syn-b-date')?.value || '1993-05-14',
      time: document.getElementById('syn-b-time')?.value || '18:30',
      city: document.getElementById('syn-b-city')?.value || 'London'
    };

    if (!Pass.active()) return;
    const data = await Pass.fetchJson('/api/synastry', { method: 'POST', body: JSON.stringify({ personA, personB }) });
    if (!data || !data.success) return;

    const wrap = document.getElementById('synastry-results-container');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="synastry-score-grid">
        <div class="syn-stat"><div class="v">${data.scores.overall}%</div><div class="l">Karmic Bond</div></div>
        <div class="syn-stat"><div class="v">${data.scores.obsession}%</div><div class="l">Venus–Mars Obsession</div></div>
        <div class="syn-stat"><div class="v">${data.scores.soul_tie}%</div><div class="l">Past-Life Telepathy</div></div>
        <div class="syn-stat"><div class="v">${data.scores.wealth_alchemy}%</div><div class="l">2H/8H Empire Tie</div></div>
      </div>

      <div class="helena-quote-box">
        <strong>${data.archetype}</strong><br/>
        ${data.summary}
      </div>

      <div class="stack-list" style="margin-bottom:12px;">
        <div class="diagnostic-item">
          <div class="diagnostic-body">${data.nodal_contract}</div>
        </div>
        <div class="diagnostic-item">
          <div class="diagnostic-body">${data.lilith_shadow_warning}</div>
        </div>
      </div>

      <h3 style="margin-bottom:10px;color:#FDE68A;">🕯️ Exact Cross-Chart Planetary &amp; Asteroid Locks</h3>
      <div class="stack-list">
        ${data.hits.map(h => `
          <div class="diagnostic-item">
            <div class="diagnostic-item-top">
              <span class="diagnostic-title">${h.title}</span>
              <span class="diagnostic-badge">${h.tag}</span>
            </div>
            <div class="diagnostic-body">${h.reading}</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Synastry error:', err);
  }
}

// ============================================================================
// NATAL, TRANSITS, DAILY & NUMBERS
// ============================================================================
async function fetchAndRenderNatal() {
  try {
    let data;
    if (window.NocturneGrimoireAPI) {
      data = await window.NocturneGrimoireAPI.natal(state.profile);
    } else {
      const res = await fetch('/api/natal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.profile)
      });
      data = await res.json();
    }
    if (!data.success) return;
    state.natalData = data;

    const risingSign = data.chart?.angles?.asc_details?.sign;
    if (risingSign) state.selectedSign = risingSign;

    renderNatalChartSection(data);
    renderPersonalTransitsList(data.helena?.live_personal_transits);
    if (state.dailyData) renderHoroscopeViewer();
  } catch (err) {
    console.error('Natal error:', err);
  }
}

async function fetchAndRenderTransits(targetDate) {
  try {
    let data;
    if (window.NocturneGrimoireAPI) {
      data = await window.NocturneGrimoireAPI.transits({
        birth_date: state.profile.date,
        birth_time: state.profile.time,
        city: state.profile.city,
        target_date: targetDate
      });
    } else {
      const res = await fetch('/api/transits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_date: state.profile.date,
          birth_time: state.profile.time,
          city: state.profile.city,
          target_date: targetDate
        })
      });
      data = await res.json();
    }
    if (data.success) renderPersonalTransitsList(data);
  } catch (err) {
    console.error('Transit error:', err);
  }
}

function renderPersonalTransitsList(radar) {
  const box = document.getElementById('personal-transits-list');
  if (!box || !radar) return;
  const list = radar.top_transits || [];
  if (list.length === 0) {
    box.innerHTML = `<div class="diagnostic-item"><div class="diagnostic-body">Stillness in the outer transits tonight — an ideal window for candle dowsing and 8th-house wealth planning.</div></div>`;
    return;
  }
  box.innerHTML = list.map(hit => `
    <div class="diagnostic-item">
      <div class="diagnostic-item-top">
        <span class="diagnostic-title">${hit.headline}</span>
        <span class="diagnostic-badge">${hit.badge}${hit.orb ? ' · ' + hit.orb : ''}</span>
      </div>
      <div class="diagnostic-body">${hit.detail}</div>
    </div>
  `).join('');
}

function renderNatalChartSection(data) {
  const { chart, helena, svg } = data;
  document.getElementById('chart-title-heading').textContent = `${data.name} — ${helena.big_three_summary.headline}`;
  document.getElementById('chart-meta-sub').textContent = `${chart.meta.birth_date} at ${chart.meta.birth_time} · ${chart.meta.resolved_location} · ${helena.big_three_summary.subheadline}`;
  document.getElementById('natal-wheel-wrap').innerHTML = svg;

  document.getElementById('sub-big3').innerHTML = `
    <div class="helena-quote-box">${helena.big_three_summary.helena_intro}</div>
    <div class="stack-list">
      ${helena.big_three_summary.cards.map(c => `
        <div class="diagnostic-item">
          <div class="diagnostic-item-top">
            <span class="diagnostic-title">${c.slot}: ${c.placement}</span>
            <span class="diagnostic-badge">${c.degree_tag}</span>
          </div>
          <div class="diagnostic-body">${c.reading}</div>
          <div class="muted-sub" style="margin-top:6px;color:#FDE68A;">📍 ${c.house_focus}</div>
        </div>
      `).join('')}
    </div>
  `;

  const w = helena.venus_glamour_wealth;
  document.getElementById('sub-wealth').innerHTML = `
    <div class="helena-quote-box">${w.money_code}</div>
    <div class="stack-list">
      <div class="diagnostic-item">
        <div class="diagnostic-item-top">
          <span class="diagnostic-title">💎 ${w.second_house_ruler}</span>
          <span class="diagnostic-badge">2nd &amp; 8th House Alchemy</span>
        </div>
        <div class="diagnostic-body"><strong>${w.eighth_house_ruler}</strong> — ${w.glamour_ritual}</div>
      </div>
      ${(w.wealth_degrees || []).map(d => `
        <div class="diagnostic-item">
          <div class="diagnostic-item-top">
            <span class="diagnostic-title">${d.body} at ${d.exact_label} (House ${d.house})</span>
            <span class="diagnostic-badge">${d.tag}</span>
          </div>
          <div class="diagnostic-body">${d.note}</div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('sub-asteroids').innerHTML = `
    <div class="stack-list">
      ${(helena.asteroids_list || []).map(a => `
        <div class="diagnostic-item">
          <div class="diagnostic-item-top">
            <span class="diagnostic-title">${a.icon} ${a.label} in ${a.sign} · House ${a.house} (${a.exact_label}${a.retrograde ? ' ℞' : ''})</span>
            <span class="diagnostic-badge">${a.degree_theory.tag}</span>
          </div>
          <div class="diagnostic-body"><strong>Domain:</strong> ${a.domain}<br/>${a.helena_prescription}</div>
        </div>
      `).join('')}
    </div>
  `;

  const sh = helena.protection_dashboard;
  document.getElementById('sub-shield').innerHTML = `
    <div class="helena-quote-box">
      <strong>${sh.pluto_placement}</strong> · <strong>${sh.saturn_placement}</strong><br/>
      Fixed-Sign Anchors: ${sh.fixed_pressure_points.join(' · ') || 'Balanced across modalities'}
    </div>
    <div class="stack-list">
      ${sh.cord_cutting_rx.map((rx, idx) => `
        <div class="diagnostic-item">
          <div class="diagnostic-item-top">
            <span class="diagnostic-title">🐍 Shadow Ward &amp; Boundary #${idx + 1}</span>
            <span class="diagnostic-badge">Saturn / Pluto Mastery</span>
          </div>
          <div class="diagnostic-body">${rx}</div>
        </div>
      `).join('')}
    </div>
  `;

  const anc = helena.derivative_ancestral;
  document.getElementById('sub-bali').innerHTML = `
    <div class="helena-quote-box">${anc.bali_retreat_prescription}</div>
    <div class="stack-list">
      <div class="diagnostic-item">
        <div class="diagnostic-item-top">
          <span class="diagnostic-title">🕯️ Past-Life Archive &amp; 12th House Gifts</span>
          <span class="diagnostic-badge">4H / 8H / 12H</span>
        </div>
        <div class="diagnostic-body">${anc.ancestral_reading}</div>
      </div>
    </div>
  `;
}

async function fetchAndRenderDaily() {
  try {
    let data;
    if (window.NocturneGrimoireAPI) {
      data = await window.NocturneGrimoireAPI.daily();
    } else {
      const res = await fetch('/api/daily');
      data = await res.json();
    }
    if (!data.success) return;
    state.dailyData = data;

    if (data.planetaryHour) {
      const ph = data.planetaryHour;
      document.getElementById('phour-title').textContent = `${ph.glyph} ${ph.title} — Ruled by ${ph.ruler}`;
      document.getElementById('phour-badge').textContent = `🕯️ Hour #${ph.hour_number} · ${ph.candle}`;
      document.getElementById('phour-desc').textContent = `Occult Gift of this Hour: ${ph.gift}`;
      document.getElementById('phour-chips').innerHTML = `
        <span class="sky-chip">🕯️ Candle: ${ph.candle}</span>
        <span class="sky-chip">🌿 Botanical: ${ph.herb}</span>
      `;
    }

    document.getElementById('sky-headline').textContent = data.sky_weather.headline;
    document.getElementById('sky-moon-phase').textContent = data.sky_weather.moon_phase;
    document.getElementById('helena-daily-brief').textContent = data.sky_weather.helena_daily_brief;
    document.getElementById('horoscope-date-badge').textContent = `${data.date} · Midnight Omen`;

    const pills = [
      `🧭 ${data.sky_weather.north_node}`,
      `⚡ ${data.sky_weather.pluto_macro}`,
      `♂ ${data.sky_weather.mars_watch}`,
      ...(data.sky_weather.retrogrades.length ? [`℞ Retrogrades: ${data.sky_weather.retrogrades.join(', ')}`] : ['✨ Direct Planetary Flow'])
    ];
    document.getElementById('sky-pills-row').innerHTML = pills.map(p => `<span class="sky-chip">${p}</span>`).join('');

    const grid = document.getElementById('sign-selector-grid');
    grid.innerHTML = Object.values(data.horoscopes).map(h => `
      <button class="sign-pill-btn ${h.sign === state.selectedSign ? 'active' : ''}" data-sign="${h.sign}">
        <span class="g">${h.glyph}</span>
        <span class="n">${h.sign}</span>
      </button>
    `).join('');

    grid.querySelectorAll('.sign-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedSign = btn.dataset.sign;
        grid.querySelectorAll('.sign-pill-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderHoroscopeViewer();
      });
    });

    document.querySelectorAll('.lens-tab').forEach(lt => {
      lt.addEventListener('click', () => {
        state.selectedLens = lt.dataset.lens;
        document.querySelectorAll('.lens-tab').forEach(b => b.classList.toggle('active', b === lt));
        renderHoroscopeViewer();
      });
    });

    renderHoroscopeViewer();

    const bday = data.todays_birthday;
    if (bday) {
      document.getElementById('birthday-card-box').innerHTML = `
        <span class="sigil-tag">🎂 SOLAR RETURN GRIMOIRE</span>
        <h3>${bday.title}</h3>
        <div class="helena-quote-box" style="margin-top:8px;"><strong>${bday.degree_tag}</strong> — ${bday.reading}</div>
      `;
    }
  } catch (err) {
    console.error('Daily error:', err);
  }
}

function renderHoroscopeViewer() {
  const card = document.getElementById('active-horoscope-card');
  if (!card || !state.dailyData?.horoscopes) return;
  const h = state.dailyData.horoscopes[state.selectedSign] || Object.values(state.dailyData.horoscopes)[0];
  const bodyCopy = h[state.selectedLens] || h.rising_sun_reading;

  card.innerHTML = `
    <div class="diagnostic-item-top" style="margin-bottom:8px;">
      <span class="diagnostic-title" style="font-size:1.05rem;">${h.glyph} ${h.sign} — ${h.vibe_tag}</span>
      <span class="diagnostic-badge">Portal ${h.angel_portal} · ${h.lucky_degree}</span>
    </div>
    <p class="muted-sub" style="color:#FDE68A;margin-bottom:8px;">📍 ${h.power_houses}</p>
    <p class="diagnostic-body" style="font-size:0.92rem;margin-bottom:12px;">${bodyCopy}</p>
    <div class="helena-quote-box" style="margin-bottom:0;"><strong>🕯️ Vespera’s Decree:</strong> ${h.helena_command}</div>
  `;
}

async function fetchAndRenderNumbers(code) {
  try {
    state.selectedAngel = code || '444';
    if (!Pass.active()) return;
    const data = await Pass.fetchJson(`/api/numbers?code=${encodeURIComponent(state.selectedAngel)}&birth_date=${encodeURIComponent(state.profile.date)}`);
    if (!data || !data.success) return;

    const allCodes = ['111', '222', '333', '444', '555', '666', '777', '888', '999', '000'];
    const grid = document.getElementById('angel-buttons-grid');
    grid.innerHTML = allCodes.map(c => `
      <button class="angel-btn ${c === state.selectedAngel ? 'active' : ''}" data-code="${c}">${c}</button>
    `).join('');

    grid.querySelectorAll('.angel-btn').forEach(btn => {
      btn.addEventListener('click', () => fetchAndRenderNumbers(btn.dataset.code));
    });

    const a = data.requested_angel;
    document.getElementById('angel-result-box').innerHTML = `
      <div class="diagnostic-item-top" style="margin-bottom:8px;">
        <span class="diagnostic-title" style="font-size:1.06rem;">✦ ${a.number} — ${a.title}</span>
        <span class="diagnostic-badge">${a.planet_pair}</span>
      </div>
      <p class="diagnostic-body" style="margin-bottom:10px;">${a.meaning}</p>
      <div class="helena-quote-box" style="margin-bottom:0;"><strong>Ritual Action:</strong> ${a.action}</div>
    `;

    const num = data.numerology;
    document.getElementById('numerology-grid-box').innerHTML = `
      <div class="num-stat-box"><div class="big-num">${num.life_path}</div><div class="lbl">Life Path</div></div>
      <div class="num-stat-box"><div class="big-num">${num.personal_year}</div><div class="lbl">Personal Year</div></div>
      <div class="num-stat-box"><div class="big-num">${num.personal_month}</div><div class="lbl">Personal Month</div></div>
      <div class="num-stat-box"><div class="big-num">${num.personal_day}</div><div class="lbl">Personal Day</div></div>
    `;

    document.getElementById('numerology-details-box').innerHTML = `
      <div class="diagnostic-item">
        <div class="diagnostic-title" style="margin-bottom:4px;">🧭 ${num.life_path_meaning}</div>
        <div class="diagnostic-body">${num.personal_year_meaning}</div>
      </div>
    `;
  } catch (err) {
    console.error('Numbers error:', err);
  }
}

function initAudioBath() {
  const orb = document.getElementById('breathing-orb');
  const label = document.getElementById('breath-instruction');
  const freqBtns = document.querySelectorAll('.freq-btn[data-freq]');
  const stopBtn = document.getElementById('stop-audio-btn');

  function stopSound() {
    if (state.oscillator) {
      try { state.oscillator.stop(); } catch (_) {}
      state.oscillator = null;
    }
    orb?.classList.remove('pulsing');
    if (label) label.textContent = 'Tap Frequency';
    freqBtns.forEach(b => b.classList.remove('active'));
  }

  freqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const hz = Number(btn.dataset.freq);
      stopSound();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!state.audioCtx) state.audioCtx = new AudioContext();
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, state.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, state.audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      state.oscillator = osc;
      btn.classList.add('active');
      orb?.classList.add('pulsing');
      if (label) label.textContent = `${hz} Hz Active`;
    });
  });

  stopBtn?.addEventListener('click', stopSound);
}

function initGrimoire() {
  const form = document.getElementById('grimoire-form');
  const listEl = document.getElementById('grimoire-entries-list');

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GRIMOIRE) || '[]');
    } catch (_) {
      return [];
    }
  }

  function renderEntries() {
    const entries = loadEntries();
    if (!listEl) return;
    if (entries.length === 0) {
      listEl.innerHTML = `<div class="diagnostic-item"><div class="diagnostic-body">Your Book of Shadows is ready—record your first pendulum decree or synchronicity above.</div></div>`;
      return;
    }
    listEl.innerHTML = entries.map(item => `
      <div class="diagnostic-item">
        <div class="diagnostic-item-top">
          <span class="diagnostic-title">${item.title}</span>
          <span class="diagnostic-badge">${item.tag} · ${item.date}</span>
        </div>
        <div class="diagnostic-body">${item.notes}</div>
      </div>
    `).join('');
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const entries = loadEntries();
    entries.unshift({
      title: document.getElementById('grimoire-title').value.trim(),
      tag: document.getElementById('grimoire-tag').value,
      notes: document.getElementById('grimoire-notes').value.trim(),
      date: new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem(STORAGE_KEYS.GRIMOIRE, JSON.stringify(entries.slice(0, 50)));
    form.reset();
    renderEntries();
  });

  renderEntries();
}
