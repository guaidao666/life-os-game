// 拾光·人生修行 独立后端（自包含，零依赖人生管理系统）
// 职责：
//   1) 直连本目录 game.db（独立数据库，与 life-os/life.db 完全解耦）
//   2) 提供拾光前端需要的全部 /api/* 接口（含 Obsidian 日记同步）
// 启动方式：被 life-os-game/server.mjs import 复用（本文件不自行监听端口）
// 数据约定：愿力(willpower) 在库中以「真实值×100」(cents) 存整数，消除浮点漂移；
//          唯一向上凝结渠道为化命台(player-set)，惩罚/扣费走 /api/deduct 可逆降级。

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'game.db');
// Obsidian vault 路径（日记从 Obsidian 同步，不写个人信息进仓库）：
// 优先读本地 .vaultpath（已 gitignore），其次环境变量 OBSIDIAN_VAULT，最后通用占位。
const VAULT = (() => {
  try { const p = readFileSync(path.join(__dirname, '.vaultpath'), 'utf8').trim(); if (p) return p; } catch {}
  if (process.env.OBSIDIAN_VAULT) return process.env.OBSIDIAN_VAULT;
  return 'D:/obsidian_wks/凯的知识库';
})();

// ---- 公网暴露时鉴权（仅非 localhost 来源需要；手机经内网/花生壳访问时由 server.mjs 改写 host 免鉴权）----
let API_TOKEN = '';
try { API_TOKEN = readFileSync(path.join(__dirname, '.lifetoken'), 'utf8').trim(); } catch (e) {}
if (!API_TOKEN) {
  API_TOKEN = 'lfs_' + randomUUID().replace(/-/g, '') + Date.now().toString(36);
  try { writeFileSync(path.join(__dirname, '.lifetoken'), API_TOKEN); } catch (e) {}
}
const isLocal = (req) => {
  const h = String(req.headers.host || '').toLowerCase();
  return h.includes('localhost') || h.includes('127.0.0.1') || h.includes('::1');
};
const needAuth = (req, res) => {
  if (isLocal(req)) return false;
  const t = new URL(req.url, 'http://x').searchParams.get('token');
  if (t === API_TOKEN) return false;
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'token required' }));
  return true;
};

const defaultTheme = {
  colors: { purple: '#af52de', cyan: '#5ac8fa', indigo: '#5856d6', blue: '#0071e3', green: '#34c759', orange: '#ff9500', pink: '#ff375f' },
  dark: false
};

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY, willpower REAL DEFAULT 0, starwish REAL DEFAULT 0,
    contract INTEGER DEFAULT 0, level INTEGER DEFAULT 1, skills TEXT, realms TEXT
  );
  CREATE TABLE IF NOT EXISTS game_todos (id TEXT PRIMARY KEY, text TEXT, priority TEXT, done INTEGER DEFAULT 0, ord INTEGER DEFAULT 0, day TEXT, ts INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY, name TEXT, category TEXT, cost TEXT, steps TEXT, source TEXT);
  CREATE TABLE IF NOT EXISTS cook_posts (id INTEGER PRIMARY KEY, date TEXT, dish TEXT, feeling TEXT, rating INTEGER DEFAULT 0, recipe_id INTEGER, images TEXT);
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY, date TEXT, meal TEXT, type TEXT, recipe_id INTEGER,
    name TEXT, cal INTEGER DEFAULT 0, images TEXT, feeling TEXT, rating INTEGER DEFAULT 0, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS player_stats_meta (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS taskboard (id INTEGER PRIMARY KEY, grp TEXT, text TEXT, depth INTEGER DEFAULT 0, done INTEGER DEFAULT 0, points INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS diary (id INTEGER PRIMARY KEY, date TEXT, title TEXT, content TEXT, mood TEXT, aside TEXT, created_at TEXT);
  CREATE TABLE IF NOT EXISTS weight (id INTEGER PRIMARY KEY, date TEXT, weight REAL, note TEXT, created_at TEXT);
  CREATE TABLE IF NOT EXISTS reward_log (
    id INTEGER PRIMARY KEY, ts TEXT, source TEXT, text TEXT,
    dw REAL DEFAULT 0, dsw REAL DEFAULT 0, bw REAL DEFAULT 0, bsw REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY, name TEXT, desc TEXT, type TEXT, region TEXT,
    x REAL DEFAULT 0, y REAL DEFAULT 0, linked_id TEXT, status TEXT DEFAULT '未遇', created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY, zone TEXT DEFAULT '愿力', section TEXT DEFAULT 'regular',
    name TEXT, currency TEXT DEFAULT 'wp', price REAL DEFAULT 0, category TEXT DEFAULT '材料',
    desc TEXT DEFAULT '', icon_color TEXT DEFAULT '', stock REAL DEFAULT NULL,
    limit_cycle REAL DEFAULT NULL, is_limited INTEGER DEFAULT 0, expires_at TEXT DEFAULT NULL,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS shop_log (
    id INTEGER PRIMARY KEY, ts TEXT, currency TEXT, amount REAL DEFAULT 0,
    item_id INTEGER, item_name TEXT, zone TEXT, section TEXT
  );
  CREATE TABLE IF NOT EXISTS demons (
    id INTEGER PRIMARY KEY, key TEXT UNIQUE, name TEXT, kind TEXT,
    hp REAL DEFAULT 0, max_hp REAL DEFAULT 0, cycle TEXT DEFAULT '',
    threat REAL DEFAULT 1, consume TEXT DEFAULT '{}', extra TEXT DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS econ_plan (
    day INTEGER NOT NULL,
    task_idx INTEGER NOT NULL,
    checked INTEGER DEFAULT 0,
    updated_at TEXT,
    PRIMARY KEY (day, task_idx)
  );
  CREATE TABLE IF NOT EXISTS econ_quiz (
    qid TEXT NOT NULL,
    correct INTEGER DEFAULT 0,
    ts TEXT,
    PRIMARY KEY (qid)
  );
`);
// 迁移：taskboard 增加 done_at / ord（日/周自动刷新 + 组内排序）
try { db.exec('ALTER TABLE taskboard ADD COLUMN done_at TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE taskboard ADD COLUMN ord INTEGER DEFAULT 0'); } catch (e) {}
// 迁移：recipes 扩展字段（烹饪进阶：熟练度/等级/品质/稀有度/古风释文/时间/难度/食材/标签/封面）
try { db.exec('ALTER TABLE recipes ADD COLUMN time INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN difficulty INTEGER DEFAULT 2'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN ingredients TEXT DEFAULT \'[]\''); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN tags TEXT DEFAULT \'[]\''); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN image TEXT DEFAULT \'\''); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN obtained INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN activated INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN proficiency INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN level INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN quality INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE recipes ADD COLUMN rarity INTEGER DEFAULT 3'); } catch (e) {}
try { db.exec("ALTER TABLE recipes ADD COLUMN flavor TEXT DEFAULT ''"); } catch (e) {}
// 迁移：meals 增加 gains（撤销精确回退）
try { db.exec("ALTER TABLE meals ADD COLUMN gains TEXT DEFAULT '{\"wp\":0,\"lp\":0,\"dp\":0,\"activated\":false}'"); } catch (e) {}
// 迁移：diary 增加 aside
try { db.exec('ALTER TABLE diary ADD COLUMN aside TEXT'); } catch (e) {}
// 迁移：player_stats 增加 succubus / lucky / destiny / inventory
try { db.exec('ALTER TABLE player_stats ADD COLUMN succubus TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE player_stats ADD COLUMN lucky REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE player_stats ADD COLUMN destiny REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE player_stats ADD COLUMN inventory TEXT'); } catch (e) {}
// 迁移：npcs 增加 meta（好感度/奇遇等扩展态）
try { db.exec('ALTER TABLE npcs ADD COLUMN meta TEXT'); } catch (e) {}
// 迁移：新增 localstore（浏览器 localStorage 服务端镜像表：key 唯一，value JSON 文本，ts 毫秒时间戳）
try {
  db.exec(`CREATE TABLE IF NOT EXISTS localstore (
    key TEXT PRIMARY KEY, value TEXT, ts INTEGER DEFAULT 0
  )`);
} catch (e) {}
// 魔障种子（仅当空，幂等；后续加魔只 insert，前端零改动）
try {
  const dc = db.prepare('SELECT COUNT(*) AS c FROM demons').get();
  if (dc && dc.c === 0) {
    db.prepare("INSERT INTO demons (key,name,kind,hp,max_hp,cycle,threat,consume,extra) VALUES (?,?,?,?,?,?,?,?,?)")
      .run('xinmo', '心魔·拖延', '心魔', 100, 100, 'daily', 1.0, '{}', '{}');
    db.prepare("INSERT INTO demons (key,name,kind,hp,max_hp,cycle,threat,consume,extra) VALUES (?,?,?,?,?,?,?,?,?)")
      .run('meimo', '魅魔·遭遇与抵抗', '魅魔', 0, 100, 'weekly', 1.0, '{"resist2Lp":1}', '{}');
  }
} catch (e) {}
// 迁移：旧 starwish 折算（幂等：折算后 starwish=0，不会重复）
try {
  const sc = db.prepare('SELECT starwish FROM player_stats WHERE id=1').get();
  if (sc && Number(sc.starwish) > 0) {
    db.prepare('UPDATE player_stats SET destiny = destiny + ?, starwish = 0, lucky = 0 WHERE id=1').run(Number(sc.starwish));
  }
} catch (e) {}

const getSetting = (k, d) => {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(k);
  return row ? row.value : d;
};

// 初始化玩家数值（首行 id=1，仅插入一次）
function ensurePlayer() {
  const row = db.prepare('SELECT id FROM player_stats WHERE id=1').get();
  if (!row) {
    const defaultSkills = { "陶笛":0, "围棋":1, "PS":1, "Python":1, "画画":0, "广联达":0, "Office":2 };
    const defaultRealms = {
      "炼体法":"八段锦 — 散炼境", "万卷书":"甲百卷（141/200）", "万里路":"甲十级（11/20）",
      "功德法":"渡人境", "千面法":"理智面 · 感性思维"
    };
    db.prepare('INSERT INTO player_stats (id, willpower, starwish, contract, level, skills, realms) VALUES (?,?,?,?,?,?,?)')
      .run(1, wpToStored(952.5), 7, 3, 7, JSON.stringify(defaultSkills), JSON.stringify(defaultRealms));
  }
}
ensurePlayer();

function safeParse(v, d) {
  try { return JSON.parse(v); } catch { return d; }
}
// 愿力整数化：DB 以「真实值×100」存整数；内部按真实单位(浮点)运算，LP/DP 兑换比例(1LP=100WP)不变
const wpToStored = (v) => Math.round((Number(v) || 0) * 100);
const wpFromStored = (v) => (Number(v) || 0) / 100;

function num(v) {
  if (v === undefined || v === null) return 0;
  const s = String(v).replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function readData() {
  const meals = db.prepare('SELECT id,date,meal,type,recipe_id,name,cal,images,feeling,rating,gains FROM meals ORDER BY date DESC, id DESC').all()
    .map(r => ({ id: r.id, date: r.date, meal: r.meal || '', type: r.type || 'cook', recipeId: r.recipe_id, name: r.name || '', cal: r.cal || 0, images: r.images ? safeParse(r.images, []) : [], feeling: r.feeling || '', rating: r.rating || 0, gains: r.gains ? safeParse(r.gains, {}) : {} }));
  const recipes = db.prepare('SELECT id,name,category,cost,steps,source,time,difficulty,ingredients,tags,image,obtained,activated,proficiency,level,quality,rarity,flavor FROM recipes').all()
    .map(r => ({ id: r.id, name: r.name, category: r.category, cost: r.cost, steps: r.steps, source: r.source, time: r.time || 0, difficulty: r.difficulty || 2, ingredients: r.ingredients ? safeParse(r.ingredients, []) : [], tags: r.tags ? safeParse(r.tags, []) : [], image: r.image || '', obtained: r.obtained == null ? 1 : r.obtained, activated: !!r.activated, proficiency: r.proficiency || 0, level: r.level || 1, quality: r.quality || 1, rarity: r.rarity || 3, flavor: r.flavor || '' }));

  const taskboard = db.prepare('SELECT id,grp,text,depth,done,points,done_at,ord FROM taskboard ORDER BY grp, ord, id').all()
    .map(r => ({ id: r.id, grp: r.grp, text: r.text, depth: r.depth, done: !!r.done, points: r.points, done_at: r.done_at || '', ord: r.ord || 0 }));

  // 日记摘要（正文按需加载，避免 /api/data 携带全部 200 篇全文拖慢手机）
  const diary = db.prepare('SELECT id,date,title,mood,aside,created_at,content FROM diary ORDER BY date DESC, id DESC').all()
    .map(r => ({ id: r.id, date: r.date || '', title: r.title || '', mood: r.mood || '', aside: r.aside || '', created_at: r.created_at || '', summary: (r.content || '').replace(/\s+/g, ' ').trim().slice(0, 80) }));

  const rewardLog = db.prepare('SELECT id,ts,source,text,dw,dsw,bw,bsw FROM reward_log ORDER BY ts DESC, id DESC LIMIT 200').all()
    .map(r => ({ id: r.id, ts: r.ts || '', source: r.source || '', text: r.text || '', dw: wpFromStored(r.dw || 0), dsw: r.dsw || 0, bw: wpFromStored(r.bw || 0), bsw: r.bsw || 0 }));

  const weightRows = db.prepare('SELECT id,date,weight,note,created_at FROM weight ORDER BY date DESC, id DESC').all()
    .map(r => ({ id: r.id, date: r.date || '', weight: r.weight, note: r.note || '', created_at: r.created_at || '' }));

  const npcs = db.prepare('SELECT id,name,desc,type,region,x,y,linked_id,status,created_at,meta FROM npcs ORDER BY id').all()
    .map(r => ({ id: r.id, name: r.name || '', desc: r.desc || '', type: r.type || '', region: r.region || '', x: Number(r.x) || 0, y: Number(r.y) || 0, linkedId: r.linked_id || '', status: r.status || '未遇', createdAt: r.created_at || '', meta: safeParse(r.meta, {}) }));

  const pRow = db.prepare('SELECT willpower,starwish,contract,level,lucky,destiny,skills,realms,inventory FROM player_stats WHERE id=1').get();
  const player = pRow ? {
    willpower: wpFromStored(pRow.willpower), starwish: pRow.starwish, contract: pRow.contract, level: pRow.level,
    lucky: Number(pRow.lucky) || 0, destiny: Number(pRow.destiny) || 0,
    skills: safeParse(pRow.skills, {}), realms: safeParse(pRow.realms, {}),
    inventory: safeParse(pRow.inventory, [])
  } : { willpower: 0, starwish: 0, contract: 0, level: 1, lucky: 0, destiny: 0, skills: {}, realms: {} };

  const sucRow = db.prepare('SELECT succubus FROM player_stats WHERE id=1').get();
  const succubus = sucRow && sucRow.succubus ? safeParse(sucRow.succubus, {}) : {};

  const demons = db.prepare('SELECT id,key,name,kind,hp,max_hp,cycle,threat,consume,extra FROM demons ORDER BY id').all()
    .map(r => ({
      id: r.id, key: r.key, name: r.name || '', kind: r.kind || '',
      hp: Number(r.hp) || 0, maxHp: Number(r.max_hp) || 0, cycle: r.cycle || '',
      threat: Number(r.threat) || 1, consume: safeParse(r.consume, {}), extra: safeParse(r.extra, {})
    }));

  const shopItems = db.prepare('SELECT id,zone,section,name,currency,price,category,desc,icon_color,stock,limit_cycle,is_limited,expires_at,created_at FROM shop_items ORDER BY id').all()
    .map(r => ({
      id: r.id, zone: r.zone || '愿力', section: r.section || 'regular', name: r.name || '',
      currency: r.currency || 'wp', price: Number(r.price) || 0, category: r.category || '材料',
      desc: r.desc || '', iconColor: r.icon_color || '',
      stock: (r.stock == null ? null : Number(r.stock)),
      limitCycle: (r.limit_cycle == null ? null : Number(r.limit_cycle)),
      isLimited: !!r.is_limited, expiresAt: r.expires_at || '', createdAt: r.created_at || ''
    }));
  const shopLog = db.prepare('SELECT id,ts,currency,amount,item_id,item_name,zone,section FROM shop_log ORDER BY ts DESC, id DESC LIMIT 100').all()
    .map(r => ({ id: r.id, ts: r.ts || '', currency: r.currency || '', amount: Number(r.amount) || 0, itemId: r.item_id, itemName: r.item_name || '', zone: r.zone || '', section: r.section || '' }));

  let theme = defaultTheme;
  try { theme = JSON.parse(getSetting('theme', JSON.stringify(defaultTheme))); } catch {}

  return {
    player,
    taskboard,
    diary,
    meals,
    rewardLog,
    weight: weightRows,
    npcs,
    succubus,
    demons,
    shopItems,
    shopLog,
    food: { meals, recipes },
    theme
  };
}

function writeData(obj) {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM recipes; DELETE FROM meals; DELETE FROM weight; DELETE FROM settings;');
    const insRecipe = db.prepare('INSERT INTO recipes (id,name,category,cost,steps,source,time,difficulty,ingredients,tags,image,obtained,activated,proficiency,level,quality,rarity,flavor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    (obj.food?.recipes || []).forEach(r => insRecipe.run(r.id, r.name, r.category, r.cost, r.steps, r.source, r.time || 0, r.difficulty || 2, JSON.stringify(r.ingredients || []), JSON.stringify(r.tags || []), r.image || '', (r.obtained === 0 || r.obtained === false) ? 0 : 1, r.activated ? 1 : 0, r.proficiency || 0, r.level || 1, r.quality || 1, r.rarity || 3, r.flavor || ''));
    const insMeal = db.prepare('INSERT INTO meals (id,date,meal,type,recipe_id,name,cal,images,feeling,rating) VALUES (?,?,?,?,?,?,?,?,?,?)');
    (obj.meals || obj.food?.meals || []).forEach(m => insMeal.run(m.id, m.date, m.meal || '', m.type || 'cook', m.recipeId || null, m.name || '', m.cal || 0, JSON.stringify(m.images || []), m.feeling || '', m.rating || 0));
    const insWeight = db.prepare('INSERT INTO weight (id,date,weight,note,created_at) VALUES (?,?,?,?,?)');
    (obj.weight || []).forEach(w => insWeight.run(w.id, w.date || '', w.weight, w.note || '', w.created_at || new Date().toISOString()));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ---- Obsidian 日记同步辅助 ----
function listMdRecursive(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMdRecursive(p));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push({ name: e.name, path: p });
  }
  return out;
}
function readMdSafe(p) { try { return readFileSync(p, 'utf8'); } catch { return ''; } }

function sendCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export async function apiHandler(req, res) {
  sendCORS(res);
  const url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (url.startsWith('/api/') && url !== '/api/health') {
    if (needAuth(req, res)) return;
  }

  if (req.method === 'GET' && url === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readData()));
    return;
  }

  // 日记单篇全文（按需加载，避免 /api/data 携带 200 篇正文拖慢手机）
  if (req.method === 'GET' && url === '/api/diary') {
    const q = new URL(req.url, 'http://x');
    const id = Number(q.searchParams.get('id'));
    if (!id) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: 'id 必填' })); return; }
    const r = db.prepare('SELECT id,date,title,content,mood,aside,created_at FROM diary WHERE id=?').get(id);
    if (!r) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: '未找到该日记' })); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, diary: { id: r.id, date: r.date || '', title: r.title || '', content: r.content || '', mood: r.mood || '', aside: r.aside || '', created_at: r.created_at || '' } }));
    return;
  }

  if (req.method === 'GET' && url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, t: Date.now() }));
    return;
  }

  // 前端 localStorage 服务端镜像：GET 返回全部 entries / POST 整表替换（last-write-wins 按 ts）
  if (url === '/api/localstore') {
    if (req.method === 'GET') {
      const rows = db.prepare('SELECT key,value,ts FROM localstore').all();
      const entries = {};
      for (const r of rows) entries[r.key] = { value: r.value, ts: r.ts || 0 };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, entries }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const entries = (data && typeof data.entries === 'object' && data.entries) ? data.entries : {};
          const now = Date.now();
          db.exec('BEGIN');
          try {
            // 整表替换：前端每次全量推送镜像，删除本地已移除的 key
            db.prepare('DELETE FROM localstore').run();
            const upsert = db.prepare('INSERT INTO localstore (key,value,ts) VALUES (?,?,?)');
            for (const [k, v] of Object.entries(entries)) {
              let val = v, ts = now;
              if (v && typeof v === 'object' && ('value' in v)) { val = v.value; ts = Number(v.ts) || now; }
              upsert.run(String(k), String(val == null ? '' : val), ts);
            }
            db.exec('COMMIT');
          } catch (e2) { try { db.exec('ROLLBACK'); } catch (e3) {} throw e2; }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, count: Object.keys(entries).length }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
        }
      });
      return;
    }
  }

  // 拾光「今日待办」专用同步接口：GET 返回全部 / POST 整表替换（前端按 ts 做 last-write-wins 合并）
  if (url === '/api/game-todos') {
    if (req.method === 'GET') {
      const rows = db.prepare('SELECT id,text,priority,done,ord,day,ts FROM game_todos').all()
        .map(r => ({ id: r.id, text: r.text, priority: r.priority, done: !!r.done, ord: r.ord != null ? r.ord : 0, day: r.day || '', ts: r.ts != null ? r.ts : 0 }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, items: rows }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const items = Array.isArray(data.items) ? data.items : [];
          db.exec('BEGIN');
          try {
            db.prepare('DELETE FROM game_todos').run();
            const ins = db.prepare('INSERT INTO game_todos(id,text,priority,done,ord,day,ts) VALUES(?,?,?,?,?,?,?)');
            for (const it of items) {
              ins.run(String(it.id), String(it.text || ''), String(it.priority || 'mid'), it.done ? 1 : 0, Number(it.ord) || 0, String(it.day || ''), Number(it.ts) || 0);
            }
            db.exec('COMMIT');
          } catch (e2) {
            try { db.exec('ROLLBACK'); } catch (e3) {}
            throw e2;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, count: items.length }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
        }
      });
      return;
    }
  }

  if (req.method === 'POST' && url === '/api/data') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        writeData(JSON.parse(body));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'bad json' }));
      }
    });
    return;
  }

  // 做菜记录 + 菜谱进阶 + 奖励 + 背包料理（与主站逻辑一致）
  if (req.method === 'POST' && url === '/api/cook') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const dish = String(p.dish || '').trim();
        if (!dish) throw new Error('dish(菜名) 不能为空');
        const id = Date.now();
        const date = String(p.date || new Date().toISOString().slice(0, 10));
        const rating = Math.max(0, Math.min(5, Number(p.rating) || 0));
        const feeling = String(p.feeling || '');
        const recipeId = p.recipeId ? Number(p.recipeId) : null;
        const images = Array.isArray(p.images) ? JSON.stringify(p.images) : '[]';
        const insertMeal = db.prepare('INSERT INTO meals (id,date,meal,type,recipe_id,name,cal,images,feeling,rating) VALUES (?,?,?,?,?,?,?,?,?,?)');
        const getRec = db.prepare('SELECT id,name,rarity,proficiency,activated,level,quality FROM recipes WHERE id=?');
        const updRec = db.prepare('UPDATE recipes SET proficiency=?, activated=1, level=?, quality=? WHERE id=?');
        const getInv = db.prepare('SELECT inventory FROM player_stats WHERE id=1');
        const setInv = db.prepare('UPDATE player_stats SET inventory=? WHERE id=1');
        const getP = db.prepare('SELECT willpower,lucky,destiny FROM player_stats WHERE id=1');
        const setP = db.prepare('UPDATE player_stats SET willpower=?,lucky=?,destiny=? WHERE id=1');
        const gains = { wp: 0, lp: 0, dp: 0, activated: false, leveledUp: false, newQuality: null, note: '' };
        db.exec('BEGIN');
        try {
          insertMeal.run(id, date, '晚餐', 'cook', recipeId, dish, 0, images, feeling, rating);
          if (recipeId) {
            const rec = getRec.get(recipeId);
            if (rec) {
              const before = rec.proficiency || 0;
              const beforeLv = rec.level || 1;
              const beforeQ = rec.quality || 1;
              const wasActivated = !!rec.activated;
              const after = before + 1;
              const afterLv = Math.floor(after / 10) + 1;
              const afterQ = Math.min(4, Math.floor((afterLv - 1) / 3) + 1);
              updRec.run(after, afterLv, afterQ, recipeId);
              let wp = 0, lp = 0, dp = 0;
              if (!wasActivated) { wp += 2; gains.activated = true; gains.note = '习得新菜'; }
              if (afterLv > beforeLv) { wp += 5; gains.leveledUp = true; gains.note = (gains.note ? gains.note + ' · ' : '') + '熟练度升至 Lv' + afterLv; }
              if (afterQ > beforeQ) { wp += 2; gains.newQuality = afterQ; gains.note = (gains.note ? gains.note + ' · ' : '') + '品质突破'; }
              if (afterLv % 5 === 0) { lp += 1; }
              if (afterLv >= 10 && beforeLv < 10) { dp += 1; gains.note = (gains.note ? gains.note + ' · ' : '') + '满级·厨神'; }
              gains.wp = wp; gains.lp = lp; gains.dp = dp;
              if (wp || lp || dp) {
                const cur = getP.get();
                const nw = (wpFromStored(Number(cur.willpower) || 0)) + wp;
                const nl = (Number(cur.lucky) || 0) + lp;
                const nd = (Number(cur.destiny) || 0) + dp;
                setP.run(wpToStored(nw), nl, nd);
                try { db.prepare('INSERT INTO reward_log (ts,source,text,dw,dsw,bw,bsw) VALUES (?,?,?,?,?,?,?)').run(new Date().toISOString(), '烹饪', dish + (gains.activated ? '·习得' : '·熟练度+1'), wpToStored(wp), 0, wpToStored(nw), nd); } catch (le) {}
              }
              try {
                const inv = getInv.get();
                let arr = inv && inv.inventory ? safeParse(inv.inventory, []) : [];
                if (!Array.isArray(arr)) arr = [];
                const idx = arr.findIndex(x => x.item_type === 'dish' && String(x.item_key) === String(recipeId));
                if (idx >= 0) arr[idx].qty = (Number(arr[idx].qty) || 0) + 1;
                else arr.push({ item_type: 'dish', item_key: String(recipeId), name: dish, qty: 1, rarity: rec.rarity || 3, location: 'bag', zone: null, note: '做菜产出', ts: new Date().toISOString() });
                setInv.run(JSON.stringify(arr));
              } catch (ie) {}
            }
          }
          try { db.prepare('UPDATE meals SET gains=? WHERE id=?').run(JSON.stringify(gains), id); } catch (ge) {}
          db.exec('COMMIT');
        } catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id, date, dish, gains }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 撤销做菜：删 meals 记录 + 回退熟练度/货币/背包（境界经验由前端据此回退）
  if (req.method === 'POST' && url === '/api/cook-undo') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const mealId = Number(p.mealId);
        if (!mealId) throw new Error('mealId 不能为空');
        const getMeal = db.prepare('SELECT id,recipe_id,name,gains FROM meals WHERE id=?');
        const meal = getMeal.get(mealId);
        if (!meal) throw new Error('未找到该做菜记录（可能已撤销）');
        const delMeal = db.prepare('DELETE FROM meals WHERE id=?');
        const getRec = db.prepare('SELECT id,name,proficiency,activated,level,quality FROM recipes WHERE id=?');
        const updRec = db.prepare('UPDATE recipes SET proficiency=?,activated=?,level=?,quality=? WHERE id=?');
        const getInv = db.prepare('SELECT inventory FROM player_stats WHERE id=1');
        const setInv = db.prepare('UPDATE player_stats SET inventory=? WHERE id=1');
        const getP = db.prepare('SELECT willpower,lucky,destiny FROM player_stats WHERE id=1');
        const setP = db.prepare('UPDATE player_stats SET willpower=?,lucky=?,destiny=? WHERE id=1');
        const gains = (meal.gains ? safeParse(meal.gains, {}) : {}) || {};
        const rollback = { wp: Number(gains.wp) || 0, lp: Number(gains.lp) || 0, dp: Number(gains.dp) || 0, realmXp: gains.activated ? 5 : 1 };
        db.exec('BEGIN');
        try {
          delMeal.run(mealId);
          if (meal.recipe_id) {
            const rec = getRec.get(meal.recipe_id);
            if (rec) {
              const newProf = Math.max(0, (Number(rec.proficiency) || 0) - 1);
              const newLv = Math.floor(newProf / 10) + 1;
              const newQ = Math.min(4, Math.floor((newLv - 1) / 3) + 1);
              const newAct = newProf > 0 ? 1 : 0;
              updRec.run(newProf, newAct, newLv, newQ, meal.recipe_id);
              if (rollback.wp || rollback.lp || rollback.dp) {
                const cur = getP.get();
                const nw = Math.max(0, (wpFromStored(Number(cur.willpower) || 0)) - rollback.wp);
                const nl = Math.max(0, (Number(cur.lucky) || 0) - rollback.lp);
                const nd = Math.max(0, (Number(cur.destiny) || 0) - rollback.dp);
                setP.run(wpToStored(nw), nl, nd);
              }
              try {
                const inv = getInv.get();
                let arr = inv && inv.inventory ? safeParse(inv.inventory, []) : [];
                if (Array.isArray(arr)) {
                  const idx = arr.findIndex(x => x.item_type === 'dish' && String(x.item_key) === String(meal.recipe_id));
                  if (idx >= 0) { arr[idx].qty = (Number(arr[idx].qty) || 0) - 1; if (arr[idx].qty <= 0) arr.splice(idx, 1); setInv.run(JSON.stringify(arr)); }
                }
              } catch (ie) {}
            }
          }
          db.exec('COMMIT');
        } catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, rollback }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 背包仓库：对 player_stats.inventory 做增改
  if (req.method === 'POST' && url === '/api/inventory') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const action = p.action;
        const getInv = db.prepare('SELECT inventory FROM player_stats WHERE id=1');
        const setInv = db.prepare('UPDATE player_stats SET inventory=? WHERE id=1');
        const read = () => { const r = getInv.get(); let a = r && r.inventory ? safeParse(r.inventory, []) : []; return Array.isArray(a) ? a : []; };
        if (action === 'upsert') {
          const it = p.item || {};
          const arr = read();
          const idx = arr.findIndex(x => x.item_type === it.item_type && String(x.item_key) === String(it.item_key) && (x.location || 'bag') === (it.location || 'bag') && (x.zone || null) === (it.zone || null));
          if (idx >= 0) arr[idx].qty = (Number(arr[idx].qty) || 0) + (Number(it.qty) || 1);
          else arr.push({ item_type: it.item_type, item_key: it.item_key, name: it.name, qty: Number(it.qty) || 1, rarity: it.rarity || 3, location: it.location || 'bag', zone: it.zone || null, note: it.note || '', ts: new Date().toISOString() });
          setInv.run(JSON.stringify(arr));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, inventory: arr }));
        } else if (action === 'set') {
          const arr = Array.isArray(p.inventory) ? p.inventory : [];
          setInv.run(JSON.stringify(arr));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, inventory: arr }));
        } else {
          throw new Error('未知 action: ' + action);
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ---- 通用增量 / 更新 / 删除接口（白名单仅拾光表）----
  const INSERT_TABLES = new Set([
    'game_todos','recipes','meals','taskboard','diary','reward_log','weight',
    'npcs','shop_items','shop_log','econ_plan','econ_quiz','cook_posts'
  ]);
  const getCols = (t) => db.prepare('PRAGMA table_info(' + t + ')').all().map(r => r.name);
  const normVal = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };

  if (req.method === 'POST' && url === '/api/insert') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { table, fields } = JSON.parse(body);
        if (!INSERT_TABLES.has(table)) throw new Error('不允许的表: ' + table);
        if (!fields || typeof fields !== 'object') throw new Error('fields 必须是对象');
        const cols = getCols(table).filter(c => c !== 'id');
        const keys = Object.keys(fields).filter(k => cols.includes(k));
        if (!keys.length) throw new Error('没有合法字段可写入');
        const id = (fields && fields.id != null && Number.isFinite(Number(fields.id))) ? Number(fields.id) : Date.now();
        const colSql = 'id,' + keys.join(',');
        const ph = '?,' + keys.map(() => '?').join(',');
        const vals = [id, ...keys.map(k => normVal(fields[k]))];
        db.prepare('INSERT INTO ' + table + ' (' + colSql + ') VALUES (' + ph + ')').run(...vals);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id, table }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/update') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { table, id, fields } = JSON.parse(body);
        if (!INSERT_TABLES.has(table)) throw new Error('不允许的表: ' + table);
        if (id === undefined || id === null) throw new Error('id 必填');
        if (!fields || typeof fields !== 'object') throw new Error('fields 必须是对象');
        const cols = getCols(table).filter(c => c !== 'id');
        const keys = Object.keys(fields).filter(k => cols.includes(k));
        if (!keys.length) throw new Error('没有合法字段可更新');
        const setSql = keys.map(k => k + '=?').join(',');
        const vals = [...keys.map(k => normVal(fields[k])), id];
        db.prepare('UPDATE ' + table + ' SET ' + setSql + ' WHERE id=?').run(...vals);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id, table }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/delete') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { table, id } = JSON.parse(body);
        if (!INSERT_TABLES.has(table)) throw new Error('不允许的表: ' + table);
        if (id === undefined || id === null) throw new Error('id 必填');
        db.prepare('DELETE FROM ' + table + ' WHERE id=?').run(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id, table }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 经济师备考日历：读取打卡进度
  if (req.method === 'GET' && url === '/api/econ-checkins') {
    const rows = db.prepare('SELECT day, task_idx, checked, updated_at FROM econ_plan').all();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rows }));
    return;
  }
  if (req.method === 'POST' && url === '/api/econ-checkin') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const day = Number(p.day);
        const task_idx = Number(p.task_idx);
        const checked = p.checked ? 1 : 0;
        if (!Number.isFinite(day) || !Number.isFinite(task_idx)) throw new Error('day/task_idx 必填且为数字');
        db.prepare('INSERT INTO econ_plan (day, task_idx, checked, updated_at) VALUES (?,?,?,?) ON CONFLICT(day, task_idx) DO UPDATE SET checked=excluded.checked, updated_at=excluded.updated_at')
          .run(day, task_idx, checked, new Date().toISOString());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, day, task_idx, checked }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }
  if (req.method === 'GET' && url === '/api/econ-quiz-records') {
    const rows = db.prepare('SELECT qid, correct, ts FROM econ_quiz').all();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rows }));
    return;
  }
  if (req.method === 'POST' && url === '/api/econ-quiz-answer') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const qid = String(p.qid);
        const correct = p.correct ? 1 : 0;
        if (!qid) throw new Error('qid 必填');
        db.prepare('INSERT INTO econ_quiz (qid, correct, ts) VALUES (?,?,?) ON CONFLICT(qid) DO UPDATE SET correct=excluded.correct, ts=excluded.ts')
          .run(qid, correct, new Date().toISOString());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, qid, correct }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }
  if (req.method === 'POST' && url === '/api/econ-quiz-delete') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { qids } = JSON.parse(body);
        if (!Array.isArray(qids)) throw new Error('qids 必填数组');
        const del = db.prepare('DELETE FROM econ_quiz WHERE qid = ?');
        qids.forEach(q => del.run(q));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, deleted: qids.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 任务板拖动排序
  if (req.method === 'POST' && url === '/api/reorder-taskboard') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { updates } = JSON.parse(body);
        if (!Array.isArray(updates) || !updates.length) throw new Error('updates 必须是非空数组');
        const stmt = db.prepare('UPDATE taskboard SET grp=?, ord=? WHERE id=?');
        for (const r of updates) stmt.run(String(r.grp), parseInt(r.ord) || 0, r.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: updates.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 从 Obsidian 日记批量同步到 diary 表（按 date UPSERT：已存在则更新，否则插入）
  if (req.method === 'POST' && url === '/api/sync-diary') {
    try {
      const diaryDir = path.join(VAULT, '日记/daily note');
      const files = listMdRecursive(diaryDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f.name));
      const existingIds = new Map(db.prepare('SELECT id,date FROM diary').all().map(r => [r.date, r.id]));
      let inserted = 0, updated = 0;
      const insDiary = db.prepare('INSERT INTO diary (id,date,title,content,mood,aside,created_at) VALUES (?,?,?,?,?,?,?)');
      const updDiary = db.prepare('UPDATE diary SET title=?,content=?,mood=?,aside=?,created_at=? WHERE id=?');
      for (const f of files) {
        const text = readMdSafe(f.path);
        const lines = text.split('\n');
        let date = '', title = '', mood = '';
        const body = [];
        let seenTitle = false;
        for (const line of lines) {
          const dM = line.match(/^date:\s*(.+)$/);
          if (dM && !date) { date = dM[1].trim().slice(0, 10); continue; }
          const mooM = line.match(/^mood:\s*(.+)$/);
          if (mooM && !mood) { mood = mooM[1].trim(); continue; }
          const tM = line.match(/^#\s+(.+)$/);
          if (tM && !seenTitle) { title = tM[1].trim(); seenTitle = true; continue; }
          if (seenTitle) body.push(line);
        }
        if (!date) { const fm2 = f.name.match(/^(\d{4}-\d{2}-\d{2})/); if (fm2) date = fm2[1]; }
        if (!date) continue;
        // 阿夕寄语：<p align=right>——阿夕</p> 转纯文本署名行保留
        let aside = '';
        const contentLines = [];
        for (const line of body) {
          const alignM = line.trim().match(/^<p\s+align[^>]*>(.*?)<\/p>\s*$/i);
          if (alignM) {
            let inner = alignM[1].trim()
              .replace(/<\/?(em|strong|i|b)\s*\/?>/gi, '')
              .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '——');
            inner = inner.trim();
            if (inner) contentLines.push(inner);
            continue;
          }
          contentLines.push(line);
        }
        const content = contentLines.join('\n').trim();
        if (existingIds.has(date)) {
          updDiary.run(title, content, mood, aside, new Date().toISOString(), existingIds.get(date));
          updated++;
        } else {
          insDiary.run(Date.now() + inserted, date, title, content, mood, aside, new Date().toISOString());
          inserted++;
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, inserted, updated }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(e) }));
    }
    return;
  }

  // 愿力奖励（统一收口：所有加/扣愿力走这里，自动记流水；沉沦时收益减半）
  if (req.method === 'POST' && url === '/api/reward') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const cur = db.prepare('SELECT willpower,contract,level,destiny,succubus FROM player_stats WHERE id=1').get();
        if (!cur) throw new Error('player_stats 未初始化');
        const prev = { willpower: wpFromStored(Number(cur.willpower) || 0), contract: Number(cur.contract) || 0, level: Number(cur.level) || 1, destiny: Number(cur.destiny) || 0 };
        let wpDelta = (typeof p.willpower === 'number' ? p.willpower : 0);
        let halfNote = '';
        if (wpDelta > 0) {
          const sucState = safeParse(cur.succubus, null);
          if (sucState && sucState.sunk) { wpDelta = wpDelta / 2; halfNote = '（减半buff·沉沦）'; }
        }
        let wp = prev.willpower + wpDelta;
        if (wp > 1e7) throw new Error('愿力数值异常（超过上限），已拒绝写入');
        const next = { willpower: Math.max(0, wp), contract: prev.contract, level: prev.level, destiny: prev.destiny };
        if (typeof p.contract === 'number') next.contract = Math.max(0, prev.contract + p.contract);
        if (typeof p.level === 'number') next.level = Math.max(0, prev.level + p.level);
        db.prepare('UPDATE player_stats SET willpower=?,contract=?,level=?,destiny=? WHERE id=1')
          .run(wpToStored(next.willpower), next.contract, next.level, next.destiny);
        const dw = next.willpower - prev.willpower;
        if (dw !== 0) {
          try {
            db.prepare('INSERT INTO reward_log (ts,source,text,dw,dsw,bw,bsw) VALUES (?,?,?,?,?,?,?)')
              .run(new Date().toISOString(), p.source || '其他', (p.text || '') + halfNote, wpToStored(dw), 0, wpToStored(next.willpower), next.destiny);
          } catch (le) {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, player: next }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 玩家数值设定（技能/境界等派生字段）：仅白名单列
  if (req.method === 'POST' && url === '/api/player-set') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { fields } = JSON.parse(body);
        if (!fields || typeof fields !== 'object') throw new Error('fields 必填');
        const allowed = ['willpower', 'contract', 'level', 'skills', 'realms', 'lucky', 'destiny'];
        const keys = Object.keys(fields).filter(k => allowed.includes(k));
        if (!keys.length) throw new Error('无合法字段可更新');
        const cur = db.prepare('SELECT willpower,starwish,contract,level,skills,realms,lucky,destiny FROM player_stats WHERE id=1').get();
        if (!cur) throw new Error('player_stats 未初始化');
        // ⚠️ willpower 仅当显式传入才 wpToStored；未传时必须沿用库内 stored 值，绝不能二次×100（历史 bug）
        const wpStored = (fields.willpower !== undefined)
          ? wpToStored(Number(fields.willpower) || 0)
          : cur.willpower;
        if (fields.willpower !== undefined && (Number(fields.willpower) || 0) > 1e7)
          throw new Error('愿力数值异常（超过上限），已拒绝写入以防数据损坏');
        const set = {};
        allowed.forEach(k => { if (k !== 'willpower') set[k] = (fields[k] !== undefined) ? fields[k] : cur[k]; });
        db.prepare('UPDATE player_stats SET willpower=?,starwish=?,contract=?,level=?,skills=?,realms=?,lucky=?,destiny=? WHERE id=1')
          .run(wpStored, Number(set.starwish) || 0, Number(set.contract) || 0, Number(set.level) || 1, set.skills, set.realms, Number(set.lucky) || 0, Number(set.destiny) || 0);
        const pRow = db.prepare('SELECT willpower,starwish,contract,level,skills,realms,lucky,destiny FROM player_stats WHERE id=1').get();
        const player = { willpower: wpFromStored(pRow.willpower), starwish: pRow.starwish, contract: pRow.contract, level: pRow.level, lucky: Number(pRow.lucky) || 0, destiny: Number(pRow.destiny) || 0, skills: safeParse(pRow.skills, {}), realms: safeParse(pRow.realms, {}) };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, player }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 任务板刷新：日级跨天 / 周级跨周自动复位（中国时区），并顺带魅魔周一重置
  if (req.method === 'POST' && url === '/api/taskboard-tick') {
    try {
      const shDateStr = (iso) => new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      const shMondayOf = (ds) => {
        const [y, m, d] = ds.split('-').map(Number);
        const base = new Date(Date.UTC(y, m - 1, d, 16, 0, 0));
        const day = base.getUTCDay();
        const offset = day === 0 ? 6 : day - 1;
        base.setUTCDate(base.getUTCDate() - offset);
        return shDateStr(base.toISOString());
      };
      const todaySh = shDateStr(new Date().toISOString());
      const weekStart = shMondayOf(todaySh);
      try {
        const sucRow = db.prepare('SELECT succubus FROM player_stats WHERE id=1').get();
        const suc = sucRow && sucRow.succubus ? safeParse(sucRow.succubus, {}) : {};
        if (suc.weekKey !== weekStart) {
          db.prepare('UPDATE player_stats SET succubus=? WHERE id=1').run(JSON.stringify({ weekKey: weekStart, seductions: 0, sunk: false }));
        }
      } catch (se) {}
      const rows = db.prepare('SELECT id,grp,done,done_at,points FROM taskboard WHERE done=1').all();
      let resetCount = 0;
      const upd = db.prepare('UPDATE taskboard SET done=0, done_at=NULL WHERE id=?');
      for (const r of rows) {
        const grp = r.grp || '';
        if (!r.done_at) {
          db.prepare('UPDATE taskboard SET done_at=? WHERE id=?').run(todaySh, r.id);
          continue;
        }
        let reset = false;
        const doneSh = shDateStr(r.done_at);
        if (grp.startsWith('日级')) reset = doneSh !== todaySh;
        else if (grp.startsWith('周级')) reset = shMondayOf(doneSh) !== weekStart;
        if (reset) { upd.run(r.id); resetCount++; }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, resetCount, willpowerDelta: 0, player: null }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(e) }));
    }
    return;
  }

  // 魅魔遭遇·抵抗状态机（第1次免费/第2次耗1幸运点不足拆天命点/第3次沉沦→本周愿力减半）
  if (req.method === 'POST' && url === '/api/succubus') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const action = p.action || 'status';
        const shDateStr = (iso) => new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const shMondayOf = (ds) => { const [y, m, d] = ds.split('-').map(Number); const base = new Date(Date.UTC(y, m - 1, d, 16, 0, 0)); const day = base.getUTCDay(); const offset = day === 0 ? 6 : day - 1; base.setUTCDate(base.getUTCDate() - offset); return shDateStr(base.toISOString()); };
        const weekStart = shMondayOf(shDateStr(new Date().toISOString()));
        const cur = db.prepare('SELECT willpower,lucky,destiny,succubus FROM player_stats WHERE id=1').get();
        if (!cur) throw new Error('player_stats 未初始化');
        let suc = safeParse(cur.succubus, null);
        if (!suc || suc.weekKey !== weekStart) suc = { weekKey: weekStart, seductions: 0, sunk: false };
        let wp = wpFromStored(Number(cur.willpower) || 0);
        let lp = Number(cur.lucky) || 0;
        let dp = Number(cur.destiny) || 0;
        let msg = '', changed = false;
        if (action === 'encounter') {
          const sed = Number(suc.seductions) || 0;
          const result = String(p.result || 'failure').toLowerCase();
          if (suc.sunk) {
            msg = '你已沉沦于魔渊，本周无法再抵抗。';
          } else if (result === 'success') {
            wp += 1; changed = true;
            msg = '意志坚定，抵御成功！获得 1 愿力点。';
            try {
              db.prepare('INSERT INTO reward_log (ts,source,text,dw,dsw,bw,bsw) VALUES (?,?,?,?,?,?,?)')
                .run(new Date().toISOString(), '魅魔抵抗·成功', '抵御魅魔诱惑成功', wpToStored(1), 0, wpToStored(wp), dp);
            } catch (le) {}
          } else {
            if (sed === 0) {
              suc.seductions = 1; changed = true;
              msg = '第1次抵御失败：新手护盾触发，免费挣脱！';
            } else if (sed === 1) {
              if (lp >= 1) { lp -= 1; suc.seductions = 2; msg = '第2次抵御失败：消耗 1 幸运点挣脱！'; }
              else if (dp >= 1) { dp -= 1; lp += 10; lp -= 1; suc.seductions = 2; msg = '第2次抵御失败：幸运点不足，自动拆解 1 天命点（=10 幸运点）挣脱！'; }
              else { suc.sunk = true; suc.seductions = 2; msg = '高层货币皆空，第2次即沉沦（本周愿力收益减半）。'; }
              changed = true;
            } else {
              suc.sunk = true; suc.seductions = 3; changed = true;
              msg = '第3次抵御失败——无法挣脱，你已沉沦（本周愿力收益减半）。';
            }
          }
        } else if (action === 'reset') {
          suc = { weekKey: weekStart, seductions: 0, sunk: false }; changed = true; msg = '已手动重置魅魔状态。';
        }
        db.prepare('UPDATE player_stats SET willpower=?,lucky=?,destiny=?,succubus=? WHERE id=1').run(wpToStored(wp), lp, dp, JSON.stringify(suc));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, succubus: suc, willpower: wp, lucky: lp, destiny: dp, msg, changed }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ===== 命愿祈铺 · 商城接口 =====
  const curLabel = (c) => ({ wp: '愿力点', lp: '幸运点', dp: '天命点' }[c] || '点数');
  const limitCycleWindow = () => {
    const shDateStr = (iso) => new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const shMondayOf = (ds) => { const [y, m, d] = ds.split('-').map(Number); const base = new Date(Date.UTC(y, m - 1, d, 16, 0, 0)); const day = base.getUTCDay(); const offset = day === 0 ? 6 : day - 1; base.setUTCDate(base.getUTCDate() - offset); return shDateStr(base.toISOString()); };
    return shMondayOf(shDateStr(new Date().toISOString()));
  };
  const addToInventory = (name) => {
    try {
      const r = db.prepare('SELECT inventory FROM player_stats WHERE id=1').get();
      let arr = r && r.inventory ? safeParse(r.inventory, []) : [];
      if (!Array.isArray(arr)) arr = [];
      arr.push({ name, ts: new Date().toISOString() });
      db.prepare('UPDATE player_stats SET inventory=? WHERE id=1').run(JSON.stringify(arr));
    } catch (e) {}
  };

  // 商城购买
  if (req.method === 'POST' && url === '/api/shop-buy') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        const item = db.prepare('SELECT * FROM shop_items WHERE id=?').get(id);
        if (!item) throw new Error('商品不存在');
        if (item.expires_at && item.expires_at < new Date().toISOString()) throw new Error('该限时商品已下架');
        const cur = db.prepare('SELECT willpower,lucky,destiny FROM player_stats WHERE id=1').get();
        const bal = { wp: wpFromStored(Number(cur.willpower) || 0), lp: Number(cur.lucky) || 0, dp: Number(cur.destiny) || 0 };
        const need = Number(item.price) || 0;
        const have = bal[item.currency] != null ? bal[item.currency] : 0;
        if (have < need) throw new Error('你的【' + curLabel(item.currency) + '】数量不足。');
        if (item.stock != null && Number(item.stock) <= 0) throw new Error('该商品已兑完。');
        if (item.limit_cycle != null) {
          const win = limitCycleWindow();
          const cnt = db.prepare("SELECT COUNT(*) c FROM shop_log WHERE item_id=? AND ts>=?").get(id, win).c;
          if (cnt >= Number(item.limit_cycle)) throw new Error('已达本周期限购次数。');
        }
        const upd = { wp: bal.wp, lp: bal.lp, dp: bal.dp };
        upd[item.currency] = have - need;
        db.prepare('UPDATE player_stats SET willpower=?,lucky=?,destiny=? WHERE id=1').run(wpToStored(upd.wp), upd.lp, upd.dp);
        if (item.stock != null) db.prepare('UPDATE shop_items SET stock=? WHERE id=?').run(Number(item.stock) - 1, id);
        db.prepare('INSERT INTO shop_log (ts,currency,amount,item_id,item_name,zone,section) VALUES (?,?,?,?,?,?,?)')
          .run(new Date().toISOString(), item.currency, need, id, item.name, item.zone, item.section);
        addToInventory(item.name);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 化命台 · 一键全部转换（唯一货币升级渠道，不可逆）
  if (req.method === 'POST' && url === '/api/shop-convert') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      try {
        const cur = db.prepare('SELECT willpower,lucky,destiny FROM player_stats WHERE id=1').get();
        let wp = wpFromStored(Number(cur.willpower) || 0), lp = Number(cur.lucky) || 0, dp = Number(cur.destiny) || 0;
        const lpGain = Math.floor(wp / 100); wp -= lpGain * 100; lp += lpGain;
        const dpGain = Math.floor(lp / 10); lp -= dpGain * 10; dp += dpGain;
        db.prepare('UPDATE player_stats SET willpower=?,lucky=?,destiny=? WHERE id=1').run(wpToStored(wp), lp, dp);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, willpower: wp, lucky: lp, destiny: dp, lpGain, dpGain }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // 降级扣除：WP 不足自动拆 LP → DP
  if (req.method === 'POST' && url === '/api/deduct') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const amount = Math.max(0, Number(p.amount) || 0);
        const cur = db.prepare('SELECT willpower,lucky,destiny FROM player_stats WHERE id=1').get();
        if (!cur) throw new Error('player_stats 未初始化');
        let wp = wpFromStored(Number(cur.willpower) || 0), lp = Number(cur.lucky) || 0, dp = Number(cur.destiny) || 0;
        let need = amount; const detail = [];
        if (need > 0 && wp > 0) { const t = Math.min(wp, need); wp -= t; need -= t; detail.push({ from: 'wp', amount: t }); }
        while (need > 0 && lp >= 1) { lp -= 1; wp += 100; const t = Math.min(wp, need); wp -= t; need -= t; detail.push({ from: 'lp', amount: t }); }
        while (need > 0 && dp >= 1) {
          dp -= 1; lp += 10;
          while (need > 0 && lp >= 1) { lp -= 1; wp += 100; const t = Math.min(wp, need); wp -= t; need -= t; detail.push({ from: 'dp', amount: t }); }
        }
        const shortfall = need;
        db.prepare('UPDATE player_stats SET willpower=?,lucky=?,destiny=? WHERE id=1').run(wpToStored(wp), lp, dp);
        const dw = -(amount - shortfall);
        try { db.prepare('INSERT INTO reward_log (ts,source,text,dw,dsw,bw,bsw) VALUES (?,?,?,?,?,?,?)').run(new Date().toISOString(), p.source || '惩罚', (p.text || '') + (shortfall > 0 ? '（部分未扣）' : ''), wpToStored(dw), 0, wpToStored(wp), dp); } catch (le) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, willpower: wp, lucky: lp, destiny: dp, detail, shortfall }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}
