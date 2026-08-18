Set WshShell = CreateObject("WScript.Shell")
node = "C:\Users\WKS\.workbuddy\binaries\node\versions\22.22.2\node.exe"
' 隐藏窗口后台启动 LifeOS 主服务（端口 3000，游戏站的数据源）
WshShell.Run "cmd /c cd /d ""D:\AI\workbuddy\Workspace\life-os"" && " & node & " --experimental-sqlite server.mjs", 0, False
' 等 3 秒让 3000 先就绪，再启动游戏站（端口 3100）
WScript.Sleep 3000
WshShell.Run "cmd /c cd /d ""D:\AI\workbuddy\Workspace\life-os-game"" && " & node & " server.mjs", 0, False
