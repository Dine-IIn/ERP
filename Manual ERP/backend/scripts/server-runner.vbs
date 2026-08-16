Set WshShell = CreateObject("WScript.Shell")
' Run npm start silently in the backend directory without creating a visible console window
WshShell.CurrentDirectory = "d:\ERP\Manual ERP\backend"
WshShell.Run "cmd /c npm start", 0, False
