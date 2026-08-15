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
function skillCost(lv) { return lv <= 3 ? 20 : (lv <= 6 ? 40 : 60); } // Lv0-3:20 / 4-6:40 / 7-9:60
function skillTotalLevel() {
  const s = player().skills || {};
  return Object.keys(SKILL_DEFS).reduce((sum, k) => sum + (Number(s[k]) || 0), 0);
}
const REALM_DEFS = {
  '炼体法': { group:'body', story:'以八段锦为基，淬炼筋骨气血，乃修行之根。', effect:'每参悟一层，每日副本「运动打卡」愿力产出 +5%。', baseCost:50, costStep:30, maxLayer:9, minDungeons:0,
    layers:['散炼境','凝筋境','易骨境','锻脏境','换血境','通脉境','洗髓境','伐毛境','大圆满'] },
  '万卷书': { group:'mind', story:'读万卷书，明事理、开智慧。', effect:'每参悟一层，每日副本「写日记 / 学英语」愿力产出 +5%。', baseCost:50, costStep:30, maxLayer:9, minDungeons:0,
    layers:['百卷境','三百卷','五百卷','八百卷','千卷境','千五卷','两千卷','三千卷','大圆满'] },
  '万里路': { group:'mind', story:'行万里路，见天地、阔眼界。', effect:'参悟圆满可提升心魔抵抗。', baseCost:50, costStep:30, maxLayer:9, minDungeons:2,
    layers:['初行境','百里境','千里境','万里境','遍历境','通达境','洞明境','无界境','大圆满'] },
  '功德法': { group:'heart', story:'渡人渡己，积功德于无形。', effect:'参悟圆满可提升魅魔抵抗。', baseCost:50, costStep:30, maxLayer:9, minDungeons:3,
    layers:['初善境','行善境','积善境','圆满境','广济境','普度境','无量境','慈悲境','大圆满'] },
  '千面法': { group:'heart', story:'理智与感性并存，千人千面。', effect:'每参悟一层，每日全副本愿力产出 +3%。', baseCost:50, costStep:30, maxLayer:9, minDungeons:4,
    layers:['初面境','双面境','多面境','洞悉境','无相境','随心境','通明境','自在境','大圆满'] }
};
function realmCost(def, layer) { return def.baseCost + def.costStep * layer; }
function realmLayer(key) {
  const v = (player().realms || {})[key];
  if (typeof v === 'number') return v;
  const m = String(v || '').match(/第(\d+)层/);
  return m ? parseInt(m[1], 10) : 0;
}
function realmTotalLayers() { return Object.keys(REALM_DEFS).reduce((s, k) => s + realmLayer(k), 0); }
function realmMaxTotal() { return Object.keys(REALM_DEFS).reduce((s, k) => s + REALM_DEFS[k].maxLayer, 0); }
function realmUnlocked(def) {
  if (!def.minDungeons) return true;
  return DAILY_DUNGEONS.filter(d => dungeonDone(d.id)).length >= def.minDungeons;
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

let CUR = 'dashboard';   // 当前视图 id（供交互后局部重渲染）
function go(id) {
  CUR = id;
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
    case 'dungeon':   html = renderDungeon(); break;
    case 'cook':      html = renderCook(); break;
    case 'bag':       html = renderBag(); break;
    case 'skill':     html = renderSkill(); break;
    case 'realm':     html = renderRealm(); break;
    case 'npc':       html = renderNpc(); break;
    case 'map':       html = renderMap(); break;
    case 'heart':     html = renderHeart(); break;
    case 'char':      html = renderChar(); break;
    case 'succubus':  html = renderSuccubus(); break;
    case 'trial':     html = renderTrial(); break;
    case 'weekly':    html = renderWeekly(); break;
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
      <div class="meta">仓库 ${wh}/${getWhCap()} 格</div></div>
    <div class="card"><span class="tag">🔮 命愿祈铺</span><h3>LP ${num(p.lucky, 0)} → DP ${num(p.destiny, 0)}</h3>
      <div class="meta">凝结比例 10 LP = 1 DP</div></div>
  </div>`;
  return hero + `<div class="section-title">📊 修行概览</div>` + cards;
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
  const cards = ds.map(d => {
    const hp = num(d.hp, 0), max = d.key === 'xinmo' ? 100 : (num(d.max_hp, 1) || 1);
    const pct = Math.max(0, Math.min(100, Math.round(hp / max * 100)));
    const dg = demonDanger(d);
    const danger = dg >= 0.66;
    let extra = '';
    if (d.key === 'xinmo') {
      extra = `<div class="meta">每完成一个每日秘境副本对其造成伤害（每日 0 点复苏）。${hp <= 0 ? '🎉 已击破！' : '未除则降低副本愿力产出。'}</div>`;
    } else if (d.key === 'meimo') {
      const suc = DATA.succubus || {};
      const sed = Number(suc.seductions) || 0;
      const sunk = !!suc.sunk;
      let form = '初诱'; if (sunk) form = '终焉·沉沦'; else if (sed >= 2) form = '噬心'; else if (sed === 1) form = '缠丝';
      extra = `<div class="meta">本周诱惑 ${sed}/3 · 形态：${form}${sunk ? '（收益减半，周一解除）' : ''}</div>`;
    } else if (d.extra && d.extra.note) {
      extra = `<div class="meta">${esc(d.extra.note)}</div>`;
    }
    return `<div class="card demon-card${danger ? ' danger' : ''}">
      <div class="dc-head"><span class="dc-icon">${iconOf(d.key)}</span><div><div class="tag">${esc(d.kind || '魔障')} · ${esc(d.cycle || 'daily')}</div><h3>${esc(d.name)}</h3></div></div>
      <div class="meta">HP ${hp}/${max} · 威胁 ${num(d.threat, 0)}${danger ? ' · ⚠️ 高危' : ''}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${extra}
    </div>`;
  }).join('');
  return `<div class="section-title">🩸 魔障 · 共 ${ds.length} 道</div>
  <div class="demon-avatars-title">主威胁高亮</div>
  <div class="demon-avatars">${avatars}</div>
  <div class="cards">${cards}</div>
  <details class="demon-rules"><summary>规则说明</summary>
    <div class="demon-rules-body">· <b>心魔·拖延</b>：完成每日秘境副本对其造成伤害，HP 归零即击破；每日 0 点复苏，未除则降低副本愿力产出。<br>· <b>魅魔·诱惑</b>：每周计数 0/3，周一 0 点重置；抵御成功 +1 愿力，失败按梯度处理，沉沦后短期收益减半。（魅魔交互在二期接入）</div>
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
function renderAltar() {
  const p = player();
  const lp = num(p.lucky, 0), dp = num(p.destiny, 0);
  const can = Math.floor(lp / 10);
  const enough = lp >= 10;
  return `<div class="section-title">🔮 命愿祈铺 · 化命台</div>
  <div class="fate-convert">
    <div class="fc-title">🔥 化命台 <span class="fc-sub">唯一货币升级渠道 · 不可逆</span></div>
    <div class="fc-row">10 幸运点(LP) → 1 天命点(DP)</div>
    <div class="fc-balance">
      <span class="sb">🍀 <b>${lp}</b> LP</span>
      <span class="sb">👑 <b>${dp}</b> DP</span>
    </div>
    <div class="fc-preview">本次可凝结：<b>+${can} DP</b>（凝结后剩余 ${lp - can * 10} LP）</div>
    <button class="fc-btn${enough ? '' : ' disabled'}" ${enough ? '' : 'disabled'} onclick="condenseFate()">凝结（${can} LP → ${can} DP）</button>
    <div class="fc-note">化命台将幸运点凝结为天命点，此过程<b>不可逆</b>。请谨慎操作。</div>
  </div>`;
}
async function condenseFate() {
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

/* ---------- 每日秘境（每日副本，通关削减心魔 HP） ---------- */
const DAILY_DUNGEONS = [
  { id: 'morning', name: '🌅 晨间仪式', desc: '早起 + 整理床铺' },
  { id: 'exercise', name: '🏃 运动打卡', desc: '运动 ≥ 30 分钟' },
  { id: 'read', name: '📚 读书', desc: '静心阅读 ≥ 30 分钟' },
  { id: 'finance', name: '💰 记账', desc: '记录今日收支' },
  { id: 'cook', name: '🍳 烟火', desc: '亲自做一顿饭' },
  { id: 'diary', name: '📝 日记', desc: '写今日日记' },
];
function todayKey() { return new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-'); }
function dungeonFlag(id) { return 'game_dungeon_' + todayKey() + '_' + id; }
function dungeonDone(id) { try { return localStorage.getItem(dungeonFlag(id)) === '1'; } catch (e) { return false; } }
function xinmoHpFromDungeons() { const done = DAILY_DUNGEONS.filter(d => dungeonDone(d.id)).length; return Math.max(0, 100 - Math.round(done / DAILY_DUNGEONS.length * 100)); }
function renderDungeon() {
  const done = DAILY_DUNGEONS.filter(d => dungeonDone(d.id)).length;
  const total = DAILY_DUNGEONS.length;
  const hp = xinmoHpFromDungeons();
  const all = done === total;
  const cards = DAILY_DUNGEONS.map(d => {
    const ok = dungeonDone(d.id);
    return `<div class="card dungeon-card${ok ? ' cleared' : ''}">
      <div class="dc-head"><span class="dc-icon">${ok ? '✅' : '⚔️'}</span><div><div class="tag">${ok ? '已通关' : '副本'}</div><h3>${esc(d.name)}</h3></div></div>
      <div class="meta">${esc(d.desc)}</div>
      ${ok ? '<div class="meta">🎉 已通关</div>' : '<button class="btn primary" onclick="clearDungeon(\'' + d.id + '\')">通关</button>'}
    </div>`;
  }).join('');
  return `<div class="section-title">🗺️ 每日秘境 · ${done}/${total}</div>
  <div class="demon-avatars-title">心魔·拖延 HP（每通关一个副本削减 ${Math.round(100 / total)}）</div>
  <div class="bar" style="height:14px"><i style="width:${hp}%;${hp <= 0 ? 'background:#6fcf97' : ''}"></i></div>
  <div class="meta" style="margin:6px 0 14px">当前 HP ${hp}/100${hp <= 0 ? ' · 🎉 心魔已被击破！' : ''}</div>
  <div class="cards">${cards}</div>
  <div class="meta" style="margin-top:12px">完成全部 ${total} 个副本即击破心魔，获得 📜 契约点 +1（每日限一次，走 /api/reward 持久化）。</div>`;
}
async function clearDungeon(id) {
  try { localStorage.setItem(dungeonFlag(id), '1'); } catch (e) {}
  const xm = (demons() || []).find(d => d.key === 'xinmo');
  if (xm) xm.hp = xinmoHpFromDungeons();
  const done = DAILY_DUNGEONS.filter(d => dungeonDone(d.id)).length;
  if (done === DAILY_DUNGEONS.length) {
    const f = 'game_defeated_' + todayKey();
    if (!localStorage.getItem(f)) {
      localStorage.setItem(f, '1');
      try {
        const j = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contract: 1, source: '心魔击败', text: '每日秘境全通关' }) });
        const r = await j.json();
        if (r.ok && r.player) { DATA.player.contract = r.player.contract; renderResbar(); }
        toast('🎉 心魔已被击破！契约点 +1', 'good');
      } catch (e) { toast('击破记录失败：' + e.message, 'warn'); }
    } else { toast('心魔已击破（今日已领取）', 'good'); }
  } else {
    toast('副本通关，心魔 HP -' + Math.round(100 / DAILY_DUNGEONS.length), 'good');
  }
  renderMain('dungeon');
}

function renderCook() {
  const recipes = food().recipes || [];
  if (!recipes.length) return renderPlaceholder('烹饪', '暂无菜谱数据。');
  const cards = recipes.map(r => {
    const lv = num(r.level, 1), prof = num(r.proficiency, 0);
    const q = QUA[r.quality] || QUA[1];
    const pct = Math.max(0, Math.min(100, Math.round(prof / 10 * 100)));
    return `<div class="card cook-card"><span class="tag">${q.label} ${stars(r.quality)}</span>
      <h3>${esc(r.name)}</h3>
      <div class="meta">Lv.${lv} · 熟练度 ${prof}/10${r.activated ? '' : ' · 未激活'}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <button class="btn primary sm" onclick="cookDish(${r.id})">🍳 做一道</button>
    </div>`;
  }).join('');
  return `<div class="mod-toolbar"><div class="section-title">🍳 烹饪 · 菜谱 ${recipes.length} 道</div>
    <button class="btn primary" onclick="openCookModal()">🍳 记录做菜</button></div>
    <div class="cards">${cards}</div>`;
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

/* ---------- 背包仓库交互（接 /api/inventory） ---------- */
let bagView = 'bag';     // 'bag' | 'warehouse'
let bagSub = 'all';      // 'all' | 'fridge'（仅 warehouse 下）
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
  html += '<div class="bag-tabs">' + tabs.map(t => '<div class="bag-tab' + (bagView===t[0]?' active':'') + '" onclick="bagView=\'' + t[0] + '\';renderBag()">' + t[1] + '</div>').join('') + '</div>';
  if (bagView === 'warehouse') {
    const subs = [['all','🗃️ 全部仓库'],['fridge','🧊 冰箱区']];
    html += '<div class="bag-subs">' + subs.map(s => '<div class="bag-sub' + (bagSub===s[0]?' active':'') + '" onclick="bagSub=\'' + s[0] + '\';renderBag()">' + s[1] + '</div>').join('') + '</div>';
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
  const wp = num(player().willpower, 0);
  const groupsHtml = SKILL_GROUPS.map(g => {
    const cards = Object.keys(SKILL_DEFS).filter(k => SKILL_DEFS[k].group === g.key).map(k => {
      const lv = Number(sk[k]) || 0;
      const maxed = lv >= SKILL_MAX;
      const cost = skillCost(lv);
      const can = !maxed && wp >= cost;
      const pct = Math.round(lv / SKILL_MAX * 100);
      return `<div class="card skill-card">
        <span class="tag">${esc(g.label)}</span>
        <h3>${esc(k)}</h3>
        <div class="meta">Lv.${lv} / ${SKILL_MAX}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="skill-desc">${esc(SKILL_DEFS[k].desc)}</div>
        <button class="btn primary sm skill-cult-btn" ${can ? '' : 'disabled'} onclick="cultivateSkill('${k}')">${maxed ? '已满级' : ('修炼（耗 ' + cost + ' 愿力）')}</button>
      </div>`;
    }).join('');
    return `<div class="skill-group-title">${esc(g.label)}</div><div class="cards">${cards}</div>`;
  }).join('');
  return `<div class="section-title">⚔️ 技能修炼台 <span class="game-tag">消耗愿力点升级</span></div>
    <div class="skill-total">总技能等级 <b>${total}</b> / ${Object.keys(SKILL_DEFS).length * SKILL_MAX}　·　愿力 <b>${wp}</b></div>
    ${groupsHtml}
    <div class="meta" style="margin-top:12px">修炼消耗愿力点（真实生活攒来的经验货币）。满级 Lv.${SKILL_MAX}；Lv0-3 耗20 / 4-6 耗40 / 7-9 耗60。</div>`;
}
async function cultivateSkill(name) {
  const p = player();
  const wp = num(p.willpower, 0);
  const skills = Object.assign({}, p.skills || {});
  const lv = Number(skills[name]) || 0;
  if (lv >= SKILL_MAX) { toast(name + ' 已满级', ''); return; }
  const cost = skillCost(lv);
  if (wp < cost) { toast('愿力点不足，需 ' + cost + ' 点', 'warn'); return; }
  try {
    const j = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: -cost, source: '技能修炼', text: name }) });
    const r = await j.json();
    if (!r.ok) { toast('修炼失败：' + (r.error || ''), 'warn'); return; }
    skills[name] = lv + 1;
    const newP = r.player || {};
    const j2 = await (await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { skills: JSON.stringify(skills), willpower: newP.willpower, starwish: newP.starwish, contract: newP.contract, level: newP.level } }) })).json();
    if (j2.ok && j2.player) DATA.player = j2.player;
    else { DATA.player.skills = skills; if (newP.willpower != null) DATA.player.willpower = newP.willpower; }
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
  const rm = player().realms || {};
  const totalLayer = realmTotalLayers(), maxLayer = realmMaxTotal();
  const doneCount = DAILY_DUNGEONS.filter(d => dungeonDone(d.id)).length;
  const cards = Object.keys(REALM_DEFS).map(k => {
    const def = REALM_DEFS[k];
    const layer = realmLayer(k);
    const maxed = layer >= def.maxLayer;
    const unlocked = realmUnlocked(def);
    const cls = 'card realm-card' + (maxed ? ' maxed' : '') + (unlocked ? '' : ' locked');
    const stage = def.layers[Math.min(layer, def.layers.length - 1)];
    const seg = unlocked ? '' : '<div class="realm-lock">🔒 需完成 ' + def.minDungeons + ' 个每日秘境</div>';
    return `<div class="${cls}">
      ${seg}
      <div class="dc-head"><div><span class="tag">${esc(def.group)}</span><h3>${esc(k)}</h3></div></div>
      <div class="meta">${maxed ? '已圆满' : ('第' + layer + '/' + def.maxLayer + '层')} · ${esc(stage)}</div>
      <div class="meta">${esc(def.effect)}</div>
      ${unlocked ? '<button class="btn primary sm realm-cult-btn" ' + (maxed ? 'disabled' : '') + ' onclick="openRealm(\'' + k + '\')">' + (maxed ? '此境界已圆满' : '参悟一层') + '</button>' : ''}
    </div>`;
  }).join('');
  return `<div class="section-title">🌟 境界参悟 <span class="game-tag">点击参悟</span></div>
    <div class="realm-total">总参悟层数 <b>${totalLayer}</b> / ${maxLayer}　·　今日已通秘境 <b>${doneCount}/${DAILY_DUNGEONS.length}</b></div>
    <div class="cards">${cards}</div>
    <div class="meta" style="margin-top:12px">点击境界卡参悟一层，消耗愿力点；满层显示「此境界已圆满」。高阶境界需先完成一定数量的每日秘境（炼体法/万卷书联动见卡片效果）。</div>`;
}
function openRealm(key) {
  const def = REALM_DEFS[key];
  if (!def) return;
  const layer = realmLayer(key);
  const maxed = layer >= def.maxLayer;
  const unlocked = realmUnlocked(def);
  const cost = realmCost(def, layer);
  const layerList = def.layers.map((nm, i) => {
    const done = i < layer;
    const cur = (i === layer) && !maxed;
    const cls = (done || cur) ? ' cur' : ' locked-layer';
    const mark = done ? '✓' : (cur ? '◀ 当前' : '未达');
    return '<div class="realm-detail-layer' + cls + '"><span>' + (i + 1) + '. ' + esc(nm) + '</span><span>' + mark + '</span></div>';
  }).join('');
  let foot;
  if (!unlocked) foot = '<button class="realm-cult-btn" disabled style="opacity:.6">🔒 需先完成 ' + def.minDungeons + ' 个每日秘境</button>';
  else if (maxed) foot = '<button class="realm-cult-btn" disabled>此境界已圆满</button>';
  else foot = '<button class="realm-cult-btn" onclick="cultivateRealm(\'' + key + '\')">参悟一层（耗 ' + cost + ' 愿力）</button>';
  const box = document.createElement('div');
  box.className = 'realm-modal';
  box.innerHTML = '<div class="realm-modal-box"><h3>🌟 ' + esc(key) + '</h3>' +
    '<p>' + esc(def.story) + '</p>' +
    '<div class="realm-card-effect" style="margin-bottom:8px"><b>境界效果：</b>' + esc(def.effect) + '</div>' +
    '<div style="font-size:13px;font-weight:600;margin:6px 0 4px">参悟阶段（' + layer + '/' + def.maxLayer + '）</div>' +
    layerList + foot +
    '<button class="btn" style="margin-top:8px;background:var(--bg);color:var(--text-secondary)" onclick="closeRealm()">关闭</button></div>';
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  document.body.appendChild(box);
}
function closeRealm() { document.querySelectorAll('.realm-modal').forEach(m => m.remove()); }
async function cultivateRealm(key) {
  const def = REALM_DEFS[key];
  if (!def) return;
  if (!realmUnlocked(def)) { toast('该境界尚未解锁', 'warn'); return; }
  const p = player();
  const wp = num(p.willpower, 0);
  const layer = realmLayer(key);
  if (layer >= def.maxLayer) { toast(key + ' 已圆满', ''); return; }
  const cost = realmCost(def, layer);
  if (wp < cost) { toast('愿力点不足，需 ' + cost + ' 点', 'warn'); return; }
  const realms = Object.assign({}, p.realms || {});
  const newLayer = layer + 1;
  realms[key] = newLayer;
  try {
    const j = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: -cost, source: '境界参悟', text: key }) });
    const r = await j.json();
    if (!r.ok) { toast('参悟失败：' + (r.error || ''), 'warn'); return; }
    const newP = r.player || {};
    const j2 = await (await fetch('/api/player-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { realms: JSON.stringify(realms), willpower: newP.willpower, starwish: newP.starwish, contract: newP.contract, level: newP.level } }) })).json();
    if (j2.ok && j2.player) DATA.player = j2.player;
    else { DATA.player.realms = realms; if (newP.willpower != null) DATA.player.willpower = newP.willpower; }
    closeRealm(); renderResbar(); renderMain('realm');
    if (newLayer >= def.maxLayer) toast('🏆 ' + key + ' 已圆满！', 'good');
    else toast('🎉 ' + key + ' 参悟至第 ' + newLayer + ' 层', 'good');
      } catch (e) { toast('参悟失败：' + e.message, 'warn'); }
    }

    /* ---------- 江湖 NPC（二期 v9.0，移植主站逻辑，接 /api/insert/update/delete + /api/reward） ---------- */
    let npcSearch = '';
    let npcFilter = 'all';
    const NPC_TYPES = ['家人', '同窗', '挚友', '助手', '其他'];
    function npcsArr() { return (DATA && DATA.npcs) || []; }
    function getNpcMeta(n) { return (n && n.meta && typeof n.meta === 'object') ? n.meta : {}; }
    function todayCST() { return new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }); }
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
        const lastTs = Number(meta.lastVisitTs) || 0;
        const cooling = lastTs && (Date.now() - lastTs) < 24 * 3600 * 1000;
        return '<div class="npc-card" onclick="openNpcDetail(' + n.id + ')">' +
          '<div class="npc-head"><div class="npc-avatar">' + esc((n.name || '?').slice(0, 1)) + '</div>' +
          '<div class="npc-id"><div class="npc-name">' + esc(n.name || '') + '</div><div class="npc-sub">' + esc(n.type || '') + ' · ' + esc(n.region || '') + '</div></div>' +
          '<span class="npc-status ' + stCls + '">' + esc(st) + '</span></div>' +
          '<div class="npc-desc">' + esc(n.desc || '') + '</div>' +
          '<div class="npc-aff">好感度 <span class="npc-aff-bar"><span style="width:' + Math.min(100, aff) + '%"></span></span> <b>' + aff + '</b></div>' +
          '<div class="npc-actions"><button class="npc-visit" ' + (cooling ? 'disabled' : '') + ' onclick="event.stopPropagation();visitNpc(' + n.id + ')">' + (cooling ? '⏳ 奇遇冷却中' : '拜访（奇遇）') + '</button>' +
          '<button class="npc-del" onclick="event.stopPropagation();delNpc(' + n.id + ')">删除</button></div></div>';
      }).join('');
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
        '<div class="section-title" style="margin-top:18px">＋ 新增 NPC</div>' +
        '<div class="npc-form">' +
          '<input class="input" id="npcName" placeholder="名字（必填）">' +
          '<select class="input" id="npcType"><option value="家人">家人</option><option value="同窗">同窗</option><option value="挚友">挚友</option><option value="助手">助手</option><option value="其他">其他</option></select>' +
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
      const log = meta.visitLog || [];
      const logHtml = log.length ? log.map(l => '<div class="log-row"><span class="log-ts">' + esc(l.date || '') + '</span><span class="log-item">' + esc(l.note || '') + '</span></div>').join('')
        : '<div class="game-empty">尚无奇遇记录</div>';
      const box = document.createElement('div');
      box.className = 'realm-modal';
      box.innerHTML = '<div class="realm-modal-box npc-detail">' +
        '<h3>🧝 ' + esc(n.name || '') + '</h3>' +
        '<div class="npc-detail-meta">' + esc(n.type || '其他') + ' · ' + esc(n.region || '未知州') + ' · 状态 <b>' + esc(n.status || '未遇') + '</b></div>' +
        '<div class="npc-detail-desc">' + esc(n.desc || '（无简介）') + '</div>' +
        '<div class="npc-aff">好感度 <span class="npc-aff-bar"><span style="width:' + Math.min(100, aff) + '%"></span></span> <b>' + aff + '</b></div>' +
        '<div style="font-size:13px;font-weight:600;margin:10px 0 4px">奇遇记录</div>' +
        '<div style="max-height:40vh;overflow:auto">' + logHtml + '</div>' +
        '<button class="realm-cult-btn" style="margin-top:10px;background:var(--panel2);color:var(--text)" onclick="closeRealm()">关闭</button></div>';
      box.onclick = (e) => { if (e.target === box) box.remove(); };
      document.body.appendChild(box);
    }
    async function visitNpc(id) {
      const n = npcsArr().find(x => x.id === id); if (!n) return;
      const meta = getNpcMeta(n);
      const lastTs = Number(meta.lastVisitTs) || 0;
      if (lastTs && (Date.now() - lastTs) < 24 * 3600 * 1000) { toast('奇遇冷却中（24h），明日再来', 'warn'); return; }
      const next = n.status === '未遇' ? '已遇' : (n.status === '已遇' ? '熟识' : (n.status || '熟识'));
      const aff = (Number(meta.affinity) || 0) + 5;
      const log = (meta.visitLog || []); log.unshift({ date: todayCST(), note: '拜访奇遇 · 状态→' + next });
      const newMeta = Object.assign({}, meta, { affinity: aff, lastVisit: todayCST(), lastVisitTs: Date.now(), visitLog: log.slice(0, 30) });
      try {
        const j = await fetch('/api/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ willpower: 3, source: 'NPC奇遇', text: n.name }) });
        const r = await j.json();
        const newP = r.player || {};
        const j2 = await (await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'npcs', id: id, fields: { status: next, meta: JSON.stringify(newMeta) } }) })).json();
        if (r.ok && newP.willpower != null) { DATA.player.willpower = newP.willpower; renderResbar(); }
        if (j2.ok) toast('🤝 拜访 ' + n.name + '：奇遇 +3 愿力，好感度 ' + aff, 'good');
        else toast('拜访记录失败：' + (j2.error || ''), 'warn');
        await loadData(); go('npc'); openNpcDetail(id);
      } catch (e) { toast('奇遇失败：' + e.message, 'warn'); }
    }
    function addNpc() {
      const gv = id => (document.getElementById(id) || {}).value || '';
      const name = gv('npcName');
      if (!name.trim()) { toast('名字必填', 'warn'); return; }
      const fields = {
        name: name.trim(),
        type: gv('npcType') || '其他',
        region: gv('npcRegion') || '',
        x: Number(gv('npcX')) || 0,
        y: Number(gv('npcY')) || 0,
        desc: gv('npcDesc') || '',
        status: '未遇',
        meta: '{}',
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
        if (rg.r === '魔渊') return '<div class="map-region danger" onclick="go(\'demon\')"><div class="map-region-name">🔴 ' + rg.n + '</div><div class="map-region-sub">野外首领 · 点击前往魔障</div></div>';
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
            '<text x="' + cx + '" y="' + (cy + 32) + '" text-anchor="middle" font-size="12" fill="#A32D2D">魅魔</text></g>';
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
        '<details class="map-legend-box"><summary>图例</summary><div class="map-legend"><span>■ 界碑（传送）</span><span>● NPC（点击唤访）</span><span>🔴 魅魔（野首·点击前往）</span><span>🛡 镇守</span></div></details>';
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
      const contract = num(p.contract, 0);
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
            '<div class="game-xp-label" title="愿力经验 = 当前愿力点对 1000 取模；满 1000 自动凝结升阶">愿力经验 <b>' + willpower.toFixed(1) + '</b> / 1000（距升级还差 ' + xpRemain.toFixed(1) + '）</div>' +
            '<div class="game-bar big"><span style="width:' + xpPct + '%"></span></div>' +
            '<div class="game-stats">' +
              '<div class="game-stat" title="契约点：心魔被击破等里程碑奖励，永久累积"><div class="game-stat-num">' + contract + '</div><div class="game-stat-lbl">📜 契约点</div></div>' +
              '<div class="game-stat" title="等级：愿力经验凝结升阶所得"><div class="game-stat-num">' + level + '</div><div class="game-stat-lbl">🏅 等级</div></div>' +
              '<div class="game-stat" title="总技能等级：七艺修炼之和，上限 70"><div class="game-stat-num">' + skillTotalLevel() + '</div><div class="game-stat-lbl">🛠️ 技能</div></div>' +
              '<div class="game-stat" title="总参悟层数：五境累计，上限 45"><div class="game-stat-num">' + realmTotalLayers() + '</div><div class="game-stat-lbl">🗺️ 境界</div></div>' +
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
          renderMain('succubus');
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
