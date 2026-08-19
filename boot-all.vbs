Set WshShell = CreateObject("WScript.Shell")
node = "C:\Users\WKS\.workbuddy\binaries\node\versions\22.22.2\node.exe"
' 仅启动 拾光·人生修行 独立站（端口 3100，内置 LifeOS API，无需 3000 主服务常驻）
WshShell.Run "cmd /c cd /d ""D:\AI\workbuddy\Workspace\life-os-game"" && " & node & " --experimental-sqlite server.mjs", 0, False
