@echo off
REM 游戏人生独立站 · 启动脚本（剥离方案①）
REM 默认端口 3100，数据代理到 LifeOS 主服务 http://localhost:3000
REM 改端口：先 set PORT=3200 再启动；改上游：set UPSTREAM=http://其他主机:3000
cd /d %~dp0
node server.mjs
pause
