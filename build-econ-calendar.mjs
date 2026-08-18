// 构建：把 econ-plan.json 与 econ-questions.json 内联进模板，生成自包含的 economist-calendar.html
import { readFileSync, writeFileSync } from 'node:fs';
const root = 'D:/AI/workbuddy/Workspace/life-os-game/';
const tpl = readFileSync(root + 'economist-calendar.template.html', 'utf8');
const plan = readFileSync(root + 'econ-plan.json', 'utf8');
const questions = readFileSync(root + 'econ-questions.json', 'utf8');
if (!tpl.includes('___PLAN_JSON___')) throw new Error('模板缺少占位符 ___PLAN_JSON___');
if (!tpl.includes('___QUESTIONS_JSON___')) throw new Error('模板缺少占位符 ___QUESTIONS_JSON___');
const out = tpl.replace('___PLAN_JSON___', plan).replace('___QUESTIONS_JSON___', questions);
writeFileSync(root + 'economist-calendar.html', out, 'utf8');
const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log('已生成 economist-calendar.html （' + kb + ' KB，计划+题库已内联）');
