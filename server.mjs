// 拾光·人生修行 独立站 · 自托管服务进程
// 职责：
//   1) 从本目录提供游戏静态文件（index.html / app.js / style.css ...）
//   2) /api/* 由本目录 server-lib.mjs 直连 game.db（独立数据库，完全解耦人生管理系统）
// 数据独立在 game.db（与 life-os/life.db 互不影响）；本进程即唯一后端，开机只起这一个。
// 启动：node --experimental-sqlite server.mjs   （默认端口 3100，可选 PORT=xxxx）

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// 拾光独立后端（内置全部游戏 API，连 game.db，零依赖人生管理系统）
import { apiHandler } from './server-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3100;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost').pathname;
  try {
    // 1) 自托管 API：由拾光独立后端 server-lib 处理（直连 game.db，零依赖人生管理系统）
    if (url === '/api' || url.startsWith('/api/')) {
      // 把 host 改写成 localhost，复刻旧代理的免鉴权行为：
      // 手机经公网域名/局域网 IP 访问时，以 localhost 身份处理，无需 token。
      req.headers.host = 'localhost';
      await apiHandler(req, res);
      return;
    }
    // 2) 静态文件：根路径与 /game/ 前缀都映射到本目录（兼容两种挂载方式）
    let rel = url;
    if (rel === '/' || rel === '') rel = '/index.html';
    if (rel.startsWith('/game/')) rel = rel.slice('/game/'.length) || 'index.html';
    const fp = path.join(__dirname, rel);
    if (!fp.startsWith(__dirname) || !existsSync(fp) || !statSync(fp).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + rel);
      return;
    }
    const ext = path.extname(fp);
    const content = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`🎮 拾光·人生修行 独立站已启动: http://localhost:${PORT}`);
  console.log(`   静态目录: ${__dirname}`);
  console.log(`   后端 API: 内嵌拾光独立后端（直连 game.db，完全解耦人生管理系统）`);
});
