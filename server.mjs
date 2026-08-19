// 拾光·人生修行 独立站 · 自托管服务进程
// 职责：
//   1) 从本目录提供游戏静态文件（index.html / app.js / style.css ...）
//   2) /api/* 直接复用 LifeOS 主服务的 apiHandler，从同一个 life.db 读写（无需 3000 常驻）
// 数据统一在 LifeOS 的 life.db；本进程即唯一后端，开机只起这一个。
// 启动：node --experimental-sqlite server.mjs   （默认端口 3100，可选 PORT=xxxx）

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// 复用 LifeOS 的 API 逻辑（含 node:sqlite 直连 life.db）。
import { apiHandler } from '../life-os/server.mjs';

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
    // 1) 自托管 API：直接调用 LifeOS 的 apiHandler（同一进程内，无需代理到 3000）
    if (url === '/api' || url.startsWith('/api/')) {
      // 把 host 改写成 localhost，复刻旧代理的免鉴权行为：
      // LifeOS 对「非 localhost」来源强制要 token，手机经花生壳公网访问会被 401；
      // 这里与旧代理一致地以 localhost 身份处理，公网域名即可直连。
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
  console.log(`   后端 API: 内嵌 LifeOS apiHandler（直连 life.db，无需 3000 常驻）`);
});
