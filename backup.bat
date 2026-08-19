@echo off
rem ============================================================
rem 拾光·人生修行 独立备份脚本
rem 打包 game.db（隐私数据）+ 核心文件，7z AES-256 加密
rem 输出到 百度网盘下载目录 方便上传同步
rem 用法：双击 或 命令行运行 backup.bat
rem 密码：存在 KeePass（与人生管理系统同一密码体系，如不同请自行修改）
rem ============================================================
setlocal

set SRC=D:\AI\workbuddy\Workspace\life-os-game
set DST=D:\BaiduNetdiskDownload
set SEVENZIP=D:\Program Files\7-Zip\7z.exe

rem 生成带日期时间戳的文件名（YYYYMMDD-HHMM）
for /f "tokens=1-5 delims=/ :" %%a in ("%date% %time%") do set TS=%%c%%a%%b-%%d%%e
set TS=%TS: =0%
set OUTFILE=%DST%\shiguang-backup-%TS%.7z

if not exist "%SEVENZIP%" (
  echo [错误] 找不到 7z：%SEVENZIP%
  pause
  exit /b 1
)

if not exist "%SRC%\game.db" (
  echo [警告] game.db 不存在，服务可能未运行过。仍尝试备份其余文件。
)

rem 密码占位：KEEPASS-PASSWORD 需替换为你 KeePass 里的实际密码
echo [1/2] 正在打包并加密...
"%SEVENZIP%" a -t7z -mhe=on -pKEEPASS-PASSWORD "%OUTFILE%" "%SRC%\game.db" "%SRC%\index.html" "%SRC%\app.js" "%SRC%\style.css" "%SRC%\server.mjs" "%SRC%\server-lib.mjs" "%SRC%\manifest.webmanifest" "%SRC%\icon-192.png" "%SRC%\icon-512.png" "%SRC%\apple-touch-icon.png" "%SRC%\boot-all.vbs" "%SRC%\launch_game.vbs" "%SRC%\start.bat" "%SRC%\economist-calendar.html" >nul
if errorlevel 1 (
  echo [错误] 打包失败！
  pause
  exit /b 1
)

echo [2/2] 完成！备份文件：
echo   %OUTFILE%
echo.
echo 提示：将 .7z 文件上传到百度网盘即可（手动操作）
pause
