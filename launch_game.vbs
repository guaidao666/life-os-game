Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
' 隐藏窗口后台启动 拾光·人生修行 独立站（端口 3100，内置 LifeOS API，无需 3000 主服务常驻）
' 注意：下面 node 的绝对路径是按作者机器写的，换机器请改成你自己的 Node 22 路径，或把 Node 加到 PATH 后改成 node.exe
' 因 server.mjs 复用 LifeOS 的 node:sqlite，必须带 --experimental-sqlite 标志
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && C:\Users\WKS\.workbuddy\binaries\node\versions\22.22.2\node.exe --experimental-sqlite server.mjs", 0, False
