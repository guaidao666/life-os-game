// 游戏人生独立站 · 独立服务进程（剥离方案①）
// 职责：
//   1) 从本目录提供游戏静态文件（index.html / app.js / style.css ...）
//   2) 把 /api/* 请求代理转发给 LifeOS 主服务（默认 http://localhost:3000）
// 数据仍统一在 LifeOS 的 life.db，零迁移、零功能丢失。
// 启动：node server.mjs   （可选 PORT=3100 UPSTREAM=http://localhost:3000）

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3100;
const UPSTREAM = process.env.UPSTREAM || 'http://localhost:3000';

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
    // 1) 代理 /api/* 到 LifeOS 主服务
    if (url === '/api' || url.startsWith('/api/')) {
      await proxy(req, res, url);
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

function proxy(req, res, url) {
  return new Promise((resolve) => {
    const target = new URL(url, UPSTREAM);
    const opts = {
      method: req.method,
      headers: { ...req.headers, host: target.host },
    };
    const p = http.request(target, opts, (upRes) => {
      // 去掉 hop-by-hop 头，避免分块/连接类头导致浏览器解析异常
      const fwd = { ...upRes.headers };
      delete fwd['connection'];
      delete fwd['transfer-encoding'];
      res.writeHead(upRes.statusCode, fwd);
      upRes.pipe(res);
      upRes.on('end', resolve);
      upRes.on('error', () => resolve());
    });
    p.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: '上游 LifeOS 服务不可达: ' + e.message, hint: '请先启动 LifeOS 主服务 (node --experimental-sqlite server.mjs)' }));
      resolve();
    });
    req.pipe(p);
  });
}

server.listen(PORT, () => {
  console.log(`🎮 游戏人生独立站已启动: http://localhost:${PORT}`);
  console.log(`   静态目录: ${__dirname}`);
  console.log(`   数据代理: ${UPSTREAM}/api/*`);
});
