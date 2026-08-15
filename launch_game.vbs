Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
' 隐藏窗口后台启动 游戏人生独立站（剥离方案①，默认端口 3100，数据代理到 LifeOS 主服务 3000）
' 注意：下面 node 的绝对路径是按作者机器写的，换机器请改成你自己的 Node 22 路径，或把 Node 加到 PATH 后改成 node.exe
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && C:\Users\WKS\.workbuddy\binaries\node\versions\22.22.2\node.exe server.mjs", 0, False
