// 一次性解析：中级经济师备考/每日学习计划.md -> econ-plan.json
// 用法：node gen-econ-plan.mjs
//
// 适配 v2.1 对齐版格式：
//   日记录头：#### Day N | YYYY-MM-DD 周X
//   字段：    - **字段名：** 值
//   任务：    - [ ] 文本 / - [x] 文本（无序勾选列表）
//   里程碑：  - **里程碑：** 文本
//
// 产出约定（与 economist-calendar.template.html 兼容）：
//   days[].tasks      —— 纯字符串数组（模板原样渲染，零改动）
//   days[].eachWp     —— 每任务愿力点：普通任务 10；含视频时长标注的任务按分钟数
//   days[].taskDone   —— 每任务初始完成态（来自 md 的 [x]，仅供参考，页面以打卡库为准）
//   days[].milestone  —— 里程碑文本（非空时高亮，模板后续渲染）
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'D:/AI/workbuddy/中级经济师备考/每日学习计划.md';
const OUT = 'D:/AI/workbuddy/Workspace/life-os-game/econ-plan.json';

const md = readFileSync(SRC, 'utf8');
const lines = md.split('\n');

const weeks = {};
let curWeek = null;
const days = [];
const milestones = [];

function cleanTask(t) {
  return t.replace(/\*/g, '').replace(/✅/g, '').replace(/\s+/g, ' ').trim();
}

// 愿力点规则（2026-08-19 定稿）：普通任务每道 +10；若任务标注了视频时长，则按分钟数给
function calcWp(text) {
  const m = text.match(/(?:视频|video)\s*[:：]?\s*(\d+)\s*(?:分钟|分|min)|(\d+)\s*(?:分钟|分|min)\s*(?:视频|video)/i);
  if (m) return parseInt(m[1] || m[2], 10);
  return 10;
}

let rec = null;
let parsingTasks = false;

function pushRec() {
  if (rec && rec.day) {
    days.push(rec);
    if (rec.milestone) milestones.push({ day: rec.day, date: rec.date, text: rec.milestone });
  }
  rec = null;
  parsingTasks = false;
}

for (const raw of lines) {
  const line = raw.replace(/\r$/, '');

  // 周区块头：## 第 N 周（8/17 – 8/23）｜ 主题
  const wk = line.match(/^##\s*第\s*(\d+)\s*周（(.+?)）｜\s*(.+)$/);
  if (wk) {
    pushRec();
    curWeek = Number(wk[1]);
    weeks[curWeek] = { range: wk[2].trim(), theme: wk[3].trim(), goal: '' };
    continue;
  }

  // 周目标
  const goal = line.match(/^\*\*周目标：\*\*\s*(.+)$/);
  if (goal && curWeek != null) {
    weeks[curWeek].goal = goal[1].trim();
    continue;
  }

  // 日记录头：#### Day N | YYYY-MM-DD 周X
  const dh = line.match(/^####\s*Day\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*(.+)$/);
  if (dh) {
    pushRec();
    rec = {
      day: Number(dh[1]),
      date: dh[2],
      weekday: dh[3].trim(),
      week: curWeek,
      phase: '', type: '', duration: '', subject: '',
      tasks: [], eachWp: [], taskDone: [],
      resources: '', goal: '', note: '', milestone: ''
    };
    continue;
  }

  if (!rec) continue;

  // 任务列表项：  - [ ] 文本 / - [x] 文本（无序勾选）
  const task = line.match(/^\s*-\s+\[([ xX])\]\s*(.+)$/);
  if (task) {
    parsingTasks = true;
    const txt = cleanTask(task[2]);
    const done = task[1].toLowerCase() === 'x';
    rec.tasks.push(txt);
    rec.eachWp.push(calcWp(txt));
    rec.taskDone.push(done);
    continue;
  }

  // 字段：- **字段名：** 值
  const field = line.match(/^\s*-\s*\*\*([^*]+)：\*\*\s*(.*)$/);
  if (field) {
    parsingTasks = false;
    const key = field[1].trim();
    const val = field[2].trim();
    const map = {
      '阶段': 'phase', '类型': 'type', '时长': 'duration', '科目': 'subject',
      '资源': 'resources', '验收': 'goal', '备注': 'note', '里程碑': 'milestone'
    };
    // '周次' 不映射，保持创建记录时写入的数字 curWeek（用于本周概览分组）
    if (key === '任务') { /* tasks 已在上面收集 */ }
    else if (map[key]) rec[map[key]] = val;
    continue;
  }

  // 任务解析态下的续行（缩进的子步骤，如考试日时段安排），非独立任务，忽略
}

pushRec();

const out = {
  generatedAt: new Date().toISOString(),
  startDate: days[0]?.date,
  endDate: days[days.length - 1]?.date,
  examDate: '2026-11-07',
  totalDays: days.length,
  weeks,
  milestones,
  days
};

writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('已生成', OUT);
console.log('天数:', days.length, ' 周数:', Object.keys(weeks).length, ' 里程碑日:', milestones.length);
const empty = days.filter(d => !d.tasks.length).map(d => d.day);
console.log('无任务的天:', empty.length ? empty.join(',') : '无');
console.log('缺 week 的天:', days.filter(d => !d.week).map(d => d.day).join(',') || '无');
console.log('视频时长任务数:', days.reduce((s, d) => s + d.eachWp.filter(w => w !== 10).length, 0));
