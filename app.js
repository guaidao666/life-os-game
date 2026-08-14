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
      <div class="meta">仓库 ${wh}/${getWhCap()} 格</div></div>
    <div class="card"><span class="tag">🔮 命愿祈铺</span><h3>LP ${num(p.lucky, 0)} → DP ${num(p.destiny, 0)}</h3>
      <div class="meta">凝结比例 10 LP = 1 DP</div></div>
  </div>`;
  return hero + `<div class="section-title">📊 修行概览</div>` + cards;
}

function demonDanger(d) {
  if (d.key === 'meimo') { const sed = Number((DATA.succubus || {}).seductions) || 0; return Math.max(0, Math.min(1, sed / 3)); }
  const mx = d.key === 'xinmo' ? 100 : (Number(d.max_hp) || 1); return mx > 0 ? Math.max(0, Math.min(1, (Number(d.hp) || 0) / mx)) : 0;
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
