// 拾光·人生修行 数据迁移脚本：life.db(人生管理系统) → game.db(拾光独立库)
// 用法：node --experimental-sqlite tools/migrate.mjs
// 行为：幂等（目标表已有数据则跳过整表迁移），可重复执行；
//       diary 只建空表不迁移（用户要求：日记直接从 Obsidian 同步）。
import { DatabaseSync } from 'node:sqlite';
import { existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../life-os/life.db');
const DST = path.resolve(__dirname, '../game.db');
const BACKUP = path.resolve(__dirname, '../backups/game.db.premigrate-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.db');

// 目标库中需要迁移数据/建结构的表（不含 diary，diary 单独空建）
const TABLES = {
  player_stats: null, // 特殊：单行，整行迁移
  taskboard: null,
  weight: null,
  npcs: null,
  demons: null,
  shop_items: null,
  shop_log: null,
  game_todos: null,
  reward_log: null,
  cook_posts: null,
  recipes: null,
  econ_plan: null,
  econ_quiz: null,
  meals: null,
};

console.log('=== 拾光独立库迁移 ===');
console.log('源库:', SRC);
console.log('目标:', DST);
if (!existsSync(SRC)) { console.error('✗ 找不到源库 life.db，中止'); process.exit(1); }

// 1) 备份目标库（若存在）
if (existsSync(DST)) {
  copyFileSync(DST, BACKUP);
  console.log('已备份现有 game.db →', path.basename(BACKUP));
}

// 2) 打开源库（只读）+ 目标库，并 ATTACH 源库以便跨库 INSERT SELECT
const src = new DatabaseSync(SRC, { readOnly: true });
const dst = new DatabaseSync(DST);
dst.exec(`ATTACH DATABASE '${SRC.replace(/'/g, "''")}' AS src`);

// 3) 目标库建表（与 server-lib.mjs 保持一致；含迁移列）
dst.exec(`
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
try { dst.exec('ALTER TABLE taskboard ADD COLUMN done_at TEXT'); } catch (e) {}
try { dst.exec('ALTER TABLE taskboard ADD COLUMN ord INTEGER DEFAULT 0'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN time INTEGER DEFAULT 0'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN difficulty INTEGER DEFAULT 2'); } catch (e) {}
try { dst.exec("ALTER TABLE recipes ADD COLUMN ingredients TEXT DEFAULT '[]'"); } catch (e) {}
try { dst.exec("ALTER TABLE recipes ADD COLUMN tags TEXT DEFAULT '[]'"); } catch (e) {}
try { dst.exec("ALTER TABLE recipes ADD COLUMN image TEXT DEFAULT ''"); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN obtained INTEGER DEFAULT 1'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN activated INTEGER DEFAULT 0'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN proficiency INTEGER DEFAULT 0'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN level INTEGER DEFAULT 1'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN quality INTEGER DEFAULT 1'); } catch (e) {}
try { dst.exec('ALTER TABLE recipes ADD COLUMN rarity INTEGER DEFAULT 3'); } catch (e) {}
try { dst.exec("ALTER TABLE recipes ADD COLUMN flavor TEXT DEFAULT ''"); } catch (e) {}
try { dst.exec("ALTER TABLE meals ADD COLUMN gains TEXT DEFAULT '{\"wp\":0,\"lp\":0,\"dp\":0,\"activated\":false}'"); } catch (e) {}
try { dst.exec('ALTER TABLE diary ADD COLUMN aside TEXT'); } catch (e) {}
try { dst.exec('ALTER TABLE player_stats ADD COLUMN succubus TEXT'); } catch (e) {}
try { dst.exec('ALTER TABLE player_stats ADD COLUMN lucky REAL DEFAULT 0'); } catch (e) {}
try { dst.exec('ALTER TABLE player_stats ADD COLUMN destiny REAL DEFAULT 0'); } catch (e) {}
try { dst.exec('ALTER TABLE player_stats ADD COLUMN inventory TEXT'); } catch (e) {}
try { dst.exec('ALTER TABLE npcs ADD COLUMN meta TEXT'); } catch (e) {}

// 4) 逐表迁移（目标已有数据则跳过）
let total = 0;
for (const t of Object.keys(TABLES)) {
  try {
    const srcCnt = src.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
    const dstCnt = dst.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
    if (dstCnt > 0) { console.log(`⏭  ${t.padEnd(14)} 目标已有 ${dstCnt} 行，跳过`); continue; }
    const cols = dst.prepare(`PRAGMA table_info(${t})`).all().map(r => r.name).join(',');
    dst.exec(`INSERT INTO ${t} (${cols}) SELECT ${cols} FROM src.${t}`);
    const n = dst.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
    console.log(`✅ ${t.padEnd(14)} ${srcCnt} → ${n} 行`);
    total += n;
  } catch (e) {
    console.log(`⚠️  ${t.padEnd(14)} 迁移失败: ${e.message}`);
  }
}

// 5) diary：只建空表（已有数据则清空为空的契约？——不，幂等：保留空表即可）
const diaryCnt = dst.prepare('SELECT COUNT(*) AS c FROM diary').get().c;
console.log(`📔 diary 按约定不迁移（Obsidian 同步），目标当前 ${diaryCnt} 行`);

src.close();
dst.close();
console.log(`\n=== 迁移完成，共迁移 ${total} 行 ===`);
