'use strict';
/* 游戏人生独立站 · 方案C 骨架（一期基建，只读展示真数据） */

const MODULES = [
  { id: 'dashboard', name: '仪表盘', icon: '🏠', group: '首页' },
  { id: 'demon',     name: '魔障',   icon: '🩸', group: '修行' },
  { id: 'altar',     name: '命愿祈铺', icon: '🔮', group: '修行' },
  { id: 'dungeon',   name: '每日秘境', icon: '🗺️', group: '修行' },
  { id: 'cook',      name: '烹饪',   icon: '🍳', group: '生活' },
  { id: 'bag',       name: '背包仓库', icon: '🎒', group: '生活' },
  { id: 'skill',     name: '技能',   icon: '⚔️', group: '成长' },
  { id: 'realm',     name: '境界',   icon: '🌟', group: '成长' },
  { id: 'npc',       name: '江湖NPC', icon: '🧝', group: '成长' },
  { id: 'map',       name: '地图',   icon: '🌐', group: '成长' },
  { id: 'heart',     name: '心法',   icon: '📜', group: '其他' },
  { id: 'char',      name: '角色',   icon: '👤', group: '其他' },
  { id: 'succubus',  name: '魅魔',   icon: '🌹', group: '其他' },
  { id: 'trial',     name: '周天试炼', icon: '⚡', group: '其他' },
  { id: 'weekly',    name: '周本',   icon: '📅', group: '其他' },
];
const GROUPS = ['首页', '修行', '生活', '成长', '其他'];
const QUA = { 1: { label: '普通', star: 1 }, 2: { label: '美味', star: 2 }, 3: { label: '珍稀', star: 3 }, 4: { label: '完美', star: 4 } };
const BAG_CAP = 40;        // 背包固定 40 格
const WAREHOUSE_CAP = 60;  // 仓库默认 60 格（一期只读，扩容逻辑二期）

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
    ['ct', '契约', num(p.contract, 0) + ' 日'],
  ];
  document.getElementById('resbar').innerHTML = items.map(([c, k, v]) =>
    `<div class="res ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
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

function go(id) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('hot', a.dataset.id === id));
  renderMain(id);
  window.scrollTo(0, 0);
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
    case 'dungeon':   html = renderPlaceholder('每日秘境', '每日副本机制将在二期接入真实进度数据，本期仅占位。'); break;
    case 'cook':      html = renderCook(); break;
    case 'bag':       html = renderBag(); break;
    case 'skill':     html = renderSkill(); break;
    case 'realm':     html = renderRealm(); break;
    case 'succubus':  html = renderSuccubus(); break;
    default: html = renderPlaceholder(mod.name, '该模块数据接口将在二期接入，本期仅占位。');
  }
  main.innerHTML = html;
}

function renderDashboard() {
  const p = player();
  const recipes = food().recipes || [];
  const got = recipes.filter(r => r.obtained !== 0 && r.obtained !== false).length;
  const ds = demons();
  const bag = inv().filter(i => i.location === 'bag').length;
  const wh = inv().filter(i => i.location === 'warehouse').length;
  const hero = `<div class="hero"><h1>欢迎回来，凯</h1><p>今日修行概览 · 愿力 ${num(p.willpower, 0)} / 契约 ${num(p.contract, 0)} 日 · ${ds.length} 道魔障待镇压</p></div>`;
  const cards = `
  <div class="cards">
    <div class="card"><span class="tag">🩸 魔障</span><h3>${ds.length} 道待镇压</h3>
      <div class="meta">${ds.slice(0, 3).map(d => esc(d.name)).join('、') || '暂无'}</div></div>
    <div class="card"><span class="tag">🍳 烹饪</span><h3>已习得 ${got}/${recipes.length}</h3>
      <div class="meta">菜谱库总 ${recipes.length} 道</div></div>
    <div class="card"><span class="tag">🎒 背包仓库</span><h3>背包 ${bag}/${BAG_CAP}</h3>
      <div class="meta">仓库 ${wh}/${WAREHOUSE_CAP} 格</div></div>
    <div class="card"><span class="tag">🔮 命愿祈铺</span><h3>LP ${num(p.lucky, 0)} → DP ${num(p.destiny, 0)}</h3>
      <div class="meta">凝结比例 10 LP = 1 DP</div></div>
  </div>`;
  return hero + `<div class="section-title">📊 修行概览</div>` + cards;
}

function renderDemon() {
  const ds = demons();
  if (!ds.length) return renderPlaceholder('魔障', '暂无魔障数据。');
  const cards = ds.map(d => {
    const hp = num(d.hp, 0), max = num(d.max_hp, 1) || 1;
    const pct = Math.max(0, Math.min(100, Math.round(hp / max * 100)));
    return `<div class="card"><span class="tag">${esc(d.kind || '魔障')} · ${esc(d.cycle || 'daily')}</span>
      <h3>${esc(d.name)}</h3>
      <div class="meta">HP ${hp}/${max} · 威胁 ${num(d.threat, 0)}</div>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  return `<div class="section-title">🩸 魔障 · 共 ${ds.length} 道</div><div class="cards">${cards}</div>`;
}

function renderAltar() {
  const p = player();
  return `<div class="section-title">🔮 命愿祈铺 · 化命台</div>
  <div class="cards">
    <div class="card"><span class="tag">当前持有</span>
      <div class="kv"><span>幸运 LP</span><b>${num(p.lucky, 0)}</b></div>
      <div class="kv"><span>天命 DP</span><b>${num(p.destiny, 0)}</b></div>
      <div class="kv"><span>契约</span><b>${num(p.contract, 0)} 日</b></div>
    </div>
    <div class="card"><span class="tag">凝结规则（只读）</span>
      <div class="kv"><span>比例</span><b>10 LP = 1 DP</b></div>
      <div class="kv"><span>可凝结</span><b>${Math.floor(num(p.lucky, 0) / 10)} DP</b></div>
      <div class="meta" style="margin-top:8px">向上凝结为手动不可逆操作，写交互将在二期实现。</div>
    </div>
  </div>`;
}

function renderCook() {
  const recipes = food().recipes || [];
  if (!recipes.length) return renderPlaceholder('烹饪', '暂无菜谱数据。');
  const cards = recipes.map(r => {
    const lv = num(r.level, 1), prof = num(r.proficiency, 0);
    const q = QUA[r.quality] || QUA[1];
    const pct = Math.max(0, Math.min(100, Math.round(prof / 10 * 100)));
    return `<div class="card"><span class="tag">${q.label} ${stars(r.quality)}</span>
      <h3>${esc(r.name)}</h3>
      <div class="meta">Lv.${lv} · 熟练度 ${prof}/10${r.activated ? '' : ' · 未激活'}</div>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  return `<div class="section-title">🍳 烹饪 · 菜谱 ${recipes.length} 道</div><div class="cards">${cards}</div>`;
}

function renderBag() {
  const items = inv();
  const bag = items.filter(i => i.location === 'bag');
  const wh = items.filter(i => i.location === 'warehouse');
  const fridge = wh.filter(i => i.zone === 'fridge');
  const whOther = wh.filter(i => i.zone !== 'fridge');
  function list(arr) {
    if (!arr.length) return '<div class="meta">（空）</div>';
    return arr.map(i => `<div class="kv"><span>${esc(i.name)}</span><b>×${num(i.qty, 1)}</b></div>`).join('');
  }
  return `<div class="section-title">🎒 背包仓库</div>
  <div class="cards">
    <div class="card"><span class="tag">背包 ${bag.length}/${BAG_CAP}</span><h3>随身 ${bag.length} 件</h3>${list(bag)}</div>
    <div class="card"><span class="tag">仓库 ${wh.length}/${WAREHOUSE_CAP}</span><h3>仓储 ${whOther.length} 件</h3>${list(whOther)}</div>
    <div class="card"><span class="tag">🧊 冰箱区</span><h3>${fridge.length} 件</h3>${list(fridge)}</div>
  </div>`;
}

function renderSkill() {
  const sk = player().skills || {};
  const keys = Object.keys(sk);
  if (!keys.length) return renderPlaceholder('技能', '暂无技能数据（player.skills 为空）。');
  const cards = keys.map(k => `<div class="card"><span class="tag">技能</span><h3>${esc(k)}</h3>
    <div class="meta">${esc(typeof sk[k] === 'object' ? JSON.stringify(sk[k]) : sk[k])}</div></div>`).join('');
  return `<div class="section-title">⚔️ 技能 · ${keys.length}</div><div class="cards">${cards}</div>`;
}

function renderRealm() {
  const rm = player().realms || {};
  const keys = Object.keys(rm);
  if (!keys.length) return renderPlaceholder('境界', '暂无境界数据（player.realms 为空）。');
  const cards = keys.map(k => `<div class="card"><span class="tag">境界</span><h3>${esc(k)}</h3>
    <div class="meta">${esc(typeof rm[k] === 'object' ? JSON.stringify(rm[k]) : rm[k])}</div></div>`).join('');
  return `<div class="section-title">🌟 境界 · ${keys.length}</div><div class="cards">${cards}</div>`;
}

function renderSuccubus() {
  const sc = (DATA && DATA.succubus) || {};
  if (!sc || !sc.weekKey) return renderPlaceholder('魅魔', '暂无魅魔状态（player.succubus 为空）。');
  return `<div class="section-title">🌹 魅魔</div>
  <div class="cards"><div class="card"><span class="tag">状态机</span>
    <div class="kv"><span>周期</span><b>${esc(sc.weekKey)}</b></div>
    <div class="kv"><span> seductions</span><b>${num(sc.seductions, 0)}</b></div>
    <div class="kv"><span>沉沦 sunk</span><b>${sc.sunk ? '是' : '否'}</b></div>
  </div></div>`;
}

function renderPlaceholder(title, msg) {
  return `<div class="section-title">${esc(title)}</div>
  <div class="empty">🚧 <b>${esc(title)}</b><br><br>${esc(msg)}<br><br><span style="font-size:12px">（一期只读骨架 · 完整交互见后续任务 #210 / #209）</span></div>`;
}

function render() {
  renderResbar();
  renderNav();
  go('dashboard');
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
