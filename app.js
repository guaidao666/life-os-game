'use strict';
/* 游戏人生独立站 · 方案C 骨架（一期基建，只读展示真数据） */

const MODULES = [
  { id: 'dashboard', name: '仪表盘', icon: '🏠', group: '首页' },
  { id: 'dungeon',   name: '每日秘境', icon: '🗺️', group: '修行' },
  { id: 'trial',     name: '周天试炼', icon: '⚡', group: '修行' },
  { id: 'altar',     name: '命愿祈铺', icon: '🔮', group: '修行' },
  { id: 'demon',     name: '魔障',   icon: '🩸', group: '修行' },
  { id: 'cook',      name: '烹饪',   icon: '🍳', group: '生活' },
  { id: 'bag',       name: '背包仓库', icon: '🎒', group: '生活' },
  { id: 'fun',       name: '娱乐',   icon: '🎬', group: '生活' },
  { id: 'diary',     name: '日记',   icon: '📔', group: '生活' },
  { id: 'weight',    name: '体重',   icon: '⚖️', group: '体魄' },
  { id: 'sleep',     name: '睡眠',   icon: '🌙', group: '体魄' },
  { id: 'char',      name: '角色',   icon: '👤', group: '成长' },
  { id: 'heart',     name: '心法',   icon: '📜', group: '成长' },
  { id: 'realm',     name: '境界',   icon: '🌟', group: '成长' },
  { id: 'skill',     name: '技能',   icon: '⚔️', group: '成长' },
  { id: 'npc',       name: '江湖NPC', icon: '🧝', group: '成长' },
  { id: 'map',       name: '地图',   icon: '🌐', group: '成长' },
  { id: 'economist', name: '中级经济师', icon: '📚', group: '备考' },
];
const GROUPS = ['首页', '修行', '生活', '体魄', '成长', '备考'];
const QUA = { 1: { label: '普通', star: 1 }, 2: { label: '美味', star: 2 }, 3: { label: '珍稀', star: 3 }, 4: { label: '完美', star: 4 } };
const BAG_CAP = 40;        // 背包固定 40 格
const WAREHOUSE_CAP = 60;  // 仓库默认 60 格（一期只读，扩容逻辑二期）

/* ---------- 技能 / 境界 静态定义（与主站一致，二期 v7/v8） ---------- */
const SKILL_MAX = 10;
const SKILL_DEFS = {
  '陶笛':   { group: 'interest', desc: '吹奏陶笛，怡情养性、安神定志' },
  '围棋':   { group: 'interest', desc: '黑白对弈，锻炼逻辑与大局观' },
  '画画':   { group: 'interest', desc: '笔墨丹青，记录眼中的世界' },
  'PS':     { group: 'interest', desc: '图像后期，修图与设计表达' },
  'Python': { group: 'pro',      desc: '编程生产力，自动化与数据分析' },
  '广联达': { group: 'pro',      desc: '造价算量，专业硬核技能' },
  'Office': { group: 'office',   desc: '办公三件套，职场基本功' }
};
const SKILL_GROUPS = [
  { key: 'pro',      label: '专业技能' },
  { key: 'interest', label: '兴趣爱好' },
  { key: 'office',   label: '办公技能' }
];
function skillTotalLevel() {
  const s = player().skills || {};
  return Object.keys(SKILL_DEFS).reduce((sum, k) => sum + (Number(s[k]) || 0), 0);
}
const REALM_XP_NEEDED = 7;     // 每层需 7 经验（约 1 周/层，约 2 月首次圆满）
const REALM_STAGES = 9;        // 单轮阶数（满 9 层 = 一次圆满，进入轮回继续攀升）
const REALM_DEFS = {
  '炼体法': { group:'body', icon:'🏋️', story:'以八段锦、五禽戏、运动为基，淬炼筋骨气血，乃修行之根。', effect:'每层 +3% 副本愿力产出。', buff:{ type:'taskBonus', per:3 },
    src:{ label:'运动 · 八段锦 · 五禽戏', mod:'dungeon' },
    stages:['散炼境','凝筋境','易骨境','锻脏境','换血境','通脉境','洗髓境','伐毛境','大圆满'] },
  '万卷书': { group:'mind', icon:'📖', story:'读万卷书，明事理、开智慧。', effect:'每层 +3% 副本愿力产出。', buff:{ type:'taskBonus', per:3 },
    src:{ label:'读书副本 · 娱乐录书', mod:'dungeon' },
    stages:['百卷境','三百卷','五百卷','八百卷','千卷境','千五卷','两千卷','三千卷','大圆满'] },
  '万里路': { group:'mind', icon:'🥾', story:'行万里路，见天地、阔眼界。偶发游历（点亮城市 / 风景）记经验，平时静默。', effect:'每圆满 +8% 心魔抵抗。', buff:{ type:'xinmoResist', per:8, onRound:true },
    src:{ label:'点亮地图 · 记录风景', mod:'map' },
    stages:['初行境','百里境','千里境','万里境','遍历境','通达境','洞明境','无界境','大圆满'] },
  '功德法': { group:'heart', icon:'🤲', story:'渡人渡己，积功德于无形。日行一善即记经验。', effect:'每圆满 +8% 魅魔抵抗。', buff:{ type:'meimoResist', per:8, onRound:true },
    src:{ label:'日行一善（每日副本）', mod:'dungeon' },
    stages:['初善境','行善境','积善境','圆满境','广济境','普度境','无量境','慈悲境','大圆满'] },
  '千面法': { group:'heart', icon:'🎭', story:'理智与感性并存，千人千面。每日「心境觉察」内省一种面向即记经验。', effect:'每层 +2% 全副本愿力产出。', buff:{ type:'taskBonus', per:2 },
    src:{ label:'心境觉察（每日副本）', mod:'dungeon' },
    stages:['初面境','双面境','多面境','洞悉境','无相境','随心境','通明境','自在境','大圆满'] },
  '灶神录': { group:'life', icon:'🍳', story:'烟火人间，灶下修心。新菜 +5 经验、重复做 +1 经验。', effect:'每层 +2% 副本愿力产出。', buff:{ type:'taskBonus', per:2 },
    src:{ label:'做一道菜（烹饪）', mod:'cook' },
    stages:['炊烟境','调羹境','五味境','火候境','庖丁境','食神境','飨宴境','至味境','大圆满'] },
  '岁笺录': { group:'life', icon:'📜', story:'岁岁笺墨，日记修心。每写一篇日记 +1 经验。', effect:'每层 +2% 副本愿力产出。', buff:{ type:'taskBonus', per:2 },
    src:{ label:'写日记', mod:'diary' },
    stages:['起笔境','记微境','叙事境','省身境','明智境','通慧境','自得境','圆满境','大圆满'] },
  '体魄录': { group:'body', icon:'⚖️', story:'动静有常，称量其身。每日称体重即记经验，观体魄之变、养筋骨之基。', effect:'每层 +2% 心魔抵抗。', buff:{ type:'xinmoResist', per:2 },
    src:{ label:'称体重（每日首称）', mod:'weight' },
    stages:['初秤境','知重境','轻身境','固本境','强筋境','壮骨境','淬体境','无垢境','大圆满'] },
  '娱心录': { group:'life', icon:'🎬', story:'怡情悦性，张弛有度。录入一部好作品（书/影视/动漫/游戏/歌）即记经验，劳逸相济。', effect:'每层 +2% 副本愿力产出。', buff:{ type:'taskBonus', per:2 },
    src:{ label:'录入作品（娱乐）', mod:'fun' },
    stages:['初赏境','阅世境','怡情境','沉醉境','博闻境','品鉴境','通娱境','忘忧境','大圆满'] }
};
function realmState(key) {
  const raw = (player().realms || {})[key];
  const s = { layer: 0, xp: 0, round: 0 };
  if (raw == null) return s;
  if (typeof raw === 'number') { s.layer = raw; return s; }
  if (typeof raw === 'string') {
    const m = String(raw).match(/第(\d+)层/);
    if (m) s.layer = parseInt(m[1], 10);
    else if (/^\d+$/.test(raw.trim())) s.layer = parseInt(raw, 10);
    return s;
  }
  if (typeof raw === 'object') {
    s.layer = Number(raw.layer) || 0; s.xp = Number(raw.xp) || 0; s.round = Number(raw.round) || 0;
  }
  return s;
}
function realmLayer(key) { return realmState(key).layer; }   // 轮内层数（供心法解锁判断）
function realmStageName(key) {
  const s = realmState(key), def = REALM_DEFS[key];
  const idx = (((s.layer % REALM_STAGES) + REALM_STAGES) % REALM_STAGES);
  return (s.round > 0 ? ('轮回' + s.round + '·') : '') + def.stages[idx];
}
function realmTotalLayers() { return Object.keys(REALM_DEFS).reduce((s, k) => { const r = realmState(k); return s + r.layer + r.round * REALM_STAGES; }, 0); }
function realmBuffSum(type) {
  let s = 0;
  Object.keys(REALM_DEFS).forEach(k => {
    const def = REALM_DEFS[k], st = realmState(k);
    if (def.buff && def.buff.type === type) s += (def.buff.per || 0) * (def.buff.onRound ? st.round : st.layer);
  });
  return s;
}
function realmXpTodayKey() { return 'game_realmxp_' + todayKey(); }
function realmXpGrantedToday() { try { return JSON.parse(localStorage.getItem(realmXpTodayKey()) || '[]'); } catch (e) { return []; } }
function markRealmXpToday(key) { const a = realmXpGrantedToday(); if (!a.includes(key)) { a.push(key); try { localStorage.setItem(realmXpTodayKey(), JSON.stringify(a)); } catch (e) {} } }
async function grantRealmXp(key, amount, opts) {
  opts = opts || {};
  if (!REALM_DEFS[key]) return;
  if (opts.oncePerDay) {
    if (realmXpGrantedToday().includes(key)) return;   // 每日副本每境每天最多一次
    markRealmXpToday(key);
  }
  const realms = Object.assign({}, player().realms || {});
  const s = realmState(key);
  s.xp += amount;
  let leveled = false, rounded = false;
  while (s.xp >= REALM_XP_NEEDED) { s.xp -= REALM_XP_NEEDED; s.layer += 1; leveled = true; if (s.layer % REALM_STAGES === 0) { s.round += 1; rounded = true; } }
  realms[key] = s;
  try {
    const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { realms: JSON.stringify(realms) } }) });
    const r = await j.json();
    if (r.ok && r.player) DATA.player = r.player; else DATA.player.realms = realms;
    renderResbar();
    if (rounded) toast('🏆 ' + key + ' 一次圆满！永久光环 +' + s.round + '（轮回第 ' + s.round + ' 世）', 'good');
    else if (leveled) toast('🌟 ' + key + ' 参悟至 ' + realmStageName(key), 'good');
    else toast('✨ ' + key + ' +' + amount + ' 经验（' + s.xp + '/' + REALM_XP_NEEDED + '）', 'good');
  } catch (e) { toast('境界记录失败：' + e.message, 'warn'); }
}

let DATA = null;

/* ---------- 工具 ---------- */
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function player() { return (DATA && DATA.player) || {}; }
function food() { return (DATA && DATA.food) || {}; }
function demons() { return (DATA && DATA.demons) || []; }
function inv() { return player().inventory || []; }
function stars(q) { const s = (QUA[q] || QUA[1]).star; return '★'.repeat(s) + '☆'.repeat(4 - s); }
function safeParse(s, d) { try { return JSON.parse(s); } catch (e) { return d; } }

/* ---------- 数据加载 ---------- */
async function loadData() {
  const loading = document.getElementById('loading');
  try {
    const r = await fetch('/api/data');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    DATA = await r.json();
    if (loading) loading.style.display = 'none';
  } catch (e) {
    DATA = null;
    if (loading) {
      loading.textContent = '⚠️ 无法连接后端（' + e.message + '），仅显示骨架。请确认 server.mjs 已启动并提供 /api/data。';
      loading.classList.add('err');
      setTimeout(() => { loading.style.display = 'none'; }, 4000);
    }
  }
  render();
}

/* ---------- 渲染：资源条 ---------- */
function renderResbar() {
  const p = player();
  const items = [
    ['wp', '愿力 WP', num(p.willpower, 0)],
    ['lp', '幸运 LP', num(p.lucky, 0)],
    ['dp', '天命 DP', num(p.destiny, 0)],
  ];
  document.getElementById('resbar').innerHTML = items.map(([c, k, v]) =>
    `<div class="res ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
}

/* ---------- 愿力明细账（统一收口所有加/扣愿力，落本地流水） ---------- */
const WP_LEDGER_KEY = 'game_wp_ledger';
function wpLedgerLoad() { try { return JSON.parse(localStorage.getItem(WP_LEDGER_KEY) || '[]'); } catch (e) { return []; } }
function wpLedgerSave(a) { try { localStorage.setItem(WP_LEDGER_KEY, JSON.stringify(a)); } catch (e) {} }
let wpLedgerFilt = 'all';   // 'all' | 'in' | 'out'
/* 仅记账：在本地明细账追加一笔（不发起请求），余额取当前 player。 */
function wpLedgerAppend(delta, source, text) {
  delta = Number(delta) || 0;
  if (!delta) return;
  const bal = num(player().willpower, 0);
  const ledger = wpLedgerLoad();
  ledger.unshift({ ts: Date.now(), delta: delta, balance: bal, source: source || '日常', text: text || '' });
  wpLedgerSave(ledger.slice(0, 500));
}
/* 统一发放/扣除愿力：实时写后端 + 记本地明细账 + 刷新资源条。返回最新 WP。 */
async function grantWP(delta, source, text) {
  delta = Number(delta) || 0;
  if (!delta) return num(player().willpower, 0);
  try {
    const j = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: delta, source: source || '日常', text: text || '' }) });
    const r = await j.json();
    const newWP = (r.ok && r.player && r.player.willpower != null) ? r.player.willpower : (num(player().willpower, 0) + delta);
    DATA.player.willpower = newWP;
    wpLedgerAppend(delta, source, text);
    renderResbar();
    return newWP;
  } catch (e) { toast('愿力结算失败：' + e.message, 'warn'); throw e; }
}
function renderWpLedgerHtml() {
  const ledger = wpLedgerLoad();
  const bal = num(player().willpower, 0);
  const filtered = ledger.filter(e => wpLedgerFilt === 'all' ? true : (wpLedgerFilt === 'in' ? e.delta > 0 : e.delta < 0));
  const rows = filtered.length ? filtered.map(e => {
    const sign = e.delta > 0 ? '+' : '';
    const cls = e.delta > 0 ? 'in' : 'out';
    const dt = new Date(e.ts);
    const dstr = (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    return '<div class="wp-row ' + cls + '"><span class="wp-time">' + dstr + '</span><span class="wp-src">' + esc(e.source) + (e.text ? ' · ' + esc(e.text) : '') + '</span><span class="wp-amt">' + (sign + e.delta) + '</span></div>';
  }).join('') : '<div class="game-empty">暂无流水</div>';
  const f = (k, l) => '<button class="wp-filt' + (wpLedgerFilt === k ? ' on' : '') + '" onclick="wpLedgerFilt=\'' + k + '\';renderAltar()">' + l + '</button>';
  return '<div class="section-title" style="margin-top:18px">📊 愿力明细 <span class="game-tag">收支流水</span></div>' +
    '<div class="wp-balance">当前余额 <b>' + bal + '</b> WP</div>' +
    '<div class="wp-filts">' + f('all', '全部') + f('in', '收入') + f('out', '支出') + '</div>' +
    '<div class="wp-ledger">' + rows + '</div>';
}

/* ---------- 渲染：导航树 ---------- */
function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = GROUPS.map(g => {
    const ms = MODULES.filter(m => m.group === g);
    if (!ms.length) return '';
    return `<h4>${g}</h4>` + ms.map(m => `<a href="#" data-id="${m.id}">${m.icon} ${esc(m.name)}</a>`).join('');
  }).join('');
  nav.querySelectorAll('a').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); go(a.dataset.id); };
  });
}

let CUR = 'dashboard';   // 当前视图 id（供交互后局部重渲染）
function go(id) {
  CUR = id;
  try { localStorage.setItem('gameLastView', id); } catch (e) {}
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('hot', a.dataset.id === id));
  renderMain(id);
  window.scrollTo(0, 0);
}

/* ---------- 备考：中级经济师（localStorage 进度追踪） ---------- */
const ECON_KEY = 'lifeos_econ_log';
function econLoad() { try { return JSON.parse(localStorage.getItem(ECON_KEY) || '[]'); } catch (e) { return []; } }
function econSave(a) { try { localStorage.setItem(ECON_KEY, JSON.stringify(a)); } catch (e) {} }
function econStats() {
  const log = econLoad();
  const totalMin = log.reduce((s, x) => s + (Number(x.min) || 0), 0);
  const days = new Set(log.map(x => x.date)).size;
  const subjects = {};
  log.forEach(x => { (x.subjects || []).forEach(su => { subjects[su] = (subjects[su] || 0) + (Number(x.min) || 0); }); });
  return { log, totalMin, days, subjects, count: log.length };
}
function renderEconomist() {
  const st = econStats();
  const today = todayCST();
  const subjects = ['经济学基础', '中级微观', '中级宏观', '财政税收', '货币金融', '统计', '会计', '法律'];
  const subOpts = subjects.map(s => '<option value="' + s + '">' + s + '</option>').join('');
  const recent = st.log.slice(0, 8).map(x => '<div class="log-row"><span class="log-ts">' + esc(x.date) + '</span><span class="log-item">' + esc((x.subjects || []).join('/') || '学习') + ' · ' + (x.min || 0) + ' 分钟</span></div>').join('') || '<div class="game-empty">还没有学习记录，记录第一次备考吧</div>';
  const subStats = Object.keys(st.subjects).map(s => '<div class="econ-sub"><span>' + esc(s) + '</span><b>' + st.subjects[s] + ' 分</b></div>').join('') || '<div class="game-empty">暂无科目统计</div>';
  return '<div class="section-title">📚 中级经济师备考 <span class="game-tag">自律修行 · 本地记录</span></div>' +
    '<div class="econ-overview">累计学习 <b>' + st.totalMin + '</b> 分钟　·　打卡 <b>' + st.days + '</b> 天　·　记录 <b>' + st.count + '</b> 次</div>' +
    '<div class="econ-add">' +
      '<input class="input" id="econDate" type="date" value="' + today + '">' +
      '<select class="input" id="econSubject">' + subOpts + '</select>' +
      '<input class="input" id="econMin" type="number" placeholder="分钟" style="max-width:110px">' +
      '<button class="btn primary" onclick="addEconLog()">＋ 记录学习</button>' +
    '</div>' +
    '<div class="econ-cols">' +
      '<div class="econ-col"><div class="game-card-title">科目投入</div>' + subStats + '</div>' +
      '<div class="econ-col"><div class="game-card-title">近期记录</div>' + recent + '</div>' +
    '</div>' +
    '<div class="meta" style="margin-top:12px">进度存于本机浏览器（localStorage），不影响主站数据；换设备不互通。</div>';
}
function addEconLog() {
  const date = (document.getElementById('econDate') || {}).value || todayCST();
  const subject = (document.getElementById('econSubject') || {}).value || '经济学基础';
  const min = Math.max(1, parseInt((document.getElementById('econMin') || {}).value) || 0);
  if (!min) { toast('请填写学习分钟数', 'warn'); return; }
  const log = econLoad();
  log.unshift({ date, subjects: [subject], min });
  econSave(log.slice(0, 200));
  toast('📚 已记录 ' + subject + ' ' + min + ' 分钟', 'good');
  renderMain('economist');
}

/* ---------- 日记（迁移主站三件套：写日记 / 日历 / 时间线） ---------- */
let diaryCalYear = null, diaryCalMonth = null, diarySelDate = null;
let diaryMoodSel = '';
const DIARY_MOODS = ['', '😄', '🙂', '😐', '😕', '😢'];
function diaryCalInit() {
  const n = new Date();
  if (diaryCalYear == null) diaryCalYear = n.getFullYear();
  if (diaryCalMonth == null) diaryCalMonth = n.getMonth();
  if (diarySelDate == null) diarySelDate = todayKey();
}
function diaryCalendarHtml() {
  diaryCalInit();
  const all = DATA.diary || [];
  const byDate = {}; all.forEach(d => { if (d.date) byDate[d.date] = true; });
  const first = new Date(diaryCalYear, diaryCalMonth, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(diaryCalYear, diaryCalMonth + 1, 0).getDate();
  const today = todayKey();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push('<div class="diary-cell muted"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = diaryCalYear + '-' + String(diaryCalMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const has = !!byDate[ds];
    const cls = ['diary-cell'];
    if (ds === today) cls.push('today');
    if (ds === diarySelDate) cls.push('sel');
    cells.push('<div class="' + cls.join(' ') + '" onclick="clickDiaryDate(\'' + ds + '\',' + has + ')">' + d + (has ? '<span class="dot"></span>' : '') + '</div>');
  }
  let cnt = 0;
  for (let d = 1; d <= daysInMonth; d++) { const ds = diaryCalYear + '-' + String(diaryCalMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); if (byDate[ds]) cnt++; }
  return '<div class="diary-cal-nav"><button class="btn ghost" onclick="diaryPrevMonth()">‹</button>' +
    '<span class="diary-cal-title" onclick="diaryOpenYm()">' + diaryCalYear + '年' + (diaryCalMonth + 1) + '月</span>' +
    '<button class="btn ghost" onclick="diaryNextMonth()">›</button>' +
    '<button class="btn btn-blue" onclick="diaryGoToday()">今天</button></div>' +
    '<div class="diary-cal-head"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>' +
    '<div class="diary-cal">' + cells.join('') + '</div>' +
    '<div class="diary-cal-stat">本月已写 ' + cnt + ' / ' + daysInMonth + ' 天</div>';
}
function diaryPrevMonth() { diaryCalMonth--; if (diaryCalMonth < 0) { diaryCalMonth = 11; diaryCalYear--; } renderMain('diary'); }
function diaryNextMonth() { diaryCalMonth++; if (diaryCalMonth > 11) { diaryCalMonth = 0; diaryCalYear++; } renderMain('diary'); }
function diaryGoToday() { const n = new Date(); diaryCalYear = n.getFullYear(); diaryCalMonth = n.getMonth(); diarySelDate = todayKey(); renderMain('diary'); }
function diaryOpenYm() {
  const curYear = diaryCalYear, curMonth = diaryCalMonth + 1;
  const years = []; for (let y = 2022; y <= new Date().getFullYear() + 1; y++) years.push(y);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const pick = document.createElement('div');
  pick.className = 'realm-modal';
  pick.id = 'diaryYmPicker';
  pick.innerHTML = '<div class="diary-ym-picker" onclick="event.stopPropagation()">' +
    '<div class="ym-years">' + years.map(y => '<div class="ym-year' + (y === curYear ? ' on' : '') + '" onclick="diaryYmSelYear(' + y + ')">' + y + '年</div>').join('') + '</div>' +
    '<div class="ym-months">' + months.map(m => '<div class="ym-month' + (m === curMonth ? ' on' : '') + '" onclick="diaryYmSelMonth(' + m + ')">' + m + '月</div>').join('') + '</div>' +
    '</div>';
  pick.onclick = () => pick.remove();
  document.body.appendChild(pick);
}
function diaryYmSelYear(y) {
  diaryCalYear = y;
  const p = document.getElementById('diaryYmPicker'); if (!p) return;
  p.querySelectorAll('.ym-year').forEach(e => e.classList.toggle('on', Number(e.textContent.replace('年', '')) === y));
}
function diaryYmSelMonth(m) {
  diaryCalMonth = m - 1;
  const p = document.getElementById('diaryYmPicker'); if (p) p.remove();
  renderMain('diary');
}
function clickDiaryDate(ds, has) {
  diarySelDate = ds;
  const d = (DATA.diary || []).find(x => x.date === ds);
  if (has && d) { openDiary(d.id); return; }
  diaryMoodSel = '';
  renderMain('diary');
  const ta = document.getElementById('diaryContent'); if (ta) { ta.value = ''; ta.focus(); }
  const dt = document.getElementById('diaryDate'); if (dt) dt.value = ds;
  const tt = document.getElementById('diaryTitle'); if (tt) tt.value = '';
  document.querySelectorAll('.diary-mood-pick').forEach(m => m.classList.remove('selected'));
  showDiaryMsg('已切到 ' + ds + '，写点什么保存即创建');
}
function diaryTimelineHtml() {
  const all = (DATA.diary || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!all.length) return '<div class="game-empty">还没有日记，写第一篇吧</div>';
  return all.map(d => '<div class="diary-item" onclick="openDiary(' + d.id + ')">' +
    '<div class="diary-item-head"><span class="diary-date">' + esc(d.date) + '</span>' +
    (d.mood ? '<span class="diary-mood-mini">' + esc(d.mood) + '</span>' : '') +
    '<span class="diary-title">' + esc(d.title || '无标题') + '</span></div>' +
    '<div class="diary-snippet">' + esc((d.content || '').slice(0, 90)) + ((d.content || '').length > 90 ? '…' : '') + '</div></div>').join('');
}
function renderDiary() {
  diaryCalInit();
  const moodPicks = DIARY_MOODS.map(m => '<span class="diary-mood-pick" data-m="' + m + '" onclick="selectDiaryMoodPick(this)">' + (m || '😐') + '</span>').join('');
  return '<div class="section-title">📔 日记 <span class="game-tag">迁移自人生管理系统 · 共 ' + (DATA.diary || []).length + ' 篇</span></div>' +
    '<div class="diary-layout">' +
      '<div class="card diary-write"><div class="card-title">📝 写日记</div>' +
        '<div style="display:flex;gap:10px;"><input class="input" id="diaryDate" type="date" style="max-width:170px;" value="' + todayKey() + '">' +
        '<input class="input" id="diaryTitle" type="text" placeholder="标题（可选）" style="flex:1;"></div>' +
        '<div style="margin-top:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="color:var(--muted);font-size:13px;">心情</span>' + moodPicks + '</div>' +
        '<textarea class="input" id="diaryContent" rows="10" placeholder="今天发生了什么？可直接粘贴你写好的日记…" style="margin-top:12px;"></textarea>' +
        '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;"><button class="btn primary" onclick="saveDiary()">保存日记</button>' +
        '<button class="btn" onclick="syncDiary()">🔄 同步 Obsidian</button></div>' +
        '<div id="diaryMsg" style="margin-top:10px;font-size:13px;min-height:18px;color:var(--accent);"></div>' +
      '</div>' +
      '<div class="card diary-side-cal"><div class="card-title">📅 日记日历</div>' + diaryCalendarHtml() + '</div>' +
    '</div>' +
    '<div class="card" style="margin-top:18px;"><div class="card-title">📚 日记时间线</div><div id="diaryList">' + diaryTimelineHtml() + '</div></div>';
}
function selectDiaryMoodPick(el) {
  document.querySelectorAll('.diary-mood-pick').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  diaryMoodSel = el.dataset.m;
}
function showDiaryMsg(msg, warn) {
  const el = document.getElementById('diaryMsg'); if (!el) return;
  el.textContent = msg || ''; el.style.color = warn ? '#c0392b' : 'var(--accent)';
}
async function saveDiary() {
  const dateEl = document.getElementById('diaryDate'); const titleEl = document.getElementById('diaryTitle'); const contentEl = document.getElementById('diaryContent');
  const date = (dateEl && dateEl.value) || todayKey();
  const title = titleEl ? titleEl.value.trim() : '';
  const content = contentEl ? contentEl.value.trim() : '';
  if (!content) { showDiaryMsg('日记内容不能为空', true); return; }
  const fields = Object.assign({ date: date, title: title, content: content, mood: diaryMoodSel }, { created_at: new Date().toISOString() });
  try {
    const j = await fetch('/api/insert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'diary', fields: fields }) });
    const r = await j.json();
    if (!r.ok) { showDiaryMsg('保存失败：' + (r.error || ''), true); return; }
    await loadData();
    diaryMoodSel = '';
    closeRealm();
    renderMain('diary');
    showDiaryMsg('已保存 ✓');
  } catch (e) { showDiaryMsg('保存失败：' + e.message, true); }
}
async function syncDiary() {
  showDiaryMsg('同步中…');
  try {
    const j = await fetch('/api/sync-diary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const r = await j.json();
    if (r.ok) { await loadData(); renderMain('diary'); showDiaryMsg('已同步：新增 ' + (r.inserted || 0) + ' 篇，更新 ' + (r.updated || 0) + ' 篇 ✓'); }
    else showDiaryMsg('同步失败：' + (r.error || ''), true);
  } catch (e) { showDiaryMsg('同步失败：' + e.message, true); }
}
let ddMood = '';
function weekdayCN(ds) { if (!ds) return ''; const d = new Date(ds + 'T00:00:00'); if (isNaN(d.getTime())) return ''; return '星期' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]; }
function fmtDateCN(ds) { const m = (ds || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? (m[1] + '年' + m[2] + '月' + m[3] + '日') : (ds || ''); }
function diaryReadHtml(content) {
  const lines = (content || '').split('\n');
  let html = '', para = [];
  const bold = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const flush = () => { if (para.length) { html += '<p>' + bold(para.join('<br>')) + '</p>'; para = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.charAt(0) === '>') { flush(); html += '<blockquote>' + bold(esc(line.slice(1).trim())) + '</blockquote>'; continue; }
    if (line.startsWith('——')) { flush(); html += '<div class="dd-sign">' + esc(line) + '</div>'; continue; }
    para.push(bold(esc(line)));
  }
  flush();
  return html;
}
function openDiary(id) {
  const d = (DATA.diary || []).find(x => x.id === id); if (!d) return;
  ddMood = d.mood || '';
  const readView = '<div class="dd-paper"><div class="dd-paper-head"><div class="dd-paper-date">' + esc(fmtDateCN(d.date)) + '</div><div class="dd-paper-week">' + weekdayCN(d.date) + '</div>' + (d.mood ? '<div class="dd-paper-mood">心情：' + esc(d.mood) + '</div>' : '') + '</div><div class="dd-paper-body">' + diaryReadHtml(d.content) + '</div><div class="dd-paper-footer">— 拾光 LifeOS · ' + esc(d.date) + ' —</div></div>';
  const editView = '<div id="ddEdit" style="display:none;">' +
    '<div style="display:flex;gap:10px;margin-bottom:12px;"><input class="input" id="ddDate" type="date" value="' + esc(d.date || '') + '" style="max-width:170px;"><input class="input" id="ddTitle" type="text" value="' + esc(d.title || '') + '" placeholder="标题（可选）" style="flex:1;"></div>' +
    '<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><span style="color:var(--muted);font-size:13px;">心情</span>' + DIARY_MOODS.map(m => '<span class="dd-mood" data-m="' + m + '" onclick="selectDdMood(this)">' + (m || '😐') + '</span>').join('') + '</div>' +
    '<textarea class="input" id="ddContent" rows="14" style="margin-bottom:12px;">' + esc(d.content || '') + '</textarea>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn primary" onclick="saveDiaryDetail(' + d.id + ')">保存</button><button class="btn" onclick="if(confirm(\'删除这篇日记？\'))delDiary(' + d.id + ')">删除</button></div></div>';
  const box = document.createElement('div');
  box.className = 'realm-modal';
  box.innerHTML = '<div class="realm-modal-box diary-detail-modal"><h3>📔 ' + esc(d.title || '无标题') + '</h3>' +
    '<div class="dd-actions"><button class="btn" id="ddEditBtn" onclick="toggleDiaryEdit()">✏️ 编辑</button></div>' +
    '<div id="ddRead">' + readView + '</div>' + editView +
    '<button class="realm-cult-btn" style="margin-top:10px;background:var(--panel2);color:var(--text)" onclick="closeRealm()">关闭</button></div>';
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  document.body.appendChild(box);
  document.querySelectorAll('.dd-mood').forEach(m => m.classList.toggle('selected', m.dataset.m === ddMood && !!ddMood));
}
function toggleDiaryEdit() {
  const r = document.getElementById('ddRead'), e = document.getElementById('ddEdit'), b = document.getElementById('ddEditBtn');
  if (!r || !e) return;
  if (e.style.display === 'none') { e.style.display = ''; r.style.display = 'none'; if (b) b.textContent = '👁 阅读'; }
  else { e.style.display = 'none'; r.style.display = ''; if (b) b.textContent = '✏️ 编辑'; }
}
function selectDdMood(el) { document.querySelectorAll('.dd-mood').forEach(m => m.classList.remove('selected')); el.classList.add('selected'); ddMood = el.dataset.m; }
async function saveDiaryDetail(id) {
  const fields = { date: document.getElementById('ddDate').value, title: document.getElementById('ddTitle').value.trim(), content: document.getElementById('ddContent').value, mood: ddMood };
  try {
    const j = await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'diary', id: id, fields: fields }) });
    const r = await j.json();
    if (!r.ok) { alert('保存失败：' + (r.error || '')); return; }
    await loadData(); closeRealm(); renderMain('diary'); showDiaryMsg('已保存 ✓');
  } catch (e) { alert('保存失败：' + e.message); }
}
async function delDiary(id) {
  try {
    const j = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'diary', id: id }) });
    const r = await j.json();
    if (!r.ok) { alert('删除失败：' + (r.error || '')); return; }
    await loadData(); closeRealm(); renderMain('diary'); showDiaryMsg('已删除');
  } catch (e) { alert('删除失败：' + e.message); }
}

/* ---------- 通用管理面板（每个模块顶部 🛠 管理，支持增删改） ---------- */
let EDIT = {};
const MGMT = {
  diary:   { store:'api', table:'diary', dataKey:'diary', nameF:d=>d.title||d.date,
    fields:[{k:'date',label:'日期',type:'date'},{k:'title',label:'标题',type:'text'},{k:'mood',label:'心情',type:'text'},{k:'content',label:'内容',type:'textarea'}] },
  weight:  { store:'api', table:'weight', dataKey:'weight', nameF:d=>(d.date||'')+' '+(d.weight||''),
    fields:[{k:'date',label:'日期',type:'date'},{k:'weight',label:'体重',type:'number'},{k:'note',label:'备注',type:'text'}] },
  npcs:    { store:'api', table:'npcs', dataKey:'npcs', nameF:d=>d.name||('NPC'+d.id),
    fields:[{k:'name',label:'名字',type:'text'},{k:'type',label:'类型',type:'select',opts:['家人','恋慕','朋友']},{k:'region',label:'所属州',type:'text'},{k:'desc',label:'人设',type:'text'},{k:'x',label:'地图X',type:'number'},{k:'y',label:'地图Y',type:'number'}] },
  dungeon: { store:'api', table:'taskboard', dataKey:'taskboard', nameF:d=>d.text||('任务'+d.id),
    fields:[{k:'grp',label:'分组',type:'text'},{k:'text',label:'内容',type:'text'},{k:'points',label:'愿力',type:'number'},{k:'depth',label:'层级',type:'number'}] },
  dungeonTasks: { store:'dailies', nameF:d=>d.name||('任务'+d.id),
    fields:[{k:'name',label:'名称(可带emoji)',type:'text'},{k:'desc',label:'描述',type:'text'},{k:'realm',label:'对应境界key',type:'text'},{k:'wp',label:'完成愿力奖励',type:'number'},{k:'focus',label:'进入五大要事(1/0)',type:'number'},{k:'wpEarly',label:'[睡眠]早睡愿力',type:'number'},{k:'wpOntime',label:'[睡眠]按时愿力',type:'number'}] },
  cook:    { store:'api', table:'recipes', dataKey:'food', dataSub:'recipes', nameF:d=>d.name||('菜谱'+d.id),
    fields:[{k:'name',label:'菜名',type:'text'},{k:'category',label:'分类',type:'text'},{k:'difficulty',label:'难度',type:'number'},{k:'cost',label:'成本',type:'text'},{k:'time',label:'时长(分)',type:'number'},{k:'ingredients',label:'食材(JSON)',type:'text'},{k:'steps',label:'步骤',type:'textarea'}] },
  fun:     { store:'local', localKey:'game_fun_log', nameF:d=>d.title||d.name||('记录'+d.id),
    fields:[{k:'title',label:'标题',type:'text'},{k:'type',label:'类型',type:'select',opts:['电视剧','电影','动漫','漫画','书','游戏','歌曲']},{k:'rating',label:'评分',type:'number'},{k:'note',label:'笔记',type:'textarea'}] },
  economist:{ store:'econ', nameF:(d,i)=>(d.date||'')+' 学习 '+(d.min||0)+'分',
    fields:[{k:'date',label:'日期',type:'date'},{k:'min',label:'分钟',type:'number'},{k:'subjects',label:'科目(逗号分隔)',type:'text'}] },
  sleep:   { store:'local', localKey:'game_sleep_log', nameF:d=>(d.date||'')+' '+(d.bed||''),
    fields:[{k:'date',label:'日期',type:'date'},{k:'bed',label:'就寝时间',type:'time'},{k:'tier',label:'档位',type:'select',opts:['early','ontime','late']}] },
  skill:   { store:'player', playerField:'skills', isObj:true, nameF:d=>d.name||d.id,
    fields:[{k:'name',label:'技能名(即key)',type:'text'},{k:'level',label:'等级',type:'number'}] },
  realm:   { store:'player', playerField:'realms', isObj:true, nameF:d=>d.name||d.id,
    fields:[{k:'name',label:'境界key',type:'text'},{k:'layer',label:'层',type:'number'},{k:'xp',label:'经验',type:'number'},{k:'round',label:'轮回',type:'number'}] },
  bag:     { store:'player', playerField:'inventory', nameF:d=>d.name||('物品'+d.id),
    fields:[{k:'name',label:'名称',type:'text'},{k:'type',label:'类型',type:'text'},{k:'location',label:'位置',type:'select',opts:['bag','warehouse']},{k:'count',label:'数量',type:'number'}] },
  heart:   { store:'heart', nameF:d=>d.name||d.id,
    fields:[{k:'name',label:'心法名',type:'text'},{k:'effect',label:'效果标签',type:'text'},{k:'desc',label:'释义',type:'textarea'}] },
  demon:   { store:'readonly', note:'魔障为种子数据，需在主站/后端维护，不在本页增删。' },
  trial:   { store:'readonly', note:'周天试炼为关卡定义，不是用户数据，无需增删。' },
  map:     { store:'readonly', note:'地图由 NPC 所属州派生，去「江湖 NPC」管理即可。' }
};
function mgmtBtnHtml(id) {
  if (!MGMT[id]) return '';
  const on = EDIT[id];
  return '<div class="mgmt-bar"><button class="btn ' + (on ? 'primary' : '') + ' sm" onclick="mgmtToggle(\'' + id + '\')">🛠 ' + (on ? '管理中' : '管理') + '</button>' +
    (on ? '<button class="btn sm" onclick="mgmtPanel(\'' + id + '\')">列表管理</button>' : '') + '</div>';
}
function mgmtToggle(id) { EDIT[id] = !EDIT[id]; renderMain(id); }
function mgmtList(kind) {
  const c = MGMT[kind]; if (!c) return [];
  if (c.store === 'api') { const arr = c.dataSub ? (((DATA[c.dataKey] || {})[c.dataSub]) || []) : (DATA[c.dataKey] || []); return arr.slice(); }
  if (c.store === 'local') { try { return JSON.parse(localStorage.getItem(c.localKey) || '[]'); } catch (e) { return []; } }
  if (c.store === 'econ') { return econLoad().map((x, i) => Object.assign({ id: String(i) }, x)); }
  if (c.store === 'player') { const p = player(); if (c.isObj) { const o = p[c.playerField] || {}; return Object.keys(o).map(k => Object.assign({ id: k, name: k }, o[k])); } return (p[c.playerField] || []).slice(); }
  if (c.store === 'heart') { return heartCustom().slice(); }
  if (c.store === 'dailies') { return dailies().slice(); }
  return [];
}
function modName(id) { const m = MODULES.find(x => x.id === id); return m ? m.name : id; }
function mgmtPanel(kind, scope) {
  const c = MGMT[kind]; if (!c) return;
  let body;
  if (c.store === 'readonly') body = '<div class="meta">' + esc(c.note || '该模块为只读，不可在本页增删。') + '</div>';
  else {
    const items = mgmtList(kind);
    let list = items;
    if (scope === 'focus') list = items.filter(x => Number(x.focus) > 0);
    else if (scope === 'rest') list = items.filter(x => !x.focus || Number(x.focus) === 0);
    const rows = list.length ? list.map(it => {
      const nm = c.nameF ? c.nameF(it) : (it.name || it.id || '');
      const idv = (it.id != null) ? it.id : (it.date || '');
      return '<div class="mgmt-row"><span class="mgmt-name">' + esc(String(nm)) + '</span>' +
        '<span class="mgmt-acts"><button class="btn sm" onclick="mgmtModal(\'' + kind + '\',\'' + encodeURIComponent(idv) + '\')">✏️</button>' +
        '<button class="btn sm danger" onclick="mgmtDel(\'' + kind + '\',\'' + encodeURIComponent(idv) + '\')">🗑️</button></span></div>';
    }).join('') : '<div class="game-empty">暂无数据</div>';
    const addHint = scope === 'focus' ? '（新增默认进入要事）' : scope === 'rest' ? '（新增默认不进要事）' : '';
    body = rows + '<button class="btn primary" style="margin-top:8px" onclick="mgmtModal(\'' + kind + '\',\'\')">＋ 新增' + addHint + '</button>';
  }
  const scopeLabel = scope === 'focus' ? '（今日五大要事）' : scope === 'rest' ? '（其余日常副本）' : '';
  const box = document.createElement('div'); box.className = 'realm-modal';
  box.innerHTML = '<div class="realm-modal-box"><h3>🛠 管理 · ' + esc(modName(kind)) + scopeLabel + '</h3><div class="mgmt-list">' + body + '</div>' +
    '<button class="realm-cult-btn" style="margin-top:10px;background:var(--panel2);color:var(--text)" onclick="closeRealm()">关闭</button></div>';
  box.onclick = e => { if (e.target === box) box.remove(); };
  document.body.appendChild(box);
}
function mgmtModal(kind, idEnc) {
  const c = MGMT[kind]; const id = idEnc ? decodeURIComponent(idEnc) : '';
  const items = mgmtList(kind);
  const it = id !== '' ? items.find(x => (x.id != null ? String(x.id) : (x.date || '')) === id) : null;
  const fieldsHtml = (c.fields || []).map(f => {
    const val = it ? (it[f.k] != null ? it[f.k] : '') : '';
    if (f.type === 'textarea') return '<label class="mgmt-fld"><span>' + esc(f.label) + '</span><textarea class="input" id="mgmt_' + f.k + '">' + esc(val) + '</textarea></label>';
    if (f.type === 'select') return '<label class="mgmt-fld"><span>' + esc(f.label) + '</span><select class="input" id="mgmt_' + f.k + '">' + f.opts.map(o => '<option' + (o == val ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></label>';
    return '<label class="mgmt-fld"><span>' + esc(f.label) + '</span><input class="input" id="mgmt_' + f.k + '" type="' + (f.type === 'number' ? 'number' : f.type) + '" value="' + esc(val) + '"></label>';
  }).join('');
  const box = document.createElement('div'); box.className = 'realm-modal';
  box.innerHTML = '<div class="realm-modal-box"><h3>' + (id ? '✏️ 编辑' : '＋ 新增') + '</h3><div class="mgmt-form">' + (fieldsHtml || '<div class="meta">该模块暂不支持表单编辑</div>') + '</div>' +
    '<div style="display:flex;gap:10px;margin-top:10px"><button class="btn primary" onclick="mgmtSave(\'' + kind + '\',\'' + encodeURIComponent(id) + '\')">保存</button><button class="btn" onclick="closeRealm()">取消</button></div></div>';
  box.onclick = e => { if (e.target === box) box.remove(); };
  document.body.appendChild(box);
}
function stripName(f) { const g = Object.assign({}, f); delete g.name; return g; }
async function mgmtSave(kind, idEnc) {
  const c = MGMT[kind]; const id = idEnc ? decodeURIComponent(idEnc) : '';
  const fields = {};
  (c.fields || []).forEach(f => { const v = document.getElementById('mgmt_' + f.k); if (!v) return; let val = v.value; if (f.type === 'number') val = val === '' ? '' : Number(val); fields[f.k] = val; });
  await mgmtUpsert(kind, id, fields);
}
async function mgmtUpsert(kind, id, fields) {
  const c = MGMT[kind];
  try {
    if (c.store === 'api') {
      if (id !== '') { const j = await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: c.table, id: Number(id), fields }) }); const r = await j.json(); if (!r.ok) { toast('更新失败：' + (r.error || ''), 'warn'); return; } }
      else { const j = await fetch('/api/insert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: c.table, fields }) }); const r = await j.json(); if (!r.ok) { toast('新增失败：' + (r.error || ''), 'warn'); return; } }
      await loadData();
    } else if (c.store === 'local') {
      const arr = JSON.parse(localStorage.getItem(c.localKey) || '[]');
      if (id !== '') { const idx = arr.findIndex(x => (x.id != null ? String(x.id) : '') === id); if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], fields); }
      else { fields.id = Date.now(); arr.push(fields); }
      localStorage.setItem(c.localKey, JSON.stringify(arr));
    } else if (c.store === 'econ') {
      const arr = econLoad();
      const entry = { date: fields.date || todayKey(), min: Number(fields.min || 0), subjects: (fields.subjects || '').split(',').map(s => s.trim()).filter(Boolean) };
      if (id !== '') { const idx = arr.findIndex((x, i) => String(i) === id); if (idx >= 0) arr[idx] = entry; } else arr.unshift(entry);
      econSave(arr.slice(0, 200));
    } else if (c.store === 'player') {
      const p = player(); let cur = p[c.playerField]; cur = c.isObj ? (cur || {}) : (cur || []);
      if (c.isObj) {
        if (id !== '') cur[id] = Object.assign({}, cur[id] || {}, stripName(fields));
        else { const key = fields.name; if (!key) { toast('需填名称', 'warn'); return; } cur[key] = stripName(fields); }
      } else {
        if (id !== '') { const idx = cur.findIndex(x => (x.id != null ? String(x.id) : '') === id); if (idx >= 0) cur[idx] = Object.assign({}, cur[idx], fields); }
        else { fields.id = Date.now(); cur.push(fields); }
      }
      const obj = {}; obj[c.playerField] = cur;
      if (c.playerField === 'inventory') {
        const j = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', inventory: cur }) });
        const r = await j.json(); if (!r.ok) { toast('保存失败：' + (r.error || ''), 'warn'); return; } if (r.inventory) DATA.player.inventory = r.inventory;
      } else {
        const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: obj }) });
        const r = await j.json(); if (!r.ok) { toast('保存失败：' + (r.error || ''), 'warn'); return; } await loadData();
      }
    } else if (c.store === 'heart') {
      if (id !== '') { const cid = Number(String(id).replace('c_', '')); const arr = heartCustom(); const idx = arr.findIndex(x => x.id === cid); if (idx >= 0) { arr[idx] = Object.assign({}, arr[idx], { name: fields.name || arr[idx].name, effect: fields.effect || arr[idx].effect, desc: fields.desc || arr[idx].desc }); try { localStorage.setItem('lifeos_heartCustom', JSON.stringify(arr)); } catch (e) {} } }
      else { if (!fields.name) { toast('需填心法名', 'warn'); return; } const arr = heartCustom(); arr.push({ id: Date.now(), name: fields.name, effect: fields.effect || '', desc: fields.desc || '', buff: {} }); try { localStorage.setItem('lifeos_heartCustom', JSON.stringify(arr)); } catch (e) {} }
    } else if (c.store === 'dailies') {
      const arr = dailies().slice();
      if (id !== '') { const idx = arr.findIndex(x => x.id === id); if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], fields); else { fields.id = id; arr.push(fields); } }
      else { fields.id = 'custom_' + Date.now(); arr.push(fields); }
      saveDailies(arr);
    } else { toast('该模块暂不支持保存', 'warn'); return; }
    toast('已保存 ✓', 'good'); closeRealm(); renderMain(kind);
  } catch (e) { toast('保存失败：' + e.message, 'warn'); }
}
async function mgmtDel(kind, id) {
  const c = MGMT[kind];
  if (!confirm('确定删除该条目？')) return;
  try {
    if (c.store === 'api') { const j = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: c.table, id: Number(id) }) }); const r = await j.json(); if (!r.ok) { toast('删除失败：' + (r.error || ''), 'warn'); return; } await loadData(); }
    else if (c.store === 'local') { const arr = JSON.parse(localStorage.getItem(c.localKey) || '[]'); const idx = arr.findIndex(x => (x.id != null ? String(x.id) : '') === id); if (idx >= 0) arr.splice(idx, 1); localStorage.setItem(c.localKey, JSON.stringify(arr)); }
    else if (c.store === 'econ') { const arr = econLoad(); const idx = arr.findIndex((x, i) => String(i) === id); if (idx >= 0) arr.splice(idx, 1); econSave(arr); }
    else if (c.store === 'player') { const p = player(); let cur = p[c.playerField]; if (c.isObj) { cur = Object.assign({}, cur || {}); delete cur[id]; } else { cur = (cur || []).filter(x => (x.id != null ? String(x.id) : '') !== id); } if (c.playerField === 'inventory') { const j = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', inventory: cur }) }); const r = await j.json(); if (!r.ok) { toast('删除失败：' + (r.error || ''), 'warn'); return; } if (r.inventory) DATA.player.inventory = r.inventory; } else { const obj = {}; obj[c.playerField] = cur; const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: obj }) }); const r = await j.json(); if (!r.ok) { toast('删除失败：' + (r.error || ''), 'warn'); return; } await loadData(); } }
    else if (c.store === 'heart') { delHeartCustom(Number(String(id).replace('c_', ''))); return; }
    else if (c.store === 'dailies') { const arr = dailies().slice(); const idx = arr.findIndex(x => x.id === id); if (idx >= 0) arr.splice(idx, 1); saveDailies(arr); }
    else { toast('该模块不可删除', 'warn'); return; }
    toast('已删除', 'good'); closeRealm(); renderMain(kind);
  } catch (e) { toast('删除失败：' + e.message, 'warn'); }
}

/* ---------- 渲染：主内容 ---------- */
function renderMain(id) {
  const main = document.getElementById('main');
  const mod = MODULES.find(m => m.id === id) || MODULES[0];
  let html = '';
  switch (id) {
    case 'dashboard': html = renderDashboard(); break;
    case 'demon':     html = renderDemon(); break;
    case 'altar':     html = renderAltar(); break;
    case 'dungeon':   html = renderDungeon(); break;
    case 'cook':      html = renderCook(); break;
    case 'bag':       html = renderBag(); break;
    case 'skill':     html = renderSkill(); break;
    case 'realm':     html = renderRealm(); break;
    case 'npc':       html = renderNpc(); break;
    case 'map':       html = renderMap(); break;
    case 'weight':    html = renderWeight(); break;
    case 'sleep':     html = renderSleep(); break;
    case 'fun':       html = renderFun(); break;
    case 'diary':     html = renderDiary(); break;
    case 'heart':     html = renderHeart(); break;
    case 'char':      html = renderChar(); break;
    case 'economist': html = renderEconomist(); break;
    case 'trial':     html = renderTrial(); break;
    default: html = renderPlaceholder(mod.name, '该模块数据接口将在二期接入，本期仅占位。');
  }
  main.innerHTML = (id === 'dungeon' ? '' : mgmtBtnHtml(id)) + html;
}

function dungeonNavMod(id) {
  if (id === 'econ') return 'economist';
  if (id === 'weight') return 'weight';
  if (id === 'cook') return 'cook';
  if (id === 'sleep') return 'sleep';
  return 'dungeon';
}
function dashTop5() {
  return dailies().filter(d => d.focus).map(d => ({
    icon: leadEmoji(d.name),
    name: d.name,
    mod: dungeonNavMod(d.id),
    done: () => dungeonDoneCheck(d.id),
    hint: (d.realm ? d.realm + ' +1' : '日常') + (d.wp ? ' · 愿力+' + d.wp : '')
  }));
}
function renderDashboard() {
  const p = player();
  const recipes = food().recipes || [];
  const got = recipes.filter(r => r.obtained !== 0 && r.obtained !== false).length;
  const ds = demons();
  const bag = inv().filter(i => i.location === 'bag').length;
  const wh = inv().filter(i => i.location === 'warehouse').length;
  const hero = `<div class="hero"><h1>欢迎回来，凯</h1><p>今日修行概览 · 愿力 <span class="c-wp">${num(p.willpower, 0)}</span> · ${ds.length} 道魔障待镇压</p></div>`;
  const top5 = dashTop5().map(t => {
    const done = t.done();
    return `<div class="top5-item${done ? ' done' : ''}" onclick="go('${t.mod}')">
      <span class="top5-ic">${t.icon}</span>
      <span class="top5-main"><span class="top5-name">${t.name}</span><span class="top5-hint">${t.hint}</span></span>
      <span class="top5-flag">${done ? '✅ 已完成' : '⬜ 待办'}</span>
    </div>`;
  }).join('');
  const top5Wrap = `<div class="section-title">🔥 今日五大要事</div><div class="top5">${top5}</div>`;
  const cards = `
  <div class="cards">
    <div class="card"><span class="tag">🩸 魔障</span><h3>${ds.length} 道待镇压</h3>
      <div class="meta">${ds.slice(0, 3).map(d => esc(d.name)).join('、') || '暂无'}</div></div>
    <div class="card"><span class="tag">🍳 烹饪</span><h3>已习得 ${got}/${recipes.length}</h3>
      <div class="meta">菜谱库总 ${recipes.length} 道</div></div>
    <div class="card"><span class="tag">🎒 背包仓库</span><h3>背包 ${bag}/${BAG_CAP}</h3>
      <div class="meta">仓库 ${wh}/${getWhCap()} 格</div></div>
    <div class="card"><span class="tag">🔮 命愿祈铺</span><h3><span class="c-lp">LP ${num(p.lucky, 0)}</span> → <span class="c-dp">DP ${num(p.destiny, 0)}</span></h3>
      <div class="meta">凝结比例 10 LP = 1 DP</div></div>
  </div>`;
  const snap = `<div class="section-title">🎮 角色快照</div><div class="dash-snap">
    <div class="dash-snap-head"><div class="game-avatar">🎮</div><div><div class="game-char-name">玩家 · 凯</div><div class="game-char-sub">Lv.${num(p.level, 1)}</div></div></div>
    <div class="dash-snap-stats">
      <div><b>${num(p.willpower, 0)}</b><span>愿力 WP</span></div>
      <div><b>${num(p.lucky, 0)}</b><span>幸运 LP</span></div>
      <div><b>${num(p.destiny, 0)}</b><span>天命 DP</span></div>
      <div><b>${skillTotalLevel()}</b><span>技能</span></div>
      <div><b>${realmTotalLayers()}</b><span>境界</span></div>
    </div></div>`;
  return hero + top5Wrap + `<div class="section-title">📊 修行概览</div>` + cards + snap;
}

function demonDanger(d) {
  if (d.key === 'meimo') { const sed = Number((DATA.succubus || {}).seductions) || 0; const base = Math.max(0, Math.min(1, sed / 3)); return Math.max(0, base * (1 - heartBuffSum('meimoResist') / 100)); }
  if (d.key === 'xinmo') { const base = Math.max(0, Math.min(1, xinmoHpFromDungeons() / 100)); return Math.max(0, base * (1 - heartBuffSum('xinmoResist') / 100)); }
  const mx = Number(d.max_hp) || 1; return mx > 0 ? Math.max(0, Math.min(1, (Number(d.hp) || 0) / mx)) : 0;
}
function renderDemon() {
  const ds = demons();
  if (!ds.length) return renderPlaceholder('魔障', '暂无魔障数据。');
  let primaryKey = '';
  if (ds.length) { let best = -1; ds.forEach(d => { const dg = demonDanger(d) * (Number(d.threat) || 1); if (dg > best) { best = dg; primaryKey = d.key; } }); }
  const iconOf = k => k === 'xinmo' ? '👹' : (k === 'meimo' ? '🦑' : '👾');
  const avatars = ds.map(d => `<div class="demon-avatar${d.key === primaryKey ? ' primary' : ''}"><div class="da-icon">${iconOf(d.key)}</div><div class="da-name">${esc(d.name || '魔')}</div>${d.key === primaryKey ? '<div class="da-tag">主威胁</div>' : ''}</div>`).join('');
  const suc = DATA.succubus || {};
  const sed = Number(suc.seductions) || 0;
  const sunk = !!suc.sunk;
  let meimoForm = '初诱（新手护盾）'; if (sunk) meimoForm = '终焉 · 沉沦'; else if (sed >= 2) meimoForm = '噬心'; else if (sed === 1) meimoForm = '缠丝';
  const cards = ds.map(d => {
    const hp = num(d.hp, 0), max = d.key === 'xinmo' ? 100 : (num(d.max_hp, 1) || 1);
    const pct = Math.max(0, Math.min(100, Math.round(hp / max * 100)));
    const dg = demonDanger(d);
    const danger = dg >= 0.66;
    let extra = '';
    if (d.key === 'xinmo') {
      extra = `<div class="meta">每完成一个每日秘境副本对其造成伤害（每日 0 点复苏）。${hp <= 0 ? '🎉 已击破！' : '未除则降低副本愿力产出。'}</div>`;
    } else if (d.key === 'meimo') {
      extra = `<div class="meta">本周诱惑 ${sed}/3 · 形态：${esc(meimoForm)}${sunk ? '（收益减半，周一解除）' : ''}</div>`;
    } else if (d.extra && d.extra.note) {
      extra = `<div class="meta">${esc(d.extra.note)}</div>`;
    }
    let action = '';
    if (d.key === 'meimo') {
      action = sunk
        ? '<button class="btn primary sm" disabled>本周已沉沦，无法再抵抗</button>'
        : '<button class="btn primary sm" onclick="openSuccubusModal()">🌹 遭遇魅魔诱惑</button>';
    }
    return `<div class="card demon-card${danger ? ' danger' : ''}">
      <div class="dc-head"><span class="dc-icon">${iconOf(d.key)}</span><div><div class="tag">${esc((d.kind === '魔杖' ? '魔障' : d.kind) || '魔障')} · ${esc(d.cycle || 'daily')}</div><h3>${esc(d.name)}</h3></div></div>
      <div class="meta">HP ${hp}/${max} · 威胁 ${num(d.threat, 0)}${danger ? ' · ⚠️ 高危' : ''}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${extra}
      ${action}
    </div>`;
  }).join('');
  return `<div class="section-title">🩸 魔障 · 共 ${ds.length} 道魔障</div>
  <div class="meta" style="margin-bottom:8px">魔渊之中的魔障，分 <b>心魔</b> 与 <b>魅魔</b> 两类（日后可续增）。</div>
  <div class="demon-avatars-title">主威胁高亮</div>
  <div class="demon-avatars">${avatars}</div>
  <div class="cards">${cards}</div>
  <details class="demon-rules"><summary>规则说明</summary>
    <div class="demon-rules-body">· <b>心魔·拖延</b>：完成每日秘境副本对其造成伤害，HP 归零即击破；每日 0 点复苏，未除则降低副本愿力产出。<br>· <b>魅魔·诱惑</b>：每周计数 0/3，周一 0 点重置；抵御成功 +1 愿力，失败按梯度处理（第1次免费 / 第2次耗幸运点 / 第3次沉沦，收益减半）。点击魅魔卡「遭遇魅魔诱惑」进行判定。</div>
  </details>`;
}

/* ---------- 通用确认弹窗（不可逆操作二次确认） ---------- */
let _confirmCb = null;
function showConfirm(title, msg, cb, yesLabel) {
  const t = document.getElementById('confirmTitle'); if (t) t.textContent = title;
  const m = document.getElementById('confirmMsg'); if (m) m.textContent = msg;
  const y = document.getElementById('confirmYes'); if (y && yesLabel) y.textContent = yesLabel;
  _confirmCb = cb;
  const el = document.getElementById('confirmModal'); if (el) el.classList.add('open');
}
function closeConfirm() { const el = document.getElementById('confirmModal'); if (el) el.classList.remove('open'); _confirmCb = null; }
function onConfirmYes() { const cb = _confirmCb; _confirmCb = null; closeConfirm(); if (cb) cb(); }
/* ---------- 命愿祈铺 · 货架（与主站商城同源 shop_items，只读共享 life.db） ---------- */
const CUR_LABEL = { wp: '愿力点', lp: '幸运点', dp: '天命点' };
const CUR_ABBR = { wp: 'WP', lp: 'LP', dp: 'DP' };
function shopBal() {
  const p = player();
  return { wp: num(p.willpower, 0), lp: num(p.lucky, 0), dp: num(p.destiny, 0) };
}
function renderShopItems() {
  const items = (DATA && DATA.shopItems) || [];
  if (!items.length) return '<div class="section-title" style="margin-top:18px">🏪 祈铺货架</div><div class="meta">暂无在售机缘，去主站命愿祈铺上架商品后会自动同步到这里。</div>';
  const zones = [];
  const byZone = {};
  items.forEach(it => {
    const z = it.zone || '其他';
    if (!byZone[z]) { byZone[z] = []; zones.push(z); }
    byZone[z].push(it);
  });
  const bal = shopBal();
  const card = (it) => {
    const cur = it.currency || 'wp';
    const price = Number(it.price) || 0;
    const have = bal[cur] != null ? bal[cur] : 0;
    const outOfStock = it.stock != null && Number(it.stock) <= 0;
    const poor = have < price;
    const disabled = outOfStock || poor;
    const color = it.iconColor || '#C8A25A';
    return '<div class="shop-card' + (disabled ? ' disabled' : '') + '" data-name="' + esc(it.name) + '" data-cat="' + esc(it.category || '') + '">' +
      '<div class="shop-card-head"><div class="shop-card-icon" style="background:' + esc(color) + '"></div><div class="shop-card-name">' + esc(it.name) + '</div></div>' +
      (it.desc ? '<div class="shop-card-desc">' + esc(it.desc) + '</div>' : '<div class="shop-card-desc"></div>') +
      '<div class="shop-badges">' +
        '<span class="shop-badge">' + esc(it.category || '材料') + '</span>' +
        (it.isLimited ? '<span class="shop-badge limit">限购</span>' : '') +
        (it.section === 'timed' ? '<span class="shop-badge timed">限时</span>' : '') +
      '</div>' +
      '<div class="shop-card-foot">' +
        '<span class="shop-price">' + price + ' ' + CUR_ABBR[cur] + (poor ? ' <span class="shop-poor">（不足）</span>' : '') + '</span>' +
        '<button class="shop-buy" ' + (disabled ? 'disabled' : '') + ' onclick="shopBuy(' + it.id + ')">' + (outOfStock ? '已兑完' : '兑换') + '</button>' +
      '</div>' +
      '<div class="shop-card-meta">库存 ' + (it.stock == null ? '∞' : it.stock) + (it.limitCycle ? ' · 每周期限 ' + it.limitCycle : '') + '</div>' +
    '</div>';
  };
  const zoneHtml = zones.map(z => {
    const zc = byZone[z][0];
    const zcur = (zc && zc.currency) || 'wp';
    return '<div class="shop-zone zone-' + zcur + '">' +
      '<div class="shop-zone-head"><div class="shop-zone-title">' + esc(z) + '</div><div class="shop-zone-sub">以 ' + CUR_LABEL[zcur] + '（' + CUR_ABBR[zcur] + '）兑换</div></div>' +
      '<div class="shop-grid">' + byZone[z].map(card).join('') + '</div>' +
    '</div>';
  }).join('');
  return '<div class="section-title" style="margin-top:18px">🏪 祈铺货架 <span class="game-tag">与主站命愿祈铺同源 · 兑换即入账背包</span></div>' +
    '<div class="meta" style="margin:4px 0 10px">当前余额：🍀 WP ' + bal.wp + ' · 🍀 LP ' + bal.lp + ' · 👑 DP ' + bal.dp + '。兑换消耗对应货币，限量商品每周期限购。</div>' +
    '<div class="shop-zones">' + zoneHtml + '</div>';
}
async function shopBuy(id) {
  const it = ((DATA && DATA.shopItems) || []).find(x => x.id === id);
  if (!it) return;
  const cur = it.currency || 'wp';
  const price = Number(it.price) || 0;
  const bal = shopBal();
  const have = bal[cur] != null ? bal[cur] : 0;
  if (have < price) { toast('【' + CUR_LABEL[cur] + '】不足，还差 ' + (price - have), 'warn'); return; }
  if (it.stock != null && Number(it.stock) <= 0) { toast('该商品已兑完', 'warn'); return; }
  showConfirm('确认兑换', '确定兑换【' + it.name + '】吗？\n消耗 ' + price + ' ' + CUR_LABEL[cur] + '（' + CUR_ABBR[cur] + '）。', async function () {
    try {
      const r = await fetch('/api/shop-buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
      const j = await r.json();
      if (j.ok) {
        toast('兑换成功：' + it.name + '（-' + price + ' ' + CUR_ABBR[cur] + '）', 'good');
        await loadData();
        renderResbar(); renderAltar();
      } else { toast('兑换失败：' + (j.error || '未知错误'), 'warn'); }
    } catch (e) { toast('兑换失败：' + e.message, 'warn'); }
  }, '兑换');
}
function renderAltar() {
  const p = player();
  const wp = num(p.willpower, 0), lp = num(p.lucky, 0), dp = num(p.destiny, 0);
  // 第一层：WP → LP（100 愿力点 = 1 幸运点）
  const lpGain = Math.floor(wp / 100);
  const wpEnough = wp >= 100;
  // 第二层：LP → DP（10 幸运点 = 1 天命点）
  const dpGain = Math.floor(lp / 10);
  const lpEnough = lp >= 10;
  return `<div class="section-title">🔮 命愿祈铺 · 化命台</div>
  <div class="fate-convert">
    <div class="fc-title">🔥 化命台 · 一层 <span class="fc-sub">愿力凝幸运 · 不可逆</span></div>
    <div class="fc-row">100 愿力点(WP) → 1 幸运点(LP)</div>
    <div class="fc-balance">
      <span class="sb">🔆 <b>${wp}</b> WP</span>
      <span class="sb">🍀 <b>${lp}</b> LP</span>
    </div>
    <div class="fc-preview">本次可凝结：<b>+${lpGain} LP</b>（凝结后剩余 ${wp - lpGain * 100} WP）</div>
    <button class="fc-btn${wpEnough ? '' : ' disabled'}" ${wpEnough ? '' : 'disabled'} onclick="condenseLucky()">凝结（${lpGain * 100} WP → ${lpGain} LP）</button>
    <div class="fc-note">化命台将愿力点凝结为幸运点，此过程<b>不可逆</b>。请谨慎操作。</div>
  </div>
  <div class="fate-convert">
    <div class="fc-title">🔥 化命台 · 二层 <span class="fc-sub">幸运凝天命 · 不可逆</span></div>
    <div class="fc-row">10 幸运点(LP) → 1 天命点(DP)</div>
    <div class="fc-balance">
      <span class="sb">🍀 <b>${lp}</b> LP</span>
      <span class="sb">👑 <b>${dp}</b> DP</span>
    </div>
    <div class="fc-preview">本次可凝结：<b>+${dpGain} DP</b>（凝结后剩余 ${lp - dpGain * 10} LP）</div>
    <button class="fc-btn${lpEnough ? '' : ' disabled'}" ${lpEnough ? '' : 'disabled'} onclick="condenseDestiny()">凝结（${dpGain * 10} LP → ${dpGain} DP）</button>
    <div class="fc-note">化命台将幸运点凝结为天命点，此过程<b>不可逆</b>。请谨慎操作。</div>
  </div>` + renderWpLedgerHtml() + renderShopItems();
}
// 一层：愿力(WP) → 幸运(LP)
async function condenseLucky() {
  const p = player();
  const wp = num(p.willpower, 0), lp = num(p.lucky, 0);
  if (wp < 100) { toast('愿力点不足 100，无法凝结', 'warn'); return; }
  const gain = Math.floor(wp / 100);
  showConfirm('⚠ 化命台凝结确认', '将把 ' + (gain * 100) + ' 愿力点凝结为 ' + gain + ' 幸运点。\n此过程不可逆，确定凝结？', function () {
    showConfirm('⚠ 仍要凝结？', '再次确认：消耗 ' + (gain * 100) + ' WP，获得 ' + gain + ' LP。\n（凝结后剩余 ' + (wp - gain * 100) + ' WP，' + (lp + gain) + ' LP）', async function () {
      try {
        const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: wp - gain * 100, lucky: lp + gain }) });
        const r = await j.json();
        if (!r.ok) { toast('凝结失败：' + (r.error || ''), 'warn'); return; }
        DATA.player.willpower = r.player.willpower; DATA.player.lucky = r.player.lucky;
        renderResbar(); renderAltar();
        toast('🔥 凝结成功：+' + gain + ' LP', 'good');
      } catch (e) { toast('凝结失败：' + e.message, 'warn'); }
    }, '仍要凝结');
  }, '凝结');
}
// 二层：幸运(LP) → 天命(DP)
async function condenseDestiny() {
  const p = player();
  const lp = num(p.lucky, 0), dp = num(p.destiny, 0);
  if (lp < 10) { toast('幸运点不足 10，无法凝结', 'warn'); return; }
  const gain = Math.floor(lp / 10);
  showConfirm('⚠ 化命台凝结确认', '将把 ' + (gain * 10) + ' 幸运点凝结为 ' + gain + ' 天命点。\n此过程不可逆，确定凝结？', function () {
    showConfirm('⚠ 仍要凝结？', '再次确认：消耗 ' + (gain * 10) + ' LP，获得 ' + gain + ' DP。\n（凝结后剩余 ' + (lp - gain * 10) + ' LP，' + (dp + gain) + ' DP）', async function () {
      try {
        const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lucky: lp - gain * 10, destiny: dp + gain }) });
        const r = await j.json();
        if (!r.ok) { toast('凝结失败：' + (r.error || ''), 'warn'); return; }
        DATA.player.lucky = r.player.lucky; DATA.player.destiny = r.player.destiny;
        renderResbar(); renderAltar();
        toast('🔥 凝结成功：+' + gain + ' DP', 'good');
      } catch (e) { toast('凝结失败：' + e.message, 'warn'); }
    }, '仍要凝结');
  }, '凝结');
}

/* ---------- 每日秘境（每日副本，完成削减心魔 HP） ---------- */
/* ===== 每日秘境任务（数据化：localStorage 持久化，可经「管理」增删改 + 配愿力奖励） ===== */
const DEFAULT_DAILIES = [
  { id:'econ',      name:'📖 经济师学习', desc:'备考中级经济师',             realm:'万卷书', wp:1, focus:1 },
  { id:'diary',     name:'📝 写日记',     desc:'写今日日记',                 realm:'岁笺录', wp:1, focus:1 },
  { id:'weight',    name:'⚖️ 称体重',     desc:'测量并记录体重',             realm:'体魄录', wp:1, focus:1 },
  { id:'cook',      name:'🍳 烟火做饭',   desc:'亲自做一顿饭',               realm:null,     wp:1, focus:1 },
  { id:'sleep',     name:'🌙 早睡',       desc:'23:00 前就寝（记昨晚的觉）',  realm:null,     wp:2, focus:1, wpEarly:2, wpOntime:1 },
  { id:'exercise',  name:'🏃 运动打卡',   desc:'运动 ≥ 30 分钟',             realm:'炼体法', wp:1, focus:0 },
  { id:'baduanjin', name:'🧘 八段锦',     desc:'习练八段锦一遍',             realm:'炼体法', wp:1, focus:0 },
  { id:'wuqinxi',   name:'🐯 五禽戏',     desc:'习练五禽戏一遍',             realm:'炼体法', wp:1, focus:0 },
  { id:'read',      name:'📚 读书',       desc:'静心阅读 ≥ 30 分钟',         realm:'万卷书', wp:1, focus:0 },
  { id:'finance',   name:'💰 记账',       desc:'记录今日收支',               realm:null,     wp:1, focus:0 },
  { id:'gooddeed',  name:'🤲 日行一善',   desc:'行一件善事（捐步 / 助人）',  realm:'功德法', wp:1, focus:0 },
  { id:'xinjing',   name:'🌿 心境觉察',   desc:'内省今日一种面向',           realm:'千面法', wp:1, focus:0 },
  { id:'chat_zhaoxi', name:'💬 昭夕聊天', desc:'和昭夕聊会天（陪伴修行）',   realm:null,     wp:1, focus:0 },
  { id:'dinner_cucumber', name:'🥒 晚餐自律', desc:'晚餐不吃饭 / 只吃黄瓜',  realm:null,     wp:1, focus:0 }
];
const DAILY_KEY = 'game_dailies';
function dailies() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length) return a; }
  } catch (e) {}
  const seed = DEFAULT_DAILIES.map(d => Object.assign({}, d));
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(seed)); } catch (e) {}
  return seed;
}
function saveDailies(a) { try { localStorage.setItem(DAILY_KEY, JSON.stringify(a)); } catch (e) {} }
function dungeonDef(id) { return dailies().find(d => d.id === id); }
function leadEmoji(s) { const m = /^[\s]*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2700}-\u{27BF}])/u.exec(s || ''); return m ? m[1] : '•'; }
function wpBadge(wp) { wp = Number(wp) || 0; return wp > 0 ? '<span class="dc-reward">+' + wp + '愿</span>' : ''; }
function dungeonMod(id) { return id === 'weight' ? 'weight' : (id === 'sleep' ? 'sleep' : 'dungeon'); }
function dungeonDoneCheck(id) {
  if (id === 'weight') return weightLoad().some(x => x.date === todayKey());
  if (id === 'sleep') return sleepLoad().some(x => x.date === yesterdayKey());
  return dungeonDone(id);
}
/* 每日秘境任务完成发放愿力：每任务每日仅发一次（按日期记旗，防重复勾选/刷）。 */
function dwpFlag(id, day) { return 'game_dwp_' + day + '_' + id; }
async function grantDungeonWp(id, day, amount) {
  const def = dungeonDef(id); if (!def) return;
  if (amount == null) amount = Number(def.wp) || 0;
  if (!amount) return;
  const f = dwpFlag(id, day);
  try { if (localStorage.getItem(f) === '1') return; } catch (e) {}
  try {
    await grantWP(amount, '每日秘境', def.name || id);
    try { localStorage.setItem(f, '1'); } catch (e) {}
  } catch (e) {}
}
function todayKey() { return new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-'); }
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function dungeonFlag(id) { return 'game_dungeon_' + todayKey() + '_' + id; }
function dungeonDone(id) { try { return localStorage.getItem(dungeonFlag(id)) === '1'; } catch (e) { return false; } }
function xinmoHpFromDungeons() { const all = dailies(); const done = all.filter(d => dungeonDone(d.id)).length; return Math.max(0, 100 - Math.round(done / all.length * 100)); }
function renderDungeon() {
  const all = dailies();
  const top = all.filter(d => d.focus);
  const rest = all.filter(d => !d.focus);
  const topCards = top.map(d => {
    const ok = dungeonDoneCheck(d.id);
    const flag = ok ? '✅ 已完成' : (d.realm ? d.realm + ' +1' : '点击完成');
    return `<div class="dc-top5-card${ok ? ' cleared' : ''}" onclick="top5Click('${d.id}')">
      <div class="dc-top5-ic">${ok ? '✅' : esc(leadEmoji(d.name))}</div>
      <div class="dc-top5-name">${esc(d.name)}</div>
      <div class="dc-top5-flag">${esc(flag)}${wpBadge(d.wp)}</div>
    </div>`;
  }).join('');
  const restRows = rest.map(d => {
    const ok = dungeonDone(d.id);
    const badge = (d.realm ? `<span class="dc-reward realm">${esc(d.realm)} +1</span>` : '') + wpBadge(d.wp);
    return `<label class="task-row dc-rest-row${ok ? ' done' : ''}">
      <input type="checkbox" ${ok ? 'checked' : ''} onchange="if(this.checked)clearDungeon('${d.id}');else setDungeonOff('${d.id}')">
      <span class="task-text${ok ? ' done' : ''}">${esc(d.name)}</span>
      <span class="dc-rest-desc">${esc(d.desc || '')}</span>
      ${badge}
    </label>`;
  }).join('');
  const done = all.filter(d => dungeonDone(d.id)).length;
  const total = all.length;
  const hp = xinmoHpFromDungeons();
  return `<div class="section-title">🗺️ 每日秘境 · ${done}/${total}</div>
  <div class="demon-avatars-title">心魔·拖延 HP（每完成一个副本削减 ${Math.round(100 / total)}）</div>
  <div class="bar" style="height:14px"><i style="width:${hp}%;${hp <= 0 ? 'background:#6fcf97' : ''}"></i></div>
  <div class="meta" style="margin:6px 0 14px">当前 HP ${hp}/100${hp <= 0 ? ' · 🎉 心魔已被击破！' : ''}</div>
  <div class="section-title" style="font-size:15px;display:flex;align-items:center;gap:10px">🔥 今日五大要事<span style="margin-left:auto"><button class="btn sm" onclick="mgmtPanel('dungeonTasks','focus')">🛠 管理</button></span></div>
  <div class="dc-top5">${topCards}</div>
  <div class="section-title" style="margin-top:16px;display:flex;align-items:center;gap:10px">📋 其余日常副本<span style="margin-left:auto"><button class="btn sm" onclick="mgmtPanel('dungeonTasks','rest')">🛠 管理</button></span></div>
  <div class="dungeon-tasks">${restRows}</div>
  <div class="meta" style="margin-top:6px">带「境界 +1」的副本完成为对应境界记经验；完成全部 ${total} 个副本击破心魔，额外愿力 +${5 + Math.min(20, realmBuffSum('taskBonus'))}（每日限一次）。打勾完成的副本按配置发放对应愿力（每日每任务仅一次）。</div>`;
}
async function top5Click(id) {
  if (id === 'weight') { go('weight'); return; }
  if (id === 'sleep') { go('sleep'); return; }
  if (dungeonDone(id)) setDungeonOff(id); else await clearDungeon(id);
}
function setDungeonOff(id) { try { localStorage.setItem(dungeonFlag(id), '0'); } catch (e) {} renderMain('dungeon'); }
/* 周天试炼下的「本周任务栏」：复用日级任务列表样式，每行右侧显示 +X愿 奖励标签。
   数据来自任务板「周级」分组；勾选写回主站任务板，配置奖励在每周首次完成时发放愿力（防刷）。 */
function weeklyTasksHtml() {
  const tb = (DATA.taskboard || []).filter(t => /周级/.test(t.grp || ''));
  if (!tb.length) return '';
  const rows = tb.slice().sort((a, b) => (a.ord || 0) - (b.ord || 0)).map(t => {
    const pts = Number(t.points) || 0;
    const reward = pts > 0 ? '<span class="dc-reward">+' + pts + '愿</span>' : '';
    return '<label class="task-row dc-rest-row' + (t.done ? ' done' : '') + '">' +
      '<input type="checkbox" ' + (t.done ? 'checked' : '') + ' onchange="toggleWeeklyTask(' + t.id + ', this.checked)">' +
      '<span class="task-text' + (t.done ? ' done' : '') + '">' + esc(t.text || '') + '</span>' +
      reward +
    '</label>';
  }).join('');
  return '<div class="section-title" style="margin-top:18px">📋 本周任务栏（勾选写回任务板）</div>' +
    '<div class="dungeon-tasks">' + rows + '</div>' +
    '<div class="meta" style="margin-top:6px">勾选完成写回主站任务板；任务配置的奖励愿力于本周首次完成时发放（每周每任务仅一次），并自动为命中 NPC 加好感。</div>';
}
async function toggleWeeklyTask(id, done) {
  try {
    const j = await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'taskboard', id: id, fields: { done: done ? 1 : 0 } }) });
    const r = await j.json();
    if (!r.ok) { toast('任务更新失败：' + (r.error || ''), 'warn'); return; }
    const t = (DATA.taskboard || []).find(x => x.id === id); if (t) t.done = done ? 1 : 0;
    const pts = Number(t && t.points) || 0;
    const wk = yearWeekCST();
    const key = 'lifeos_weeklyTaskWP_' + wk;
    let got = {}; try { got = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { got = {}; }
    if (done) {
      await grantNpcAffinityByText(t ? (t.text || '') : '');
      // 勾选：本周首次完成才发放奖励（防跨周/重复刷）
      if (pts > 0 && !got[id]) {
        got[id] = true;
        try { localStorage.setItem(key, JSON.stringify(got)); } catch (e) {}
        await grantWP(pts, '周级任务', (t && t.text) || '周级任务');
        toast('🎯 周级任务「' + (t && t.text || '') + '」完成，+' + pts + ' 愿力', 'good');
      }
    } else {
      // 取消勾选：若本周已发放奖励，则扣回愿力，并清除已发放标记（允许本周内重新完成再发）
      if (pts > 0 && got[id]) {
        delete got[id];
        try { localStorage.setItem(key, JSON.stringify(got)); } catch (e) {}
        await grantWP(-pts, '周级任务·取消', (t && t.text) || '周级任务');
        toast('↩️ 已取消「' + (t && t.text || '') + '」，扣回 ' + pts + ' 愿力', 'warn');
      }
    }
    renderMain(CUR);
  } catch (e) { toast('任务更新失败：' + e.message, 'warn'); }
}
async function clearDungeon(id) {
  try { localStorage.setItem(dungeonFlag(id), '1'); } catch (e) {}
  const xm = (demons() || []).find(d => d.key === 'xinmo');
  if (xm) xm.hp = xinmoHpFromDungeons();
  const def = dailies().find(d => d.id === id);
  if (def && def.realm) await grantRealmXp(def.realm, 1, { oncePerDay: true });
  await grantDungeonWp(id, todayKey());
  const done = dailies().filter(d => dungeonDone(d.id)).length;
  if (done === dailies().length) {
    const f = 'game_defeated_' + todayKey();
    if (!localStorage.getItem(f)) {
      localStorage.setItem(f, '1');
      try {
        const bonus = 5 + Math.min(20, realmBuffSum('taskBonus'));
        const j = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: bonus, source: '心魔击败', text: '每日秘境全完成' }) });
        const r = await j.json();
        if (r.ok && r.player) { if (r.player.willpower != null) DATA.player.willpower = r.player.willpower; renderResbar(); }
        if (bonus) wpLedgerAppend(bonus, '心魔击败', '每日秘境全完成');
        toast('🎉 心魔已被击破！契约点 +1' + (bonus ? ' · 愿力 +' + bonus : ''), 'good');
      } catch (e) { toast('击破记录失败：' + e.message, 'warn'); }
    } else { toast('心魔已击破（今日已领取）', 'good'); }
  } else {
    toast('副本完成，心魔 HP -' + Math.round(100 / dailies().length), 'good');
  }
  renderMain('dungeon');
}

/* ==================== 体重（对应境界 · 体魄录） ==================== */
const WEIGHT_KEY = 'game_weight_log';
function weightLoad() { return (DATA.weight || []).map(x => ({ id: x.id, date: x.date, kg: Number(x.weight) || 0 })); }
function weightUnit() { try { return localStorage.getItem('game_weight_unit') || 'kg'; } catch (e) { return 'kg'; } }
function weightSetUnit(u) { try { localStorage.setItem('game_weight_unit', u); } catch (e) {} }
function weightStreak() {
  const log = weightLoad().slice().sort((a, b) => a.date < b.date ? 1 : -1);
  let s = 0;
  for (let i = 0; i < log.length; i++) {
    const exp = new Date(Date.now() - i * 86400000).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
    if (log[i].date === exp) s++; else break;
  }
  return s;
}
function weightDisp(kg) { const u = weightUnit(); return u === 'kg' ? (Number(kg).toFixed(1) + ' kg') : (Number(kg) * 2).toFixed(1) + ' 斤'; }
function weightOther(kg) { const u = weightUnit(); return u === 'kg' ? (Number(kg) * 2).toFixed(1) + ' 斤' : (Number(kg) / 2).toFixed(1) + ' kg'; }
function wKgToJin() { const kg = document.getElementById('wKg'), jin = document.getElementById('wJin'); if (kg && jin && kg.value) jin.value = (parseFloat(kg.value) * 2).toFixed(1); }
function wJinToKg() { const kg = document.getElementById('wKg'), jin = document.getElementById('wJin'); if (jin && kg && jin.value) kg.value = (parseFloat(jin.value) / 2).toFixed(1); }
function weightChart(rows) {
  if (!rows.length) return '<div class="game-empty" style="padding:20px;">暂无体重记录，先记一条吧 ⚖️</div>';
  const unit = weightUnit();
  const w = 320, h = 160, pad = 24;
  const stepX = rows.length > 1 ? (w - 2 * pad) / (rows.length - 1) : 0;
  const xs = rows.map((r, i) => pad + i * stepX);
  const vals = rows.map(r => unit === 'jin' ? Number(r.weight) * 2 : Number(r.weight));
  let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (min === max) { min -= 1; max += 1; }
  const ys = vals.map(v => h - pad - (v - min) / (max - min) * (h - 2 * pad));
  const pts = xs.map((x, i) => x.toFixed(1) + ',' + ys[i].toFixed(1)).join(' ');
  const dots = xs.map((x, i) => '<circle cx="' + x.toFixed(1) + '" cy="' + ys[i].toFixed(1) + '" r="3.5" fill="var(--wp)"></circle>').join('');
  const line = '<polyline fill="none" stroke="var(--wp)" stroke-width="2.5" points="' + pts + '"/>';
  const u = unit === 'jin' ? '斤' : 'kg', dec = 1;
  const lbl = '<text x="2" y="' + (pad + 4) + '" font-size="10" fill="var(--wp)">' + max.toFixed(dec) + ' ' + u + '</text>' +
    '<text x="2" y="' + (h - pad + 6) + '" font-size="10" fill="var(--wp)">' + min.toFixed(dec) + ' ' + u + '</text>';
  const xfirst = '<text x="' + xs[0].toFixed(1) + '" y="' + (h - 4) + '" font-size="9" fill="var(--muted)">' + rows[0].date.slice(5) + '</text>';
  const xlast = '<text x="' + xs[xs.length - 1].toFixed(1) + '" y="' + (h - 4) + '" font-size="9" fill="var(--muted)" text-anchor="end">' + rows[rows.length - 1].date.slice(5) + '</text>';
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="display:block">' + lbl + line + dots + xfirst + xlast + '</svg>';
}
function weightListHtml(rows) {
  if (!rows.length) return '<div class="game-empty">暂无记录</div>';
  return rows.slice().reverse().map(r => '<div class="weight-item">' +
    '<div class="w-date">' + esc(r.date || '') + '</div>' +
    '<div class="w-val">' + weightDisp(r.weight) + '</div>' +
    '<div class="w-val2">' + weightOther(r.weight) + '</div>' +
    '<div class="w-note">' + esc(r.note || '') + '</div>' +
    '<div class="w-del" onclick="deleteWeight(' + r.id + ')" title="删除">✕</div></div>').join('');
}
async function deleteWeight(id) {
  if (!confirm('确定删除这条体重记录？')) return;
  try {
    const j = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'weight', id: id }) });
    const r = await j.json();
    if (!r.ok) { toast('删除失败：' + (r.error || ''), 'warn'); return; }
    await loadData(); renderMain('weight'); toast('已删除', 'good');
  } catch (e) { toast('删除失败：' + e.message, 'warn'); }
}
function renderWeight() {
  const log = (DATA.weight || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.id || 0) - (b.id || 0));
  const unit = weightUnit();
  const latest = log.length ? log.reduce((a, b) => a.date > b.date ? a : b) : null;
  const stage = realmStageName('体魄录');
  const todayEntry = log.find(x => x.date === todayKey());
  const dateVal = todayEntry ? todayEntry.date : todayKey();
  const kgVal = todayEntry ? (Number(todayEntry.weight) || 0) : '';
  const jinVal = kgVal !== '' ? (kgVal * 2).toFixed(1) : '';
  const noteVal = todayEntry ? (todayEntry.note || '') : '';
  return '<div class="section-title">⚖️ 体重 <span class="game-tag">对应境界 · 体魄录</span></div>' +
    '<div class="wt-head"><div class="wt-latest"><div class="wt-num">' + (latest ? weightDisp(latest.weight) : '—') + '</div><div class="wt-sub">最近一次 · ' + (latest ? latest.date : '未记录') + '</div></div>' +
    '<div class="wt-stat"><div class="wt-stat-num">' + weightStreak() + '</div><div class="wt-stat-lbl">🔥 连续打卡</div></div>' +
    '<div class="wt-stat"><div class="wt-stat-num">' + esc(stage) + '</div><div class="wt-stat-lbl">⚖️ 体魄录</div></div></div>' +
    '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:start;">' +
      '<div class="card weight-form-card" style="flex:1 1 320px;">' +
        '<div class="card-title">⚖️ 记录今日体重</div>' +
        '<div class="form-row"><span>日期</span><input class="input" type="date" id="wDate" value="' + dateVal + '"></div>' +
        '<div class="form-row"><span>斤</span><input class="input" type="number" id="wJin" step="0.1" placeholder="市斤" value="' + jinVal + '" oninput="wJinToKg()"></div>' +
        '<div class="form-row"><span>公斤</span><input class="input" type="number" id="wKg" step="0.1" placeholder="kg" value="' + kgVal + '" oninput="wKgToJin()"></div>' +
        '<div class="hint">填其中一个，另一个自动换算（1 斤 = 0.5 公斤）</div>' +
        '<div class="form-row"><span>备注</span><input class="input" type="text" id="wNote" placeholder="可空，如「空腹/晚饭后」" value="' + esc(noteVal) + '"></div>' +
        '<div style="margin-top:8px;"><button class="btn primary" onclick="saveWeight()">💾 保存记录</button></div>' +
      '</div>' +
      '<div class="card" style="flex:1 1 360px;">' +
        '<div class="card-title" style="display:flex;align-items:center;gap:10px;">📈 体重趋势' +
          '<span style="margin-left:auto;" class="wt-unit-toggle"><button class="' + (unit === 'kg' ? 'on' : '') + '" onclick="weightSetUnit(\'kg\');renderMain(\'weight\')">公斤</button>' +
          '<button class="' + (unit === 'jin' ? 'on' : '') + '" onclick="weightSetUnit(\'jin\');renderMain(\'weight\')">斤</button></span>' +
        '</div>' +
        '<div class="weight-chart-wrap" id="weightChartWrap">' + weightChart(log) + '</div>' +
        '<div id="weightLatest" style="margin-top:10px;font-size:13px;color:var(--muted);"></div>' +
      '</div>' +
    '</div>' +
    '<div class="card" style="margin-top:18px;">' +
      '<div class="card-title">📋 历史记录</div>' +
      '<div class="weight-list" id="weightList">' + weightListHtml(log) + '</div>' +
    '</div>';
}
async function saveWeight() {
  const kgEl = document.getElementById('wKg');
  const dateEl = document.getElementById('wDate');
  const noteEl = document.getElementById('wNote');
  const v = parseFloat(kgEl ? kgEl.value : '');
  if (!(v > 0)) { toast('请先在「斤」或「公斤」里填一个有效体重', 'warn'); return; }
  const t = (dateEl && dateEl.value) || todayKey();
  const note = (noteEl && noteEl.value.trim()) || '';
  const Existing = (DATA.weight || []).find(x => x.date === t);
  const isNew = !Existing;
  try {
    if (isNew) {
      await fetch('/api/insert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'weight', fields: { date: t, weight: v, note: note, created_at: new Date().toISOString() } }) });
    } else {
      await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'weight', id: Existing.id, fields: { weight: v, note: note } }) });
    }
    await loadData();
  } catch (e) { toast('体重保存失败：' + e.message, 'warn'); return; }
  if (isNew) {
    await grantRealmXp('体魄录', 1, { oncePerDay: true });
    const wamt = Number((dungeonDef('weight') || {}).wp) || 1;
    await grantDungeonWp('weight', t);
    toast('⚖️ 已记录 ' + v.toFixed(1) + ' kg（体魄录参悟 +1 · 愿力 +' + wamt + '）', 'good');
  } else {
    toast('⚖️ 已更新体重 ' + v.toFixed(1) + ' kg', 'good');
  }
  renderMain('weight');
}

/* ==================== 睡眠（三档） ==================== */
const SLEEP_KEY = 'game_sleep_log';
function sleepLoad() { try { return JSON.parse(localStorage.getItem(SLEEP_KEY) || '[]'); } catch (e) { return []; } }
function sleepSave(a) { try { localStorage.setItem(SLEEP_KEY, JSON.stringify(a)); } catch (e) {} }
function sleepTier(bed) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(bed || '');
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  if (hh < 6) return 'late';
  if (hh < 23) return 'early';
  if (hh === 23) return 'ontime';
  return 'late';
}
function sleepStreak() {
  const log = sleepLoad().slice().sort((a, b) => a.date < b.date ? 1 : -1);
  let s = 0;
  for (let i = 0; i < log.length; i++) {
    const exp = new Date(Date.now() - i * 86400000).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
    if (log[i].date === exp) { if (log[i].tier === 'early') s++; else break; } else break;
  }
  return s;
}
function renderSleep() {
  const log = sleepLoad();
  const latest = log.length ? log.reduce((a, b) => a.date > b.date ? a : b) : null;
  const restTotal = log.reduce((s, x) => s + (x.rest ? 1 : 0), 0);
  const yKey = yesterdayKey();
  const yEntry = log.find(x => x.date === yKey);
  const stageTip = { early: '早睡 ≤23:00 · +2 愿力 · 休养 +1', ontime: '按时 23–24 · +1 愿力', late: '熬夜 >24 · 0 愿力（注意身体）' };
  return '<div class="section-title">🌙 睡眠 <span class="game-tag">作息修行（记昨晚的觉）</span></div>' +
    '<div class="wt-head"><div class="wt-latest"><div class="wt-num">' + (latest ? esc(latest.bed) : '—') + '</div><div class="wt-sub">最近就寝 · ' + (latest ? latest.date : '未记录') + '</div></div>' +
    '<div class="wt-stat"><div class="wt-stat-num">' + sleepStreak() + '</div><div class="wt-stat-lbl">🌙 连续早睡</div></div>' +
    '<div class="wt-stat"><div class="wt-stat-num">' + restTotal + '</div><div class="wt-stat-lbl">💤 休养值</div></div></div>' +
    '<div class="wf-form"><input class="input" id="slDate" type="date" style="max-width:170px;" value="' + yKey + '">' +
    '<input class="input" id="slBed" type="time" value="' + (yEntry ? yEntry.bed : (latest ? latest.bed : '23:00')) + '">' +
    '<button class="btn primary" onclick="saveSleep()">🌙 记录就寝时间</button></div>' +
    '<div class="sl-tiers">' + Object.keys(stageTip).map(k => '<span class="sl-tier sl-' + k + (yEntry && yEntry.tier === k ? ' on' : '') + '">' + stageTip[k] + '</span>').join('') + '</div>' +
    (yEntry ? '<div class="meta" style="margin:6px 0">✅ 已记录（' + esc(yEntry.date) + '）：' + esc(yEntry.bed) + '（' + stageTip[yEntry.tier] + '）<button class="btn" style="margin-left:8px;padding:2px 10px" onclick="cancelSleep()">取消记录</button></div>'
             : '<div class="meta" style="margin:6px 0">昨晚（' + yKey + '）尚未记录，选好时间点「记录就寝时间」</div>') +
    '<div class="meta" style="margin-top:8px">睡眠是昨晚的行为，默认记到「昨天」。可改日期补记任意一天；点「取消记录」会扣回对应愿力点。</div>';
}
async function saveSleep() {
  const dateEl = document.getElementById('slDate'), bedEl = document.getElementById('slBed');
  const date = dateEl ? dateEl.value : yesterdayKey();
  const bed = bedEl ? bedEl.value : '';
  const tier = sleepTier(bed);
  if (!tier) { toast('请选择有效时间', 'warn'); return; }
  const log = sleepLoad();
  const idx = log.findIndex(x => x.date === date);
  const isNew = idx < 0;
  const rest = tier === 'early' ? 1 : 0;
  if (isNew) log.push({ date: date, bed: bed, tier: tier, rest: rest }); else { log[idx].bed = bed; log[idx].tier = tier; log[idx].rest = rest; }
  sleepSave(log);
  let msg = '';
  if (isNew) {
    const sd = dungeonDef('sleep') || {};
    const wamt = tier === 'early' ? (Number(sd.wpEarly) || 2) : tier === 'ontime' ? (Number(sd.wpOntime) || 1) : 0;
    if (wamt) await grantDungeonWp('sleep', date, wamt);
    if (tier === 'early') msg = '🌙 早睡打卡 +' + wamt + ' 愿力 · 休养 +1';
    else if (tier === 'ontime') msg = '🌙 按时就寝 +' + wamt + ' 愿力';
    else { msg = '🌙 熬夜了… 0 愿力，早点休息护身体 💤'; }
    toast(msg, tier === 'late' ? 'warn' : 'good');
  } else {
    toast('🌙 已更新 ' + date + ' 就寝 ' + bed, 'good');
  }
  renderMain('sleep');
}
async function cancelSleep() {
  const dateEl = document.getElementById('slDate');
  const date = dateEl ? dateEl.value : yesterdayKey();
  const log = sleepLoad();
  const idx = log.findIndex(x => x.date === date);
  if (idx < 0) { toast('该日无睡眠记录', 'warn'); return; }
  const rec = log[idx];
  if (!confirm('取消 ' + date + ' 的睡眠记录？将扣回对应愿力点（' + (rec.tier === 'early' ? '-2' : rec.tier === 'ontime' ? '-1' : '0') + '）')) return;
  log.splice(idx, 1);
  sleepSave(log);
  const sd = dungeonDef('sleep') || {};
  const wamt = rec.tier === 'early' ? (Number(sd.wpEarly) || 2) : rec.tier === 'ontime' ? (Number(sd.wpOntime) || 1) : 0;
  if (wamt) { try { await grantWP(-wamt, '休养', '取消早睡'); } catch (e) {} try { localStorage.removeItem(dwpFlag('sleep', date)); } catch (e) {} }
  toast('已取消 ' + date + ' 记录，愿力已回退', 'good');
  renderMain('sleep');
}

/* ==================== 娱乐（对应境界 · 娱心录） ==================== */
const FUN_KEY = 'game_fun_log';
const FUN_TYPES = ['电视剧', '电影', '动漫', '漫画', '书', '游戏', '歌曲'];
let funFilt = 'all';
function funLoad() { try { return JSON.parse(localStorage.getItem(FUN_KEY) || '[]'); } catch (e) { return []; } }
function funSave(a) { try { localStorage.setItem(FUN_KEY, JSON.stringify(a)); } catch (e) {} }
function funStars(r) { return '★'.repeat(Number(r) || 0) + '☆'.repeat(5 - (Number(r) || 0)); }
function renderFun() {
  const log = funLoad();
  const filtered = funFilt === 'all' ? log : log.filter(x => x.type === funFilt);
  const ordered = filtered.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  const chips = ['all'].concat(FUN_TYPES).map(t => '<button class="wp-filt' + (funFilt === t ? ' on' : '') + '" onclick="funFilt=\'' + t + '\';renderMain(\'fun\')">' + (t === 'all' ? '全部' : t) + '</button>').join('');
  const cards = ordered.length ? ordered.map(x => '<div class="fun-card"><div class="fun-top"><span class="fun-type">' + esc(x.type) + '</span><span class="fun-rate">' + funStars(x.rating) + '</span></div><div class="fun-title">' + esc(x.title) + '</div><div class="fun-date">' + x.date + '</div></div>').join('') : '<div class="game-empty">还没有娱乐记录，添一部好作品吧</div>';
  const opts = FUN_TYPES.map(t => '<option value="' + t + '">' + t + '</option>').join('');
  return '<div class="section-title">🎬 娱乐 <span class="game-tag">对应境界 · 娱心录</span></div>' +
    '<div class="wf-form"><select class="input" id="funType">' + opts + '</select>' +
    '<input class="input" id="funTitle" placeholder="作品名">' +
    '<select class="input" id="funRating"><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3" selected>★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select>' +
    '<button class="btn primary" onclick="saveFun()">🎬 记录</button></div>' +
    '<div class="meta" style="margin:6px 0">录入一部作品：每日首次 +1 愿力；书 → 万卷书 +1，其余 → 娱心录 +1（每日每境限一次）。</div>' +
    '<div class="wp-filts">' + chips + '</div>' +
    '<div class="fun-grid">' + cards + '</div>';
}
async function saveFun() {
  const tEl = document.getElementById('funType'), nEl = document.getElementById('funTitle'), rEl = document.getElementById('funRating');
  const type = tEl ? tEl.value : '电视剧';
  const title = nEl ? nEl.value.trim() : '';
  const rating = rEl ? parseInt(rEl.value) || 3 : 3;
  if (!title) { toast('请填写作品名', 'warn'); return; }
  const t = todayKey();
  const log = funLoad();
  log.push({ date: t, type: type, title: title, rating: rating });
  funSave(log);
  const firstToday = log.filter(x => x.date === t).length === 1;
  if (firstToday) {
    try { await grantWP(1, '娱乐', '录入 ' + type); } catch (e) {}
    if (type === '书') { await grantRealmXp('万卷书', 1, { oncePerDay: true }); }
    else { await grantRealmXp('娱心录', 1, { oncePerDay: true }); }
    toast('🎬 已记录《' + title + '》· 愿力 +1' + (type === '书' ? ' · 万卷书 +1' : ' · 娱心录 +1'), 'good');
  } else {
    toast('🎬 已记录《' + title + '》', 'good');
  }
  renderMain('fun');
}

let cookTab = 'cook';
let cookWheelPick = null;
function renderCook() {
  const recipes = food().recipes || [];
  const tabs = [['cook', '🍳 做一道菜'], ['recipes', '📚 菜谱库'], ['wheel', '🎲 今天吃什么'], ['log', '📝 饮食日志']];
  const tabBar = '<div class="cook-tabs">' + tabs.map(t => '<div class="cook-tab' + (cookTab === t[0] ? ' on' : '') + '" onclick="cookTab=\'' + t[0] + '\';renderMain(\'cook\')">' + t[1] + '</div>').join('') + '</div>';
  let body = '';
  if (cookTab === 'recipes') body = cookRecipesHtml(recipes);
  else if (cookTab === 'wheel') body = cookWheelHtml(recipes);
  else if (cookTab === 'log') body = cookLogHtml();
  else body = cookCookHtml(recipes);
  return tabBar + body;
}
function cookCookHtml(recipes) {
  if (!recipes.length) return renderPlaceholder('烹饪', '暂无菜谱数据。');
  const cards = recipes.map(r => {
    const lv = num(r.level, 1), prof = num(r.proficiency, 0);
    const q = QUA[r.quality] || QUA[1];
    const pct = Math.max(0, Math.min(100, Math.round(prof / 10 * 100)));
    return '<div class="card cook-card"><span class="tag">' + q.label + ' ' + stars(r.quality) + '</span>' +
      '<h3>' + esc(r.name) + '</h3>' +
      '<div class="meta">Lv.' + lv + ' · 熟练度 ' + prof + '/10' + (r.activated ? '' : ' · 未激活') + '</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<button class="btn primary sm" onclick="cookDish(' + r.id + ')">🍳 做一道</button></div>';
  }).join('');
  const meals = (DATA.meals || []).slice(0, 15);
  const hist = meals.length ? meals.map(m => {
    const r = (food().recipes || []).find(x => x.id === m.recipeId);
    return '<div class="cook-hist-row"><span class="ch-date">' + esc(m.date || '') + '</span>' +
      '<span class="ch-name">' + esc(m.name || '(未关联菜谱)') + '</span>' +
      (m.rating ? '<span class="ch-rate">' + '★'.repeat(m.rating) + '</span>' : '') +
      '<button class="ch-undo" onclick="undoCook(' + m.id + ')">撤销</button></div>';
  }).join('') : '<div class="game-empty">还没有做菜记录</div>';
  return '<div class="mod-toolbar"><div class="section-title">🍳 烹饪 · 菜谱 ' + recipes.length + ' 道</div>' +
    '<button class="btn primary" onclick="openCookModal()">🍳 记录做菜</button></div>' +
    '<div class="cards">' + cards + '</div>' +
    '<div class="section-title" style="margin-top:18px">📜 我做菜记录 <span class="game-tag">点「撤销」回退奖励与境界经验</span></div>' +
    '<div class="cook-hist">' + hist + '</div>';
}
function cookRecipesHtml(recipes) {
  if (!recipes.length) return renderPlaceholder('菜谱库', '暂无菜谱。去主站烟火食记加菜谱会同步过来。');
  const rows = recipes.map(r => '<div class="cook-recipe-row"><div class="cr-info"><b>' + esc(r.name) + '</b><span class="cr-meta">' + esc(r.category || '') + ' · 难度 ' + (r.difficulty || '?') + (r.activated ? ' · 已激活' : '') + '</span></div><button class="btn sm" onclick="cookDish(' + r.id + ')">做一道</button></div>').join('');
  return '<div class="section-title">📚 菜谱库 · 共 ' + recipes.length + ' 道</div><div class="cook-recipe-list">' + rows + '</div>';
}
function cookWheelHtml(recipes) {
  if (!recipes.length) return renderPlaceholder('今天吃什么', '暂无菜谱可抽。');
  const pick = cookWheelPick ? (recipes.find(x => x.id === cookWheelPick) || null) : null;
  const card = pick ? '<div class="cook-wheel-pick"><h2>' + esc(pick.name) + '</h2><div class="meta">' + esc(pick.category || '') + ' · 难度 ' + (pick.difficulty || '?') + '</div><button class="btn primary" onclick="cookDish(' + pick.id + ')">🍳 就做这道</button></div>' : '<div class="cook-wheel-empty">点击下方按钮，让命运替你决定今晚吃什么 🎲</div>';
  return '<div class="section-title">🎲 今天吃什么</div><div class="cook-wheel">' + card + '<button class="btn primary" onclick="cookWheelSpin()">🎲 帮我选一道</button></div>';
}
function cookWheelSpin() { const rs = food().recipes || []; if (!rs.length) return; cookWheelPick = rs[Math.floor(Math.random() * rs.length)].id; renderMain('cook'); }
function cookLogHtml() {
  const meals = (DATA.meals || []);
  if (!meals.length) return renderPlaceholder('饮食日志', '还没有做菜记录。');
  const rows = meals.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map(m => '<div class="cook-hist-row"><span class="ch-date">' + esc(m.date || '') + '</span><span class="ch-name">' + esc(m.name || '(未关联菜谱)') + '</span>' + (m.rating ? '<span class="ch-rate">' + '★'.repeat(m.rating) + '</span>' : '') + '<button class="ch-undo" onclick="undoCook(' + m.id + ')">撤销</button></div>').join('');
  return '<div class="section-title">📝 饮食日志 · 共 ' + meals.length + ' 次</div><div class="cook-hist">' + rows + '</div>';
}

/* ---------- 烹饪交互 ---------- */
let cookRatingVal = 3;
function todayStr() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function openCookModal() {
  const sel = document.getElementById('cookRecipe');
  if (sel) sel.innerHTML = '<option value="">（不关联菜谱）</option>' + (food().recipes || []).map(r => '<option value="' + r.id + '">' + esc(r.name) + '</option>').join('');
  const dish = document.getElementById('cookDish'); if (dish) dish.value = '';
  const feel = document.getElementById('cookFeeling'); if (feel) feel.value = '';
  setCookRating(3);
  const m = document.getElementById('cookModal'); if (m) m.classList.add('open');
}
function closeCookModal() { const m = document.getElementById('cookModal'); if (m) m.classList.remove('open'); }
function setCookRating(v) {
  cookRatingVal = v;
  document.querySelectorAll('#cookRating button').forEach(b => b.classList.toggle('on', +b.dataset.v === v));
}
function cookDish(id) {
  openCookModal();
  const sel = document.getElementById('cookRecipe');
  if (sel) sel.value = id || '';
  const r = (food().recipes || []).find(x => x.id === id);
  const dish = document.getElementById('cookDish');
  if (dish && r) dish.value = r.name;
}
async function saveCookPost() {
  const dish = document.getElementById('cookDish').value.trim();
  if (!dish) { toast('菜名不能为空', 'warn'); return; }
  const recipeId = parseInt(document.getElementById('cookRecipe').value) || null;
  const rating = cookRatingVal;
  const feeling = document.getElementById('cookFeeling').value.trim();
  if (recipeId && DATA) {
    try {
      const res = await fetch('/api/cook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dish, date: todayStr(), rating, feeling, recipeId, images: [] }) });
      const j = await res.json();
      if (j.ok) {
        closeCookModal();
        await loadData();   // 重新拉真数据，刷新资源条+菜谱进度+背包
        showCookReward(j.gains, dish);
        // 灶神录：新菜 +5 经验、重复做 +1 经验（不耗愿力，直接记境界）
        if (j.gains && typeof j.gains.activated === 'boolean') {
          await grantRealmXp('灶神录', j.gains.activated ? 5 : 1, {});
        }
        renderMain('cook');
        toastUndo('🍳 已记录「' + (dish || '') + '」，点此可撤销', () => undoCook(j.id));
        return;
      } else { toast('做菜结算失败：' + (j.error || '未知错误'), 'warn'); }
    } catch (e) { toast('请求失败：' + e.message, 'warn'); }
  }
  toast('已记录（未关联菜谱，不参与结算）', '');
  closeCookModal();
}
function showCookReward(gains, dish) {
  if (!gains) return;
  if (gains.activated) toast('🎉 习得新菜 · ' + (dish || ''), 'good');
  else if (gains.note) toast(gains.note, 'good');
  const res = [];
  if (gains.wp) res.push('+' + gains.wp + ' 愿力');
  if (gains.lp) res.push('+' + gains.lp + ' 幸运');
  if (gains.dp) res.push('+' + gains.dp + ' 天命');
  if (res.length) toast(res.join(' · '), 'res');
  if (!gains.activated && !gains.note && !res.length) toast('记录已保存', '');
  if (gains.leveledUp) showLevelUp(gains.level || 1);
}
function showLevelUp(lv) {
  const el = document.createElement('div');
  el.className = 'levelup-pop';
  el.innerHTML = '<div class="lu-badge">⬆ 升级！</div><div class="lu-sub">菜谱升至 Lv.' + lv + '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 1800);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2300);
}
function toast(msg, kind) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2400);
}
function toastUndo(msg, onUndo) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) { if (onUndo) onUndo(); return; }
  const el = document.createElement('div');
  el.className = 'toast undo-toast';
  const span = document.createElement('span'); span.textContent = msg;
  const btn = document.createElement('button'); btn.className = 'toast-undo-btn'; btn.textContent = '撤销';
  el.appendChild(span); el.appendChild(btn);
  let done = false;
  const close = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  btn.addEventListener('click', () => { if (done) return; done = true; el.remove(); if (onUndo) onUndo(); });
  wrap.appendChild(el);
  setTimeout(close, 6000);
}
async function rollbackRealmXp(key, amount) {
  if (!REALM_DEFS[key] || !amount) return;
  const realms = Object.assign({}, player().realms || {});
  const s = realmState(key);
  s.xp -= amount;
  while (s.xp < 0) {
    if (s.layer > 0) { s.layer -= 1; s.xp += REALM_XP_NEEDED; }
    else { s.xp = 0; break; }
  }
  s.round = Math.floor(s.layer / REALM_STAGES);
  realms[key] = s;
  try {
    const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { realms: JSON.stringify(realms) } }) });
    const r = await j.json();
    if (r.ok && r.player) DATA.player = r.player; else DATA.player.realms = realms;
    renderResbar();
  } catch (e) {}
}
async function undoCook(mealId) {
  try {
    const j = await fetch('/api/cook-undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mealId }) });
    const r = await j.json();
    if (!r.ok) { toast('撤销失败：' + (r.error || ''), 'warn'); return; }
    await loadData();
    if (r.rollback && r.rollback.realmXp) await rollbackRealmXp('灶神录', r.rollback.realmXp);
    renderMain('cook');
    const rb = r.rollback || {};
    const parts = ['已撤销做菜'];
    if (rb.wp) parts.push('愿力-' + rb.wp);
    if (rb.lp) parts.push('幸运-' + rb.lp);
    if (rb.dp) parts.push('天命-' + rb.dp);
    if (rb.realmXp) parts.push('灶神录经验-' + rb.realmXp);
    toast(parts.join(' · '), 'good');
  } catch (e) { toast('撤销失败：' + e.message, 'warn'); }
}

/* ---------- 背包仓库交互（接 /api/inventory） ---------- */
let bagView = 'bag';     // 'bag' | 'warehouse'
try { const _bv = localStorage.getItem('gameBagView'); if (_bv === 'bag' || _bv === 'warehouse') bagView = _bv; } catch (e) {}
let bagSub = 'all';      // 'all' | 'fridge'（仅 warehouse 下）
try { const _bs = localStorage.getItem('gameBagSub'); if (_bs === 'all' || _bs === 'fridge') bagSub = _bs; } catch (e) {}
function setBagView(v) { bagView = v; try { localStorage.setItem('gameBagView', v); } catch (e) {} renderMain('bag'); }
function setBagSub(v) { bagSub = v; try { localStorage.setItem('gameBagSub', v); } catch (e) {} renderMain('bag'); }
function invIcon_(type) { return type === 'ingredient' ? '🥬' : (type === 'dish' ? '🍲' : (type === 'item' ? '🔮' : '📦')); }
const RARITY_INFO = { 1:{label:'普通',c:'#9aa0a6'}, 2:{label:'良好',c:'#73b888'}, 3:{label:'稀有',c:'#5b8def'}, 4:{label:'史诗',c:'#a855f7'}, 5:{label:'传说',c:'#c9a227'} };
function getWhCap() {
  const m = inv().find(x => x.item_type === 'meta' && x.item_key === 'warehouseCap');
  return m ? (Number(m.qty) || 60) : 60;
}
async function invUpsert(item) {
  item = Object.assign({ item_type:'ingredient', item_key:(item.name||'item')+'', name:item.name||'物品', qty:1, rarity:3, location:'bag', zone:null }, item);
  try {
    const j = await fetch('/api/inventory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'upsert', item }) });
    const r = await j.json();
    if (r.ok && r.inventory) DATA.player.inventory = r.inventory;
    else throw new Error('no inventory');
  } catch (e) { toast('背包更新失败：' + e.message, 'warn'); }
}
async function invSet(arr) {
  try {
    const j = await fetch('/api/inventory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'set', inventory: arr }) });
    const r = await j.json();
    if (r.ok && r.inventory) { DATA.player.inventory = r.inventory; return r.inventory; }
    throw new Error('no inventory');
  } catch (e) { toast('背包保存失败：' + e.message, 'warn'); return null; }
}
async function moveInvItem(type, key, fromLoc, fromZone, toLoc, toZone) {
  let arr = inv().slice();
  const idx = arr.findIndex(x => x.item_type === type && String(x.item_key) === String(key) && (x.location||'bag') === fromLoc && (x.zone||null) === fromZone);
  if (idx < 0) return;
  const it = arr[idx];
  const tIdx = arr.findIndex(x => x !== it && x.item_type === it.item_type && String(x.item_key) === String(it.item_key) && (x.location||'bag') === toLoc && (x.zone||null) === toZone);
  if (tIdx >= 0) { arr[tIdx].qty = (Number(arr[tIdx].qty)||0) + (Number(it.qty)||0); arr.splice(idx,1); }
  else arr[idx] = Object.assign({}, it, { location: toLoc, zone: toZone, ts: new Date().toISOString() });
  const res = await invSet(arr);
  if (res) { renderBag(); toast('已' + (toLoc === 'bag' ? '取出背包' : '存入仓库'), ''); }
}
async function delInvItem(type, key, loc, zone) {
  if (!confirm('确定丢弃该物品？此操作不可恢复。')) return;
  let arr = inv().filter(x => !(x.item_type === type && String(x.item_key) === String(key) && (x.location||'bag') === loc && (x.zone||null) === zone));
  const res = await invSet(arr);
  if (res) { renderBag(); toast('已丢弃', 'warn'); }
}
async function expandWarehouse() {
  const cost = 50; const wp = num(player().willpower, 0);
  if (wp < cost) { toast('愿力不足，需 ' + cost + ' 点', 'warn'); return; }
  if (!confirm('花费 ' + cost + ' 愿力，将仓库扩容 +20 格？')) return;
  try {
    const j = await fetch('/api/reward', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ willpower: -cost, source:'仓库扩容', text:'+20 格' }) });
    const r = await j.json();
    if (!r.ok) { toast('扩容失败', 'warn'); return; }
    DATA.player.willpower = r.player.willpower; renderResbar();
    await invUpsert({ item_type:'meta', item_key:'warehouseCap', name:'仓库容量', qty: getWhCap()+20, rarity:3, location:'warehouse', zone:null, note:'容量上限' });
    renderBag(); toast('📦 仓库已扩容至 ' + getWhCap() + ' 格', 'good');
  } catch (e) { toast('扩容失败：' + e.message, 'warn'); }
}
function openBagAddModal() {
  const f = document.getElementById('bagAddForm'); if (f) f.reset();
  const m = document.getElementById('bagAddModal'); if (m) m.classList.add('open');
}
function closeBagAddModal() { const m = document.getElementById('bagAddModal'); if (m) m.classList.remove('open'); }
async function saveBagAdd() {
  const name = document.getElementById('bagAddName').value.trim();
  if (!name) { toast('名称不能为空', 'warn'); return; }
  const type = document.getElementById('bagAddType').value;
  const qty = Math.max(1, parseInt(document.getElementById('bagAddQty').value) || 1);
  const locSel = document.getElementById('bagAddLoc').value;
  const loc = locSel === 'fridge' ? 'warehouse' : locSel;
  const zone = locSel === 'fridge' ? 'fridge' : null;
  await invUpsert({ item_type: type, item_key: name, name, qty, rarity: 3, location: loc, zone, note: '' });
  closeBagAddModal();
  renderBag();
  toast('已入库：' + name + ' ×' + qty, 'good');
}
async function eatInvItem(type, key, loc, zone) {
  const k = String(key);
  let arr = inv().slice();
  const idx = arr.findIndex(x => x.item_type === type && String(x.item_key) === k && (x.location || 'bag') === loc && (x.zone || null) === (zone || null));
  if (idx < 0) return;
  const it = arr[idx];
  const qty = (Number(it.qty) || 1) - 1;
  if (qty <= 0) arr.splice(idx, 1);
  else arr[idx] = Object.assign({}, it, { qty });
  const res = await invSet(arr);
  if (res) { renderBag(); toast('🍽️ 享用了 ' + it.name + (qty > 0 ? '（剩 ' + qty + '）' : '，已吃完'), 'good'); }
}
function bagItemHtml(it) {
  const ri = RARITY_INFO[it.rarity] || RARITY_INFO[3];
  const loc = it.location || 'bag';
  const zone = it.zone || null;
  const locLabel = loc === 'bag' ? '背包' : (zone === 'fridge' ? '冰箱区' : '仓库');
  const moveTo = loc === 'bag' ? ['warehouse', null] : ['bag', null];
  const moveLabel = loc === 'bag' ? '存入仓库' : '取出背包';
  const key = String(it.item_key).replace(/'/g, "\\'");
  return '<div class="bag-item rar-' + (it.rarity||3) + '" style="border-color:' + ri.c + ';">' +
    '<div class="bi-icon" style="background:' + ri.c + '22;">' + invIcon_(it.item_type) + '</div>' +
    '<div class="bi-body">' +
      '<div class="bi-name">' + esc(it.name) + (it.qty ? (' ×' + it.qty) : '') + '</div>' +
      '<div class="bi-meta"><span class="bi-loc">' + locLabel + '</span><span class="bi-rar" style="color:' + ri.c + ';">' + ri.label + '</span></div>' +
      (it.note && it.item_type !== 'meta' ? '<div class="bi-note">' + esc(it.note) + '</div>' : '') +
    '</div>' +
    '<div class="bi-acts">' +
      (it.item_type === 'dish' ? '<button class="bi-btn eat" onclick="eatInvItem(\'' + it.item_type + '\',\'' + key + '\',\'' + loc + '\',' + (zone ? '\'' + zone + '\'' : 'null') + ')">🍽️ 食用</button>' : '') +
      '<button class="bi-btn" onclick="moveInvItem(\'' + it.item_type + '\',\'' + key + '\',\'' + loc + '\',' + (zone ? '\'' + zone + '\'' : 'null') + ',\'' + moveTo[0] + '\',' + (moveTo[1] ? '\'' + moveTo[1] + '\'' : 'null') + ')">' + moveLabel + '</button>' +
      (it.item_type !== 'meta' ? '<button class="bi-btn danger" onclick="delInvItem(\'' + it.item_type + '\',\'' + key + '\',\'' + loc + '\',' + (zone ? '\'' + zone + '\'' : 'null') + ')">丢弃</button>' : '') +
    '</div>' +
  '</div>';
}
function renderBagHtml() {
  const all = inv().filter(x => x.item_type !== 'meta');
  const bag = all.filter(x => (x.location||'bag') === 'bag');
  const wh = all.filter(x => (x.location||'bag') === 'warehouse');
  const whNormal = wh.filter(x => (x.zone||null) !== 'fridge');
  const whFridge = wh.filter(x => (x.zone||null) === 'fridge');
  let items = bagView === 'bag' ? bag : (bagSub === 'fridge' ? whFridge : whNormal);
  const bagCap = BAG_CAP;
  const whCap = getWhCap();
  const curCap = bagView === 'bag' ? bagCap : whCap;
  const curCount = bagView === 'bag' ? bag.length : (bagSub === 'fridge' ? whFridge.length : whNormal.length);
  const full = curCount >= curCap;
  const tabs = [['bag','🎒 背包'],['warehouse','📦 仓库']];
  let html = '<div class="mod-toolbar"><div class="section-title">🎒 背包仓库</div><button class="btn primary" onclick="openBagAddModal()">➕ 添加物品</button></div>';
  html += '<div class="bag-tabs">' + tabs.map(t => '<div class="bag-tab' + (bagView===t[0]?' active':'') + '" onclick="setBagView(\'' + t[0] + '\')">' + t[1] + '</div>').join('') + '</div>';
  if (bagView === 'warehouse') {
    const subs = [['all','🗃️ 全部仓库'],['fridge','🧊 冰箱区']];
    html += '<div class="bag-subs">' + subs.map(s => '<div class="bag-sub' + (bagSub===s[0]?' active':'') + '" onclick="setBagSub(\'' + s[0] + '\')">' + s[1] + '</div>').join('') + '</div>';
  }
  html += '<div class="bag-cap' + (full?' full':'') + '">容量 ' + curCount + ' / ' + curCap + (bagView==='warehouse' ? ' <button class="bi-btn" style="margin-left:8px;" onclick="expandWarehouse()">＋扩容(+20，50愿力)</button>' : '') + '</div>';
  if (!items.length) html += '<div class="empty">这里还空空如也' + (bagView==='warehouse' ? '，去「烹饪」做菜会产出料理，或点「添加物品」入库' : '，做菜会自动产出料理到背包') + '</div>';
  else html += '<div class="bag-grid">' + items.map(bagItemHtml).join('') + '</div>';
  return html;
}
function renderBag() { return renderBagHtml(); }

function renderSkill() {
  const sk = player().skills || {};
  const total = skillTotalLevel();
  const groupsHtml = SKILL_GROUPS.map(g => {
    const cards = Object.keys(SKILL_DEFS).filter(k => SKILL_DEFS[k].group === g.key).map(k => {
      const lv = Number(sk[k]) || 0;
      const maxed = lv >= SKILL_MAX;
      const pct = Math.round(lv / SKILL_MAX * 100);
      return `<div class="card skill-card">
        <span class="tag">${esc(g.label)}</span>
        <h3>${esc(k)}</h3>
        <div class="meta">Lv.${lv} / ${SKILL_MAX}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="skill-desc">${esc(SKILL_DEFS[k].desc)}</div>
        <button class="btn primary sm skill-cult-btn" ${maxed ? 'disabled' : ''} onclick="cultivateSkill('${k}')">${maxed ? '已满级' : '修炼'}</button>
      </div>`;
    }).join('');
    return `<div class="skill-group-title">${esc(g.label)}</div><div class="cards">${cards}</div>`;
  }).join('');
  return `<div class="section-title">⚔️ 技能修炼台 <span class="game-tag">勤练自精 · 不耗愿力</span></div>
    <div class="skill-total">总技能等级 <b>${total}</b> / ${Object.keys(SKILL_DEFS).length * SKILL_MAX}</div>
    ${groupsHtml}
    <div class="meta" style="margin-top:12px">技能靠日常修行精进，修炼不再消耗愿力点（愿力是真实生活攒来的经验货币，留给更重要的突破）。满级 Lv.${SKILL_MAX}。</div>`;
}
async function cultivateSkill(name) {
  const p = player();
  const skills = Object.assign({}, p.skills || {});
  const lv = Number(skills[name]) || 0;
  if (lv >= SKILL_MAX) { toast(name + ' 已满级', ''); return; }
  try {
    skills[name] = lv + 1;
    const j = await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { skills: JSON.stringify(skills) } }) });
    const r = await j.json();
    if (!r.ok) { toast('修炼失败：' + (r.error || ''), 'warn'); return; }
    if (r.player && r.player.skills) DATA.player.skills = r.player.skills;
    else DATA.player.skills = skills;
    renderResbar(); renderMain('skill');
    if (skills[name] >= SKILL_MAX) skillAchievePopup(name, skills[name]);
    else toast('🎉 ' + name + ' 升级至 Lv.' + skills[name], 'good');
  } catch (e) { toast('修炼失败：' + e.message, 'warn'); }
}
function skillAchievePopup(name, lv) {
  const el = document.createElement('div');
  el.className = 'levelup-pop skill-achieve';
  el.innerHTML = '<div class="lu-badge">🏆 技能圆满！</div><div class="lu-sub">' + esc(name) + ' 已达 Lv.' + lv + '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 2600);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3100);
}

function renderRealm() {
  const totalLayer = realmTotalLayers();
  const doneCount = dailies().filter(d => dungeonDone(d.id)).length;
  const tb = realmBuffSum('taskBonus'), xr = realmBuffSum('xinmoResist'), mr = realmBuffSum('meimoResist');
  const cards = Object.keys(REALM_DEFS).map(k => {
    const def = REALM_DEFS[k];
    const s = realmState(k);
    const pct = Math.max(0, Math.min(100, Math.round(s.xp / REALM_XP_NEEDED * 100)));
    const stage = realmStageName(k);
    const roundTag = s.round > 0 ? '<span class="realm-round">轮回第' + s.round + '世·光环+' + s.round + '</span>' : '';
    return `<div class="card realm-card" onclick="openRealm('${k}')">
      <div class="dc-head"><span class="dc-icon">${def.icon}</span><div><div class="tag">${esc(def.group)}</div><h3>${esc(k)} ${roundTag}</h3></div></div>
      <div class="meta">${esc(stage)}　·　经验 ${s.xp}/${REALM_XP_NEEDED}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="meta">${esc(def.effect)}</div>
      <div class="realm-src" onclick="event.stopPropagation();renderMain('${def.src.mod}')">📌 经验来源：${esc(def.src.label)} →</div>
    </div>`;
  }).join('');
  return `<div class="section-title">🌟 境界参悟 <span class="game-tag">经验制 · 圆满轮回永续</span></div>
    <div class="realm-total">累计参悟层数 <b>${totalLayer}</b>　·　今日已通秘境 <b>${doneCount}/${dailies().length}</b></div>
    <div class="realm-buffs">当前修行 Buff：副本愿力 +${tb}%　·　心魔抵抗 +${xr}%　·　魅魔抵抗 +${mr}%</div>
    <div class="cards">${cards}</div>
    <div class="meta" style="margin-top:12px">每日完成对应副本 / 活动即记经验（每层 7 点）。满 9 层 = 一次圆满，进入轮回继续攀升，永久光环 +1，永无止境。点击卡片看详情。</div>`;
}
function openRealm(key) {
  const def = REALM_DEFS[key];
  if (!def) return;
  const s = realmState(key);
  const pct = Math.max(0, Math.min(100, Math.round(s.xp / REALM_XP_NEEDED * 100)));
  const curStage = (s.layer % REALM_STAGES);
  const layerList = def.stages.map((nm, i) => {
    const done = i < curStage;
    const cur = (i === curStage) && !done;
    const cls = (done || cur) ? ' cur' : ' locked-layer';
    const mark = done ? '✓' : (cur ? '◀ 当前' : '未达');
    return '<div class="realm-detail-layer' + cls + '"><span>' + (i + 1) + '. ' + esc(nm) + '</span><span>' + mark + '</span></div>';
  }).join('');
  const box = document.createElement('div');
  box.className = 'realm-modal';
  box.innerHTML = '<div class="realm-modal-box"><h3>' + def.icon + ' ' + esc(key) + (s.round > 0 ? ' · 轮回第' + s.round + '世' : '') + '</h3>' +
    '<p>' + esc(def.story) + '</p>' +
    '<div class="realm-card-effect" style="margin-bottom:8px"><b>境界效果：</b>' + esc(def.effect) + '</div>' +
    '<div class="realm-card-effect"><b>经验来源：</b>' + esc(def.src.label) + '（<a href="javascript:void(0)" onclick="closeRealm();renderMain(\'' + def.src.mod + '\')">前往 ' + esc(def.src.mod) + ' →</a>）</div>' +
    '<div style="font-size:13px;font-weight:600;margin:6px 0 4px">当前经验 ' + s.xp + '/' + REALM_XP_NEEDED + '（满则自动参悟一层）</div>' +
    '<div class="bar" style="height:12px;margin-bottom:8px"><i style="width:' + pct + '%"></i></div>' +
    '<div style="font-size:13px;font-weight:600;margin:6px 0 4px">修阶（本轮第 ' + (curStage + 1) + ' 阶）</div>' +
    layerList +
    '<button class="btn" style="margin-top:8px;background:var(--bg);color:var(--text-secondary)" onclick="closeRealm()">关闭</button></div>';
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  document.body.appendChild(box);
}
function closeRealm() { document.querySelectorAll('.realm-modal').forEach(m => m.remove()); }

    /* ---------- 江湖 NPC（二期 v9.0，移植主站逻辑，接 /api/insert/update/delete + /api/reward） ---------- */
    let npcSearch = '';
    let npcFilter = 'all';
    const NPC_TYPES = ['家人', '恋慕', '朋友'];
    const REL_RANKS = {
      '家人': { title: '亲情值', stages: ['陌路', '家人初识', '血脉相连', '温情弥笃', '至亲挚爱'], thr: [0, 20, 50, 90, 150] },
      '恋慕': { title: '情愫值', stages: ['初识', '心动', '暧昧', '依恋', '挚爱'], thr: [0, 20, 50, 90, 150] },
      '朋友': { title: '好感值', stages: ['初识', '友善', '投缘', '知己', '至交'], thr: [0, 20, 50, 90, 150] }
    };
    function npcsArr() { return (DATA && DATA.npcs) || []; }
    function getNpcMeta(n) { return (n && n.meta && typeof n.meta === 'object') ? n.meta : (typeof (n && n.meta) === 'string' ? safeParse(n.meta, {}) : {}); }
    function todayCST() { return new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }); }
    function npcRel(n) { const m = getNpcMeta(n); const r = m.rel; return (r === '家人' || r === '恋慕' || r === '朋友') ? r : (['家人', '恋慕', '朋友'].includes(n.type) ? n.type : '朋友'); }
    function npcRankInfo(n) {
      const rel = npcRel(n), cfg = REL_RANKS[rel] || REL_RANKS['朋友'];
      const aff = Number(getNpcMeta(n).affinity) || 0;
      let idx = 0; for (let i = 0; i < cfg.thr.length; i++) { if (aff >= cfg.thr[i]) idx = i; }
      return { rel: rel, title: cfg.title, stage: cfg.stages[idx], aff: aff, pct: Math.min(100, Math.round(aff / 150 * 100)) };
    }
    function npcAffTodayKey() { return 'game_npcaff_' + todayKey(); }
    function npcAffGrantedToday() { try { return JSON.parse(localStorage.getItem(npcAffTodayKey()) || '[]'); } catch (e) { return []; } }
    function markNpcAffToday(id) { const a = npcAffGrantedToday(); if (!a.includes(id)) { a.push(id); try { localStorage.setItem(npcAffTodayKey(), JSON.stringify(a)); } catch (e) {} } }
    async function grantNpcAffinityByText(text) {
      if (!text) return;
      for (const n of npcsArr()) {
        if ((n.type || '') === '野外首领') continue;
        const nm = (n.name || '');
        if (!nm) continue;
        const baseName = nm.split('(')[0].trim();
        const pm = nm.match(/\(([^)]*)\)/);
        const parenAliases = pm ? pm[1].split(/[、,，]/).map(s => s.trim()).filter(Boolean) : [];
        const metaAliases = (getNpcMeta(n).aliases || []).filter(Boolean);
        const names = [baseName].concat(parenAliases, metaAliases).filter(Boolean);
        if (!names.some(nm2 => nm2 && text.indexOf(nm2) >= 0)) continue;
        if (npcAffGrantedToday().includes(n.id)) return;
        markNpcAffToday(n.id);
        const meta = getNpcMeta(n);
        const aff = (Number(meta.affinity) || 0) + 5;
        const log = (meta.visitLog || []); log.unshift({ date: todayCST(), note: '任务勾选 · 好感+5' });
        const newMeta = Object.assign({}, meta, { affinity: aff, visitLog: log.slice(0, 30) });
        try {
          const j = await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'npcs', id: n.id, fields: { meta: JSON.stringify(newMeta) } }) });
          const r = await j.json();
          if (r.ok) { await loadData(); toast('💗 ' + nm + ' 好感 +5（' + aff + '）', 'good'); }
          else toast('好感更新失败：' + (r.error || ''), 'warn');
        } catch (e) { toast('好感更新失败：' + e.message, 'warn'); }
        return;
      }
    }
    function npcList() {
      const all = npcsArr().filter(n => (n.type || '') !== '野外首领');
      const kw = (npcSearch || '').trim().toLowerCase();
      return all.filter(n => {
        if (npcFilter !== 'all' && (n.type || '') !== npcFilter) return false;
        if (kw && !((n.name || '') + (n.desc || '') + (n.region || '')).toLowerCase().includes(kw)) return false;
        return true;
      });
    }
    function npcCardsHtml() {
      const list = npcList();
      if (!list.length) return '<div class="empty">没有匹配的 NPC</div>';
      return list.map(n => {
        const st = n.status || '未遇';
        const stCls = st === '熟识' ? 'known' : (st === '已遇' ? 'met' : '');
        const meta = getNpcMeta(n);
        const aff = Number(meta.affinity) || 0;
        const ri = npcRankInfo(n);
        const lastTs = Number(meta.lastVisitTs) || 0;
        const cooling = lastTs && (Date.now() - lastTs) < 24 * 3600 * 1000;
        return '<div class="npc-card" onclick="openNpcDetail(' + n.id + ')">' +
          '<div class="npc-head"><div class="npc-avatar">' + esc((n.name || '?').slice(0, 1)) + '</div>' +
          '<div class="npc-id"><div class="npc-name">' + esc(n.name || '') + '</div><div class="npc-sub">' + esc(n.region || '') + '</div></div>' +
          '<span class="npc-rel npc-rel-' + esc(ri.rel) + '">' + esc(ri.rel) + '</span></div>' +
          '<div class="npc-desc">' + esc(n.desc || '') + '</div>' +
          '<div class="npc-aff"><span class="npc-rel-title">' + esc(ri.title) + '</span> · <b>' + esc(ri.stage) + '</b>' +
          '<span class="npc-aff-bar"><span style="width:' + ri.pct + '%"></span></span> <b>' + aff + '</b></div>' +
          '<div class="npc-actions"><button class="npc-visit" onclick="event.stopPropagation();openNpcDetail(' + n.id + ')">互动</button>' +
          '<button class="npc-del" onclick="event.stopPropagation();delNpc(' + n.id + ')">删除</button></div></div>';
      }).join('');
    }
    function npcRulesHtml() {
      const lines = Object.keys(REL_RANKS).map(rel => {
        const cfg = REL_RANKS[rel];
        const steps = cfg.stages.map((s, i) => (i === 0 ? s + '（' + cfg.thr[0] + '）' : s + '（≥' + cfg.thr[i] + '）')).join(' → ');
        return '<div class="npc-rule-line"><b class="npc-rel-' + esc(rel) + '">' + esc(rel) + '线 · ' + esc(cfg.title) + '</b>' +
          '<div class="npc-rule-steps">' + esc(steps) + '</div></div>';
      }).join('');
      return '<details class="npc-rules"><summary>📖 关系规则（三条线 · 等级与升级阈值 · 点击展开）</summary>' + lines +
        '<div class="npc-rule-note">互动好感与愿力同梯度：聊天 +1 / 打电话 +2 / 视频 +3 / 线下 +5。好感满 ' + REL_RANKS['家人'].thr[REL_RANKS['家人'].thr.length - 1] + ' 登顶当前线。</div></details>';
    }
    function renderNpc() {
      const typeOpts = ['all'].concat(NPC_TYPES);
      const filterHtml = typeOpts.map(t => '<option value="' + t + '"' + (npcFilter === t ? ' selected' : '') + '>' + (t === 'all' ? '全部类型' : t) + '</option>').join('');
      return '<div class="section-title">🧝 江湖 NPC <span class="game-tag">墨渊人物档案</span></div>' +
        '<div class="npc-toolbar">' +
          '<input class="input" id="npcSearch" placeholder="搜索名字 / 人设 / 州" value="' + esc(npcSearch) + '" oninput="npcSearch=this.value;const g=document.getElementById(\'npcGrid\');if(g)g.innerHTML=npcCardsHtml();">' +
          '<select class="input" id="npcTypeFilter" onchange="npcFilter=this.value;const g=document.getElementById(\'npcGrid\');if(g)g.innerHTML=npcCardsHtml();">' + filterHtml + '</select>' +
        '</div>' +
        '<div class="npc-grid" id="npcGrid">' + npcCardsHtml() + '</div>' +
        npcRulesHtml() +
        '<div class="section-title" style="margin-top:18px">＋ 新增 NPC</div>' +
        '<div class="npc-form">' +
          '<input class="input" id="npcName" placeholder="名字（必填）">' +
          '<select class="input" id="npcRel"><option value="家人">家人（亲情线）</option><option value="恋慕">恋慕（情愫线）</option><option value="朋友">朋友（好感线）</option></select>' +
          '<input class="input" id="npcRegion" placeholder="所属州（如 豫西灵宝州）">' +
          '<input class="input" id="npcX" type="number" placeholder="地图X(40-620)">' +
          '<input class="input" id="npcY" type="number" placeholder="地图Y(60-460)">' +
          '<input class="input" id="npcDesc" placeholder="一句话人设">' +
          '<button class="btn primary" onclick="addNpc()">建卡</button>' +
        '</div>';
    }
    function openNpcDetail(id) {
      const n = npcsArr().find(x => x.id === id); if (!n) return;
      const meta = getNpcMeta(n);
      const aff = Number(meta.affinity) || 0;
      const ri = npcRankInfo(n);
      const log = meta.visitLog || [];
      const logHtml = log.length ? log.map(l => '<div class="log-row"><span class="log-ts">' + esc(l.date || '') + '</span><span class="log-item">' + esc(l.note || '') + '</span></div>').join('')
        : '<div class="game-empty">尚无奇遇记录</div>';
      const box = document.createElement('div');
      box.className = 'realm-modal';
      box.innerHTML = '<div class="realm-modal-box npc-detail">' +
        '<h3>🧝 ' + esc(n.name || '') + '</h3>' +
        '<div class="npc-detail-meta">' + esc(ri.rel) + '（' + esc(REL_RANKS[ri.rel] ? REL_RANKS[ri.rel].title : '') + '） · ' + esc(n.region || '未知州') + ' · 状态 <b>' + esc(n.status || '未遇') + '</b> · 当前 <b>' + esc(ri.stage) + '</b></div>' +
        '<div class="npc-detail-desc">' + esc(n.desc || '（无简介）') + '</div>' +
        '<div class="npc-aff">' + esc(ri.title) + ' <span class="npc-aff-bar"><span style="width:' + ri.pct + '%"></span></span> <b>' + aff + '</b></div>' +
        '<div style="font-size:13px;font-weight:600;margin:10px 0 4px">奇遇记录</div>' +
        '<div style="max-height:40vh;overflow:auto">' + logHtml + '</div>' +
        '<div style="font-size:13px;font-weight:600;margin:10px 0 4px">互动（好感 + 愿力同梯度）</div>' +
        '<div class="npc-interact">' + Object.keys(NPC_INTERACT).map(k => '<button class="npc-ib" onclick="interactNpc(' + n.id + ',\'' + k + '\')">' + NPC_INTERACT[k].label + '<br><small>+' + NPC_INTERACT[k].aff + ' 好感 · +' + NPC_INTERACT[k].wp + ' 愿力</small></button>').join('') + '</div>' +
        '<button class="realm-cult-btn" style="margin-top:10px;background:var(--panel2);color:var(--text)" onclick="closeRealm()">关闭</button></div>';
      box.onclick = (e) => { if (e.target === box) box.remove(); };
      document.body.appendChild(box);
    }
    const NPC_INTERACT = { chat: { wp: 1, aff: 1, label: '聊天' }, call: { wp: 2, aff: 2, label: '打电话' }, video: { wp: 3, aff: 3, label: '视频' }, meet: { wp: 5, aff: 5, label: '线下见面' } };
    async function interactNpc(id, tier) {
      const n = npcsArr().find(x => x.id === id); if (!n) return;
      const cfg = NPC_INTERACT[tier]; if (!cfg) return;
      const meta = getNpcMeta(n);
      const aff = (Number(meta.affinity) || 0) + cfg.aff;
      let next = n.status;
      if (next === '未遇') next = '已遇';
      else if (next === '已遇' && tier === 'meet') next = '熟识';
      const log = (meta.visitLog || []); log.unshift({ date: todayCST(), note: cfg.label + ' · 好感+' + cfg.aff + ' 愿力+' + cfg.wp });
      const newMeta = Object.assign({}, meta, { affinity: aff, lastVisit: todayCST(), lastVisitTs: Date.now(), visitLog: log.slice(0, 30) });
      try {
        await grantWP(cfg.wp, 'NPC·' + cfg.label, n.name);
        const j = await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'npcs', id: id, fields: { status: next, meta: JSON.stringify(newMeta) } }) });
        const r = await j.json();
        if (r.ok) { await loadData(); go('npc'); openNpcDetail(id); toast('💗 与 ' + n.name + ' ' + cfg.label + '：好感 +' + cfg.aff + ' · 愿力 +' + cfg.wp, 'good'); }
        else toast('互动记录失败：' + (r.error || ''), 'warn');
      } catch (e) { toast('互动失败：' + e.message, 'warn'); }
    }
    function addNpc() {
      const gv = id => (document.getElementById(id) || {}).value || '';
      const name = gv('npcName');
      if (!name.trim()) { toast('名字必填', 'warn'); return; }
      const rel = gv('npcRel') || '朋友';
      const fields = {
        name: name.trim(),
        type: rel,
        region: gv('npcRegion') || '',
        x: Number(gv('npcX')) || 0,
        y: Number(gv('npcY')) || 0,
        desc: gv('npcDesc') || '',
        status: '未遇',
        meta: JSON.stringify({ rel: rel, affinity: 0, visitLog: [] }),
        created_at: new Date().toISOString()
      };
      fetch('/api/insert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'npcs', fields }) })
        .then(r => r.json()).then(j => {
          if (j.ok) { toast('🪪 已建卡：' + fields.name, 'good'); loadData().then(() => go('npc')); }
          else toast('建卡失败：' + (j.error || ''), 'warn');
        }).catch(e => toast('建卡失败：' + e.message, 'warn'));
    }
    async function delNpc(id) {
      showConfirm('⚠ 删除 NPC', '确定删除该人物档案？此操作不可恢复。', async function () {
        try {
          const j = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'npcs', id: id }) });
          const r = await j.json();
          if (r.ok) { toast('已删除', 'warn'); await loadData(); go('npc'); }
          else toast('删除失败：' + (r.error || ''), 'warn');
        } catch (e) { toast('删除失败：' + e.message, 'warn'); }
      });
    }

    /* ---------- 位置地图（二期 v10.0，移植主站逻辑，SVG 江湖图 + 州详情 + 探索度） ---------- */
    const REGION_COLORS = { '豫西灵宝州': '#BA7517', '江淮六安州': '#0F6E56', '关外盘锦州': '#993556', '云中AI界': '#534AB7', '衡阳': '#185FA5', '魔渊': '#A32D2D' };
    const MAP_REGIONS = [
      { n: '豫西·灵宝州', r: '豫西灵宝州', x: 40, y: 68, w: 280, h: 118, town: '家责' },
      { n: '江淮·六安州', r: '江淮六安州', x: 350, y: 68, w: 280, h: 118, town: '安居' },
      { n: '关外·盘锦州', r: '关外盘锦州', x: 40, y: 208, w: 280, h: 118, town: '暧昧' },
      { n: '云中·AI界', r: '云中AI界', x: 350, y: 208, w: 280, h: 118, town: '记忆' },
      { n: '衡阳·本阵', r: '衡阳', x: 40, y: 348, w: 280, h: 118, town: '玩家 · 凯' },
      { n: '魔渊', r: '魔渊', x: 350, y: 348, w: 280, h: 118, town: '野外首领' }
    ];
    const MAP_TARGET = { '豫西灵宝州': 3, '江淮六安州': 3, '关外盘锦州': 3, '云中AI界': 3, '衡阳': 1, '魔渊': 0 };
    function mapCountIn(rg) { return npcsArr().filter(n => (n.region || '') === rg && (n.type || '') !== '野外首领').length; }
    function mapExplPct(rg) { return MAP_TARGET[rg] ? Math.min(100, Math.round(mapCountIn(rg) / MAP_TARGET[rg] * 100)) : 100; }
    function openRegionDetail(rg) {
      const npcs = npcsArr().filter(n => (n.region || '') === rg && (n.type || '') !== '野外首领');
      const meta = { '豫西灵宝州': '家责', '江淮六安州': '安居', '关外盘锦州': '暧昧', '云中AI界': '记忆', '衡阳': '玩家 · 凯' };
      const targetOf = MAP_TARGET;
      const pct = targetOf[rg] ? Math.min(100, Math.round(npcs.length / targetOf[rg] * 100)) : 100;
      const listHtml = npcs.length ? npcs.map(n => '<div class="log-row" style="cursor:pointer" onclick="closeRealm();openNpcDetail(' + n.id + ')"><span class="log-item">' + esc(n.name || '') + '</span><span class="log-amt">' + esc(n.status || '未遇') + '</span></div>').join('') : '<div class="game-empty">此州尚无 NPC</div>';
      const box = document.createElement('div');
      box.className = 'realm-modal';
      box.innerHTML = '<div class="realm-modal-box"><h3>🗺️ ' + esc(rg) + '</h3>' +
        '<div class="map-region-sub">镇守：' + esc(meta[rg] || '—') + '</div>' +
        '<div class="map-expl-bar" style="margin:8px 0"><span style="width:' + pct + '%"></span></div>' +
        '<div class="map-expl-pct">探索度 ' + pct + '%　·　NPC ' + npcs.length + '</div>' +
        '<div style="font-size:13px;font-weight:600;margin:10px 0 4px">境内人物</div>' +
        '<div style="max-height:40vh;overflow:auto">' + listHtml + '</div>' +
        '<button class="realm-cult-btn" style="margin-top:10px;background:var(--panel2);color:var(--text)" onclick="closeRealm()">关闭</button></div>';
      box.onclick = (e) => { if (e.target === box) box.remove(); };
      document.body.appendChild(box);
    }
    function renderMap() {
      const npcs = npcsArr();
      const countIn = (rg) => npcs.filter(n => (n.region || '') === rg && (n.type || '') !== '野外首领').length;
      const explPct = (rg) => MAP_TARGET[rg] ? Math.min(100, Math.round(countIn(rg) / MAP_TARGET[rg] * 100)) : 100;
      const statNpcs = npcs.filter(n => (n.type || '') !== '野外首领').length;
      const explRegions = MAP_REGIONS.filter(r => MAP_TARGET[r.r] > 0);
      const statExpl = explRegions.length ? Math.round(explRegions.reduce((s, r) => s + explPct(r.r), 0) / explRegions.length) : 0;
      const regionCards = MAP_REGIONS.map(rg => {
        if (rg.r === '魔渊') return '<div class="map-region danger" onclick="go(\'demon\')"><div class="map-region-name">🔴 ' + rg.n + '</div><div class="map-region-sub">魔障巢穴 · 点击前往镇压魔障</div></div>';
        const pct = explPct(rg.r);
        return '<div class="map-region" onclick="openRegionDetail(\'' + rg.r + '\')"><div class="map-region-name">' + rg.n + '</div>' +
          '<div class="map-region-sub">镇守：' + rg.town + ' · NPC ' + countIn(rg.r) + '</div>' +
          '<div class="map-expl-bar"><span style="width:' + pct + '%"></span></div>' +
          '<div class="map-expl-pct">探索度 ' + pct + '%</div></div>';
      }).join('');
      const dots = npcs.map(n => {
        const col = REGION_COLORS[n.region] || '#5F5E5A';
        const cx = Number(n.x) || 0, cy = Number(n.y) || 0;
        if ((n.type || '') === '野外首领') {
          return '<g style="cursor:pointer" onclick="go(\'demon\')"><circle cx="' + cx + '" cy="' + cy + '" r="16" fill="#FCEBEB" stroke="#A32D2D"/>' +
            '<path d="M' + (cx - 12) + ' ' + (cy - 12) + ' L' + (cx - 16) + ' ' + (cy - 20) + ' L' + (cx - 6) + ' ' + (cy - 14) + ' Z" fill="#A32D2D"/>' +
            '<path d="M' + (cx + 12) + ' ' + (cy - 12) + ' L' + (cx + 16) + ' ' + (cy - 20) + ' L' + (cx + 6) + ' ' + (cy - 14) + ' Z" fill="#A32D2D"/>' +
            '<text x="' + cx + '" y="' + (cy + 32) + '" text-anchor="middle" font-size="12" fill="#A32D2D">魔障</text></g>';
        }
        return '<g style="cursor:pointer" onclick="openNpcDetail(' + n.id + ')"><circle cx="' + cx + '" cy="' + cy + '" r="13" fill="#fff" stroke="' + col + '"/><text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="12" fill="' + col + '">' + esc((n.name || '?').slice(0, 1)) + '</text></g>';
      }).join('');
      const regSvg = MAP_REGIONS.map(rg => {
        const col = REGION_COLORS[rg.r] || '#5F5E5A';
        return '<g><rect x="' + rg.x + '" y="' + rg.y + '" width="' + rg.w + '" height="' + rg.h + '" rx="12" fill="#fff" stroke="' + col + '" stroke-width="0.5"/>' +
          '<text x="' + (rg.x + 16) + '" y="' + (rg.y + 22) + '" font-size="14" font-weight="500" fill="' + col + '">' + rg.n + '</text>' +
          '<text x="' + (rg.x + 16) + '" y="' + (rg.y + 40) + '" font-size="12" fill="var(--muted)">镇守：' + rg.town + '</text>' +
          '<g transform="translate(' + (rg.x + rg.w - 22) + ',' + (rg.y + 14) + ')"><rect x="0" y="0" width="8" height="18" rx="2" fill="' + col + '"/><path d="M0 0 L4 -6 L8 0 Z" fill="' + col + '"/></g></g>';
      }).join('');
      const mapSvg = '<svg class="world-map" viewBox="0 0 680 490" width="100%">' +
        '<text x="40" y="34" font-size="14" font-weight="500" fill="var(--text)">江湖图志 · 燕云风</text>' +
        '<text x="40" y="52" font-size="12" fill="var(--muted)">界碑传送 · 天涯客解锁 · 镇守据点 · 点击图标唤访 / 前往</text>' +
        regSvg + dots + '</svg>';
      return '<div class="section-title">🗺️ 位置地图 <span class="game-tag">世界探索</span></div>' +
        '<div class="map-overview">江湖 NPC <b>' + statNpcs + '</b> · 已解锁州 <b>' + (MAP_REGIONS.length - 1) + '</b> · 平均探索度 <b>' + statExpl + '%</b></div>' +
        '<div class="map-regions">' + regionCards + '</div>' +
        mapSvg +
        '<details class="map-legend-box"><summary>图例</summary><div class="map-legend"><span>■ 界碑（传送）</span><span>● NPC（点击唤访）</span><span>🔴 魔障（野首·点击前往）</span><span>🛡 镇守</span></div></details>';
    }

    /* ---------- 心法（二期 v11.0，移植主站逻辑，Tab分组 + 被动buff + 自定义 + 收藏，localStorage 持久化） ---------- */
    let heartTabName = 'basic';
    const HEART_DEFS = [
      { id: 'shouxin',  tab: 'basic', name: '守心诀', effect: '心魔抵抗 +5%',  desc: '每日副本对心魔造成的伤害提升 5%，拖延复苏更慢。', buff: { xinmoResist: 5 }, unlock: null },
      { id: 'jingxin',  tab: 'basic', name: '静心咒', effect: '魅魔抵抗 +5%',  desc: '魅魔沉沦度增速降低 5%，诱惑更难得逞。', buff: { meimoResist: 5 }, unlock: null },
      { id: 'qinjian',  tab: 'basic', name: '勤勉录', effect: '任务愿力 +3%',  desc: '所有每日秘境愿力产出 +3%。', buff: { taskBonus: 3 }, unlock: null },
      { id: 'taishang', tab: 'adv',   name: '太上忘情', effect: '心魔抵抗 +12%', desc: '心魔抵抗大幅提升，需「功德法」参悟≥3 层。', buff: { xinmoResist: 12 }, unlock: { realm: '功德法', layer: 3, text: '需功德法≥3层' } },
      { id: 'mingjing', tab: 'adv',   name: '明镜台', effect: '任务愿力 +8%',  desc: '愿力产出更丰，需「万卷书」参悟≥3 层。', buff: { taskBonus: 8 }, unlock: { realm: '万卷书', layer: 3, text: '需万卷书≥3层' } },
      { id: 'qianji',   tab: 'adv',   name: '千机变', effect: '魅魔抵抗 +12%', desc: '魅魔抵抗大幅提升，需「千面法」参悟≥3 层。', buff: { meimoResist: 12 }, unlock: { realm: '千面法', layer: 3, text: '需千面法≥3层' } }
    ];
    function heartCustom() { try { return JSON.parse(localStorage.getItem('lifeos_heartCustom') || '[]'); } catch (e) { return []; } }
    function heartActive() { try { return JSON.parse(localStorage.getItem('lifeos_heartActive') || '[]'); } catch (e) { return []; } }
    function heartFav() { try { return JSON.parse(localStorage.getItem('lifeos_heartFav') || '[]'); } catch (e) { return []; } }
    function heartUnlocked(def) { if (!def.unlock) return true; return realmLayer(def.unlock.realm) >= def.unlock.layer; }
    function heartBuffSum(type) {
      let s = 0;
      HEART_DEFS.forEach(d => { if (heartActive().includes(d.id) && d.buff && d.buff[type]) s += d.buff[type]; });
      heartCustom().forEach(c => { if (heartActive().includes('c_' + c.id) && c.buff && c.buff[type]) s += Number(c.buff[type]) || 0; });
      return s;
    }
    function heartTab(name) { heartTabName = name; renderMain('heart'); }
    function toggleHeartActive(id) {
      const a = heartActive(); const i = a.indexOf(id);
      if (i >= 0) a.splice(i, 1); else a.push(id);
      localStorage.setItem('lifeos_heartActive', JSON.stringify(a));
      toast(a.includes(id) ? '🧠 心法已激活' : '心法已停用', a.includes(id) ? 'good' : '');
      renderMain('heart');
    }
    function toggleHeartFav(id) {
      const f = heartFav(); const i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1); else f.push(id);
      localStorage.setItem('lifeos_heartFav', JSON.stringify(f));
      renderMain('heart');
    }
    function parseBuffText(t) {
      const m = String(t || '').match(/([+\-]\d+)\s*%/);
      if (/心魔/.test(t)) return { xinmoResist: Number(m && m[1]) || 0 };
      if (/魅魔/.test(t)) return { meimoResist: Number(m && m[1]) || 0 };
      return { taskBonus: Number(m && m[1]) || 0 };
    }
    function addHeartCustom() {
      const gv = id => (document.getElementById(id) || {}).value || '';
      const name = gv('hfName');
      if (!name.trim()) { toast('心法名必填', 'warn'); return; }
      const custom = heartCustom();
      const id = Date.now();
      custom.push({ id: id, name: name.trim(), effect: gv('hfEffect'), desc: gv('hfDesc'), buff: parseBuffText(gv('hfEffect')) });
      localStorage.setItem('lifeos_heartCustom', JSON.stringify(custom));
      toast('🧠 已录入自创心法', 'good');
      renderMain('heart');
    }
    function delHeartCustom(id) {
      showConfirm('⚠ 删除自创心法', '确定删除该自创心法？', function () {
        localStorage.setItem('lifeos_heartCustom', JSON.stringify(heartCustom().filter(c => c.id !== id)));
        localStorage.setItem('lifeos_heartActive', JSON.stringify(heartActive().filter(x => x !== 'c_' + id)));
        localStorage.setItem('lifeos_heartFav', JSON.stringify(heartFav().filter(x => x !== 'c_' + id)));
        renderMain('heart');
      });
    }
    function renderHeart() {
      const active = heartActive(), fav = heartFav(), custom = heartCustom();
      const all = [];
      HEART_DEFS.forEach(d => all.push(Object.assign({ _custom: false }, d)));
      custom.forEach(c => all.push({ _custom: true, id: 'c_' + c.id, tab: 'custom', name: c.name, effect: c.effect || '', desc: c.desc || '', buff: c.buff || {}, unlock: null }));
      all.sort((a, b) => (fav.includes(b.id) ? 1 : 0) - (fav.includes(a.id) ? 1 : 0));
      const tabs = [['basic', '基础心法'], ['adv', '进阶心法'], ['custom', '自定义心法']];
      const tabHtml = tabs.map(t => '<div class="hf-tab' + (heartTabName === t[0] ? ' active' : '') + '" onclick="heartTab(\'' + t[0] + '\')">' + t[1] + '</div>').join('');
      const list = all.filter(d => d.tab === heartTabName);
      const cards = list.length ? list.map(d => {
        const unlocked = heartUnlocked(d);
        const isActive = active.includes(d.id);
        const isFav = fav.includes(d.id);
        const cls = 'hf-card' + (unlocked ? '' : ' locked') + (isActive ? ' active' : '');
        return '<div class="' + cls + '" title="' + esc(d.desc || '') + '">' +
          (unlocked ? '' : '<div class="hf-lock">🔒 ' + esc(d.unlock ? d.unlock.text : '未解锁') + '</div>') +
          '<div class="hf-head"><div class="hf-name">' + esc(d.name) + '</div>' +
          '<button class="hf-fav' + (isFav ? ' on' : '') + '" title="收藏置顶" onclick="toggleHeartFav(\'' + d.id + '\')">' + (isFav ? '★' : '☆') + '</button></div>' +
          '<div class="hf-effect">' + (esc(d.effect) || '—') + '</div>' +
          '<div class="hf-desc">' + esc(d.desc || '') + '</div>' +
          (unlocked ? '<button class="hf-act' + (isActive ? ' on' : '') + '" onclick="toggleHeartActive(\'' + d.id + '\')">' + (isActive ? '已激活 · 点击停用' : '激活（生效被动）') + '</button>' : '') +
          (d._custom ? '<button class="hf-del" onclick="delHeartCustom(' + d.id.replace('c_', '') + ')">删除</button>' : '') +
          '</div>';
      }).join('') : '<div class="empty">暂无此类心法</div>';
      const buffSummary = '心魔抵抗 +' + heartBuffSum('xinmoResist') + '%　·　魅魔抵抗 +' + heartBuffSum('meimoResist') + '%　·　任务愿力 +' + heartBuffSum('taskBonus') + '%';
      const customForm = heartTabName === 'custom' ? '<div class="hf-form"><div class="section-title" style="margin-top:14px">＋ 自创心法</div>' +
        '<input class="input" id="hfName" placeholder="心法名（必填）">' +
        '<input class="input" id="hfEffect" placeholder="效果标签，如 心魔抵抗 +5%">' +
        '<input class="input" id="hfDesc" placeholder="心法释义（hover 可见）">' +
        '<button class="btn primary" onclick="addHeartCustom()">录入</button></div>' : '';
      return '<div class="section-title">🧠 心法 · 被动 buff <span class="game-tag">激活后全局生效</span></div>' +
        '<div class="hf-buff-sum">当前生效：' + buffSummary + '</div>' +
        '<div class="hf-tabs">' + tabHtml + '</div>' +
        '<div class="hf-grid">' + cards + '</div>' + customForm;
    }

    /* ---------- 角色主页（二期 v12.0，移植主站逻辑，全局状态面板 + 精力/资产/技能境界统计） ---------- */
    function renderChar() {
      const p = player();
      const willpower = num(p.willpower, 0);
      const level = num(p.level, 1);
      const mod = willpower % 1000;
      const xpPct = Math.max(0, Math.min(100, mod / 10));
      const xpRemain = Math.max(0, 1000 - mod);
      const fin = (DATA && DATA.finance && DATA.finance.records) || [];
      let net = 0, inc = 0, exp = 0;
      fin.forEach(r => { const a = Number(r.amount) || 0; net += a; if (a >= 0) inc += a; else exp += -a; });
      const exLogs = (DATA && DATA.exercise && DATA.exercise.logs) || [];
      const today = todayCST();
      const todayCal = exLogs.filter(l => l.date === today).reduce((s, l) => s + (Number(l.cal) || 0), 0);
      const energy = Math.max(0, Math.min(100, 60 + Math.round(todayCal / 15)));
      const xinmoD = demonDanger({ key: 'xinmo', maxHp: 100 });
      const meimoD = demonDanger({ key: 'meimo' });
      const riskPct = Math.round(Math.max(xinmoD, meimoD) * 100);
      const riskLevel = riskPct >= 66 ? '高危' : (riskPct >= 33 ? '警戒' : '平稳');
      const riskCls = riskPct >= 66 ? 'danger' : (riskPct >= 33 ? 'warn' : '');
      const activeHearts = heartActive();
      const heartNames = HEART_DEFS.filter(d => activeHearts.includes(d.id)).map(d => d.name)
        .concat(heartCustom().filter(c => activeHearts.includes('c_' + c.id)).map(c => c.name));
      const heartSummary = heartNames.length ? heartNames.join('、') : '无（心法页可激活）';
      const npcToday = (DATA.npcs || []).filter(n => n.meta && n.meta.lastVisit === today).length;
      const resCard = fin.length
        ? '<div class="game-card"><div class="game-card-title">💰 资源总览</div>' +
          '<div class="game-res-net">净资产 <b>¥' + net.toFixed(2) + '</b></div>' +
          '<div class="game-res-row"><span>收入</span><b class="pos">+' + inc.toFixed(2) + '</b></div>' +
          '<div class="game-res-row"><span>支出</span><b class="neg">-' + exp.toFixed(2) + '</b></div></div>'
        : '<div class="game-card"><div class="game-card-title">💰 资源总览</div><div class="game-card-note">还没有记账数据</div></div>';
      return '<div class="section-title">👤 角色主页 <span class="game-tag">全局状态面板</span></div>' +
        '<div class="game-grid">' +
          '<div class="game-card game-char">' +
            '<div class="game-char-head"><div class="game-avatar">🎮</div><div><div class="game-char-name">玩家 · 凯</div><div class="game-char-sub">Lv.' + level + '</div></div></div>' +
            '<div class="game-xp-label" title="愿力经验 = 当前愿力点对 1000 取模；满 1000 自动凝结升阶">愿力经验 <b class="c-wp">' + willpower.toFixed(1) + '</b> / 1000（距升级还差 ' + xpRemain.toFixed(1) + '）</div>' +
            '<div class="game-bar big"><span style="width:' + xpPct + '%"></span></div>' +
            '<div class="game-stats">' +
              '<div class="game-stat" title="等级：愿力经验凝结升阶所得"><div class="game-stat-num">' + level + '</div><div class="game-stat-lbl">🏅 等级</div></div>' +
              '<div class="game-stat" title="总技能等级：七艺修炼之和，上限 70"><div class="game-stat-num">' + skillTotalLevel() + '</div><div class="game-stat-lbl">🛠️ 技能</div></div>' +
              '<div class="game-stat" title="累计参悟层数：七境累计，圆满轮回永续"><div class="game-stat-num">' + realmTotalLayers() + '</div><div class="game-stat-lbl">🗺️ 境界</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="game-card"><div class="game-card-title">🔋 今日精力 <span class="game-tag">疲劳·派生</span></div><div class="game-energy-num">' + energy + '<span class="game-energy-unit">/100</span></div><div class="game-bar"><span style="width:' + energy + '%"></span></div>' +
            '<div class="game-card-note">由今日运动 ' + todayCal + ' kcal 派生（约 +' + Math.round(todayCal / 15) + ' 精力）；今日 NPC 拜访 ' + npcToday + ' 次</div></div>' +
          resCard +
          '<div class="game-card gs-panel"><div class="game-card-title">🛡️ 全局状态 <span class="game-tag">实时</span></div>' +
            '<div class="gs-risk ' + riskCls + '">魔障风险：<b>' + riskLevel + '</b>（' + riskPct + '%）</div>' +
            '<div class="gs-sub">心魔威胁 ' + Math.round(xinmoD * 100) + '% · 魅魔沉沦 ' + Math.round(meimoD * 100) + '%</div>' +
            '<div class="gs-buff">生效心法：<b>' + esc(heartSummary) + '</b></div>' +
            '<div class="gs-buff-sub">心魔抵抗 +' + heartBuffSum('xinmoResist') + '% · 魅魔抵抗 +' + heartBuffSum('meimoResist') + '% · 任务愿力 +' + heartBuffSum('taskBonus') + '%</div>' +
            '</div>' +
        '</div>';
    }

    function renderSuccubus() {
      const sc = (DATA && DATA.succubus) || {};
      if (!sc || !sc.weekKey) return renderPlaceholder('魅魔', '暂无魅魔状态（player.succubus 为空）。');
      const sed = Number(sc.seductions) || 0;
      const sunk = !!sc.sunk;
      let form = '初诱（新手护盾）';
      if (sunk) form = '终焉 · 沉沦';
      else if (sed >= 2) form = '噬心（刺客形态）';
      else if (sed === 1) form = '缠丝';
      const sinkPct = Math.max(0, Math.min(100, sed / 3 * 100));
      const stateCard = '<div class="card succ-state"><div class="dc-head"><span class="dc-icon">🦑</span><div><div class="tag">魅魔 · 状态机</div><h3>' + esc(form) + '</h3></div></div>' +
        '<div class="meta">周期 ' + esc(sc.weekKey) + '</div>' +
        '<div class="meta">已诱惑 ' + sed + ' / 3</div>' +
        (sunk ? '<div class="meta">⚠️ 已沉沦：本周每次愿力收益减半（周一解除）</div>' : '') +
        '<div class="bar"><i style="width:' + sinkPct + '%"></i></div>';
      const action = sunk
        ? '<button class="btn primary sm" disabled>本周已沉沦，无法再抵抗</button><div class="meta">沉沦效果：本周每次愿力收益减半，周一自动解除。</div>'
        : '<button class="btn primary" onclick="openSuccubusModal()">🌹 遭遇魅魔诱惑</button><div class="meta">每次遭遇先判定：抵御成功 +1 愿力点；抵御失败计入次数（第1次免费，第2次耗1幸运点/拆天命点，第3次沉沦）。</div>';
      return '<div class="section-title">🌹 魅魔 <span class="game-tag">每周计数 · 周一重置</span></div>' + stateCard + action;
    }
    function openSuccubusModal() {
      const sc = (DATA && DATA.succubus) || {};
      if (sc.sunk) { toast('你已沉沦于魔渊，本周无法再抵抗。', 'warn'); return; }
      const sed = Number(sc.seductions) || 0;
      let ctx = '';
      if (sed === 0) ctx = '第1次抵御失败：新手护盾触发，免费挣脱。';
      else if (sed === 1) ctx = '第2次抵御失败：消耗 1 幸运点（不足自动拆解 1 天命点）。';
      else if (sed === 2) ctx = '第3次抵御失败：本周彻底沉沦。';
      const box = document.createElement('div');
      box.className = 'realm-modal';
      box.innerHTML = '<div class="realm-modal-box succ-modal">' +
        '<h3>🌹 遭遇魅魔诱惑</h3>' +
        '<div class="succ-ctx">' + esc(ctx) + ' 抵御成功则 +1 愿力点。</div>' +
        '<div class="succ-btns">' +
          '<button class="succ-btn succ-success" onclick="chooseSuccubusResult(\'success\')">🛡️ 抵御成功<br><small>+1 愿力点</small></button>' +
          '<button class="succ-btn succ-fail" onclick="chooseSuccubusResult(\'failure\')">💔 抵御失败<br><small>计入一次</small></button>' +
        '</div></div>';
      box.onclick = (e) => { if (e.target === box) box.remove(); };
      document.body.appendChild(box);
    }
    function closeSuccubusModal() { document.querySelectorAll('.realm-modal').forEach(m => { if (m.querySelector('.succ-modal')) m.remove(); }); }
    function chooseSuccubusResult(result) {
      closeSuccubusModal();
      if (result !== 'success' && result !== 'failure') return;
      encounterSuccubus(result);
    }
    async function encounterSuccubus(result) {
      try {
        const j = await (await fetch('/api/succubus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'encounter', result }) })).json();
        if (j.ok) {
          DATA.succubus = j.succubus;
          if (DATA.player) { DATA.player.willpower = j.willpower; DATA.player.lucky = j.lucky; DATA.player.destiny = j.destiny; }
          renderResbar();
          toast(j.msg + '（愿力 ' + j.willpower + ' · 幸运 ' + j.lucky + ' · 天命 ' + j.destiny + '）', result === 'success' ? 'good' : 'warn');
          renderMain('demon');
        } else toast('失败：' + (j.error || ''), 'warn');
      } catch (e) { toast('遭遇失败：' + e.message, 'warn'); }
    }

/* ===== 周天试炼（周本 · 周级副本，数据共享 localStorage lifeos_weeklyDefs/Claimed） ===== */
const WEEKLY_DEFAULTS = [
  { id: 'clean', name: '洗澡', gname: '净身涤尘', icon: '🛁', tasks: ['洗澡'], need: 2, reward: 5, unlock: null, fixed: true },
  { id: 'family', name: '亲情连线', gname: '亲缘连线', icon: '📞', tasks: ['爷爷通话', '家人发视频'], need: 1, reward: 5, unlock: null, fixed: true },
  { id: 'laundry', name: '洗衣鞋', gname: '浣衣净履', icon: '👟', tasks: ['洗衣服和鞋'], need: 1, reward: 5, unlock: null, fixed: true },
  { id: 'chest', name: '周俸宝箱', gname: '周俸宝箱', icon: '🎁', tasks: ['每周领奖励'], need: 1, reward: 10, unlock: { requireDone: 2, text: '需先完成 2 个周本' }, fixed: true }
];
function weeklyDefs() {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem('lifeos_weeklyDefs') || '[]'); } catch (e) { custom = []; }
  return WEEKLY_DEFAULTS.concat(custom);
}
function yearWeekCST() {
  const now = new Date();
  const day = now.getDay();                 // 0=Sun..6=Sat
  const diff = (day + 6) % 7;               // 距本周一的天数
  const monday = new Date(now); monday.setDate(now.getDate() - diff);
  const y = monday.getFullYear();
  const firstThu = new Date(y, 0, 4);
  const firstMon = new Date(firstThu); firstMon.setDate(firstThu.getDate() - ((firstThu.getDay() + 6) % 7));
  const week = Math.ceil((((monday - firstMon) / 86400000) + 1) / 7);
  return y + '-W' + String(week).padStart(2, '0');
}
function weeklyClaimed() {
  try { return JSON.parse(localStorage.getItem('lifeos_weeklyClaimed') || '{}'); } catch (e) { return {}; }
}
/* 进度：从任务板「周级」任务实时计算（匹配文本 + 已完成）。
   匹配规则：周本关键词 与 任务文本 任一方包含另一方即算命中
   （如「洗澡」命中「周一洗澡」、「爷爷通话」命中「周五和爷爷通话」），兼容主站默认配置与真实任务命名。 */
function weeklyProgress(def) {
  const tb = (DATA.taskboard || []).filter(t => /周级/.test(t.grp || ''));
  const hit = (sub, text) => {
    const s = (sub || '').trim(), t = (text || '');
    return s && t && (t.indexOf(s) >= 0 || s.indexOf(t) >= 0);
  };
  const done = def.tasks.reduce((s, sub) => s + tb.filter(t => t.done && hit(sub, t.text)).length, 0);
  return Math.min(done, def.need);
}
function weeklyIsCleared(def) {
  if (def.id === 'chest') { const c = weeklyClaimed()[yearWeekCST()]; return !!(c && c.chest); }
  return weeklyProgress(def) >= def.need;
}
async function claimWeekly(id) {
  const def = weeklyDefs().find(d => d.id === id);
  if (!def) return;
  const wk = yearWeekCST();
  const claimed = weeklyClaimed();
  if (claimed[wk] && claimed[wk][id]) { toast('本周已领取'); return; }
  if (def.unlock) {
    const doneCount = weeklyDefs().filter(d => d.id !== 'chest' && weeklyIsCleared(d)).length;
    if (doneCount < (def.unlock.requireDone || 0)) { toast('🔒 ' + (def.unlock.text || '未解锁'), 'warn'); return; }
  }
  // 先标记已领取，防止快速重复点击造成双发
  claimed[wk] = claimed[wk] || {}; claimed[wk][id] = true;
  try { localStorage.setItem('lifeos_weeklyClaimed', JSON.stringify(claimed)); } catch (e) {}
  renderMain(CUR);
  try {
    const r = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: def.reward, source: '周天试炼', text: def.gname }) });
    const j = await r.json();
    if (j.ok && j.player) {
      DATA.player = Object.assign({}, DATA.player, { willpower: j.player.willpower, level: j.player.level, lucky: j.player.lucky, destiny: j.player.destiny });
      renderResbar();
    }
    wpLedgerAppend(def.reward, '周天试炼', def.gname);
    toast('🎁 周天试炼「' + def.gname + '」领取成功，+' + def.reward + ' 愿力', 'good');
    renderMain(CUR);
  } catch (e) { toast('领取失败：' + e.message, 'warn'); renderMain(CUR); }
}
function weeklyCardsHtml() {
  const defs = weeklyDefs();
  const wk = yearWeekCST();
  const claimed = weeklyClaimed()[wk] || {};
  const doneCount = defs.filter(d => d.id !== 'chest' && weeklyIsCleared(d)).length;
  return defs.map(d => {
    const isChest = d.id === 'chest';
    const cleared = weeklyIsCleared(d);
    const prog = weeklyProgress(d);
    const locked = !!(d.unlock && doneCount < (d.unlock.requireDone || 0));
    const got = !!claimed[d.id];
    let btn;
    if (isChest) {
      if (locked) btn = '<button class="dungeon-token-btn" disabled>🔒 ' + esc(d.unlock ? d.unlock.text : '未解锁') + '</button>';
      else if (got) btn = '<button class="dungeon-token-btn done" disabled>✓ 已领取</button>';
      else btn = '<button class="dungeon-token-btn" onclick="claimWeekly(\'' + d.id + '\')">🎁 领取 +' + d.reward + '</button>';
    } else {
      if (got) btn = '<button class="dungeon-token-btn done" disabled>✓ 已领取</button>';
      else if (cleared) btn = '<button class="dungeon-token-btn" onclick="claimWeekly(\'' + d.id + '\')">🎁 领取 +' + d.reward + '</button>';
      else btn = '<button class="dungeon-token-btn" disabled>' + prog + '/' + d.need + ' 进行中</button>';
    }
    const barPct = isChest ? (locked ? 0 : 100) : Math.min(Math.round(prog / d.need * 100), 100);
    return '<div class="dungeon-token weekly-token' + (cleared ? ' done' : '') + (locked ? ' locked' : '') + '">' +
      (cleared ? '<div class="dungeon-seal">通</div>' : '') +
      '<div class="dungeon-token-icon">' + esc(d.icon || '❖') + '</div>' +
      '<div class="dungeon-token-gname">' + esc(d.gname || '') + '</div>' +
      '<div class="dungeon-token-name">' + esc(d.name || '') + '</div>' +
      (isChest ? '' : '<div class="dungeon-progress"><div class="dungeon-progress-bar" style="width:' + barPct + '%"></div></div><div class="dungeon-progress-txt">' + prog + ' / ' + d.need + '</div>') +
      btn +
      '</div>';
  }).join('');
}
function renderTrial() {
  return '<div class="section-title">⚡ 周天试炼 <span class="game-tag">一周一轮回 · 七日一炼心</span></div>' +
    '<div class="dungeon weekly-dungeon">' +
      '<div class="dungeon-header"><div><div class="dungeon-title">周 天 试 炼</div><div class="dungeon-sub">完成周级副本，炼心得愿力</div></div>' +
        '<div class="dungeon-head-right"><button class="dg-btn" style="width:auto;padding:6px 14px" onclick="openWeeklyManage()">⚙️ 管理周本</button></div>' +
      '</div>' +
      '<div class="dungeon-cards weekly-cards">' + weeklyCardsHtml() + '</div>' +
      weeklyTasksHtml() +
      '<div class="dungeon-reset-note">🗓️ 每周一 0 点（中国时区）重置周本进度，未领取的奖励将失效。</div>' +
    '</div>';
}
function openWeeklyManage() {
  const defs = weeklyDefs();
  const rowHtml = (d) => {
    const isC = d.fixed;
    return '<div class="wk-mng-row">' +
      '<div class="wk-mng-ic">' + esc(d.icon || '❖') + '</div>' +
      '<div class="wk-mng-info"><div class="wk-mng-gname">' + esc(d.gname || '') + '<span class="wk-mng-name">' + esc(d.name || '') + '</span></div>' +
      '<div class="wk-mng-sub">匹配：' + (d.tasks || []).map(esc).join(' / ') + '　·　需求 ' + d.need + '　·　奖励 +' + d.reward + (d.unlock ? ('　·　' + esc(d.unlock.text)) : '') + '</div></div>' +
      (isC ? '<span class="wk-mng-fixed">默认</span>' : '<button type="button" class="tb-del-btn" onclick="delWeeklyDef(' + d.id + ')">✕</button>') +
      '</div>';
  };
  const box = document.createElement('div');
  box.className = 'realm-modal';
  box.id = 'weeklyManageModal';
  box.innerHTML = '<div class="realm-modal-box wk-mng-box">' +
    '<h3>⚙️ 管理周本</h3>' +
    '<div class="wk-mng-list">' + defs.map(rowHtml).join('') + '</div>' +
    '<div class="wk-mng-add">' +
      '<div class="game-card-title" style="margin:10px 0 4px">＋ 新增自定义周本</div>' +
      '<input class="input" id="wkName" placeholder="名称（如 沐浴养心）">' +
      '<input class="input" id="wkGname" placeholder="古风名（如 沐身涤尘）">' +
      '<input class="input" id="wkIcon" placeholder="图标 emoji（如 🛁）" style="max-width:130px">' +
      '<input class="input" id="wkTasks" placeholder="匹配任务文本，逗号分隔（如 洗澡,沐浴）">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<input class="input" id="wkNeed" type="number" placeholder="需求次数" style="max-width:130px">' +
        '<input class="input" id="wkReward" type="number" placeholder="奖励愿力" style="max-width:130px">' +
      '</div>' +
      '<button class="btn btn-green" onclick="addWeeklyDef()">新增</button>' +
    '</div>' +
    '<button class="dg-btn" style="margin-top:14px;background:var(--bg);color:var(--text-secondary)" onclick="closeRealm()">关闭</button>' +
  '</div>';
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  document.body.appendChild(box);
}
function addWeeklyDef() {
  const name = (document.getElementById('wkName') || {}).value || '';
  const gname = (document.getElementById('wkGname') || {}).value || name;
  const icon = (document.getElementById('wkIcon') || {}).value || '❖';
  const tasks = (document.getElementById('wkTasks') || {}).value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const need = parseInt((document.getElementById('wkNeed') || {}).value) || tasks.length || 1;
  const reward = parseInt((document.getElementById('wkReward') || {}).value) || 5;
  if (!tasks.length) { toast('请填写匹配任务文本', 'warn'); return; }
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem('lifeos_weeklyDefs') || '[]'); } catch (e) { custom = []; }
  custom.push({ id: Date.now(), name: name.trim(), gname: gname.trim(), icon: icon, tasks: tasks, need: need, reward: reward, unlock: null, fixed: false });
  try { localStorage.setItem('lifeos_weeklyDefs', JSON.stringify(custom)); } catch (e) {}
  toast('🗡️ 已新增周本', 'good');
  const m = document.getElementById('weeklyManageModal'); if (m) m.remove();
  renderMain(CUR);
}
function delWeeklyDef(id) {
  showConfirm('删除周本', '确定删除这个自定义周本？', function () {
    let custom = [];
    try { custom = JSON.parse(localStorage.getItem('lifeos_weeklyDefs') || '[]'); } catch (e) { custom = []; }
    custom = custom.filter(d => d.id !== id);
    try { localStorage.setItem('lifeos_weeklyDefs', JSON.stringify(custom)); } catch (e) {}
    toast('已删除自定义周本');
    const m = document.getElementById('weeklyManageModal'); if (m) m.remove();
    renderMain(CUR);
  });
}
function renderWeekly() {
  const defs = weeklyDefs();
  const rowHtml = (d) => {
    const isC = d.fixed;
    return '<div class="wk-mng-row">' +
      '<div class="wk-mng-ic">' + esc(d.icon || '❖') + '</div>' +
      '<div class="wk-mng-info"><div class="wk-mng-gname">' + esc(d.gname || '') + '<span class="wk-mng-name">' + esc(d.name || '') + '</span></div>' +
      '<div class="wk-mng-sub">匹配：' + (d.tasks || []).map(esc).join(' / ') + '　·　需求 ' + d.need + '　·　奖励 +' + d.reward + (d.unlock ? ('　·　' + esc(d.unlock.text)) : '') + '</div></div>' +
      (isC ? '<span class="wk-mng-fixed">默认</span>' : '<button type="button" class="tb-del-btn" onclick="delWeeklyDef(' + d.id + ')">✕</button>') +
      '</div>';
  };
  return '<div class="section-title">📅 周本管理 <span class="game-tag">自定义周级修行副本</span></div>' +
    '<div class="dungeon weekly-dungeon"><div class="dungeon-cards" style="padding:0">' +
      '<div class="wk-mng-list" style="max-height:none">' + defs.map(rowHtml).join('') + '</div>' +
    '</div>' +
    '<div class="wk-mng-add" style="margin-top:14px">' +
      '<div class="game-card-title" style="margin:4px 0">＋ 新增自定义周本</div>' +
      '<input class="input" id="wkName" placeholder="名称（如 沐浴养心）">' +
      '<input class="input" id="wkGname" placeholder="古风名（如 沐身涤尘）">' +
      '<input class="input" id="wkIcon" placeholder="图标 emoji（如 🛁）" style="max-width:130px">' +
      '<input class="input" id="wkTasks" placeholder="匹配任务文本，逗号分隔（如 洗澡,沐浴）">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<input class="input" id="wkNeed" type="number" placeholder="需求次数" style="max-width:130px">' +
        '<input class="input" id="wkReward" type="number" placeholder="奖励愿力" style="max-width:130px">' +
      '</div>' +
      '<button class="btn btn-green" onclick="addWeeklyDef()">新增</button>' +
    '</div></div>';
}

function renderPlaceholder(title, msg) {
  return `<div class="section-title">${esc(title)}</div>
  <div class="empty">🚧 <b>${esc(title)}</b><br><br>${esc(msg)}<br><br><span style="font-size:12px">（一期只读骨架 · 完整交互见后续任务 #210 / #209）</span></div>`;
}

function render() {
  renderResbar();
  renderNav();
  let last = 'dashboard';
  try { last = localStorage.getItem('gameLastView') || 'dashboard'; } catch (e) {}
  go(last);
}

/* ---------- 主题切换 ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('gametheme', t); } catch (e) {}
  document.querySelectorAll('#themes button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
}
(function initTheme() {
  let t = 'xuanzhi';
  try { t = localStorage.getItem('gametheme') || 'xuanzhi'; } catch (e) {}
  applyTheme(t);
  document.querySelectorAll('#themes button').forEach(b => {
    b.onclick = () => applyTheme(b.dataset.t);
  });
})();

loadData();
