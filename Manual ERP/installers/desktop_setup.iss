; =====================================================================
; INNO SETUP COMPILER SCRIPT FOR ERP CLIENT DESKTOP APPLICATION
; =====================================================================

[Setup]
AppName=ERP Client Console
AppVersion=1.0.0
AppPublisher=ERP Vendor
DefaultDirName={pf}\ERP Client
DefaultGroupName=ERP Client Console
DisableProgramGroupPage=yes
OutputDir=build_desktop_installer
OutputBaseFilename=ERPDesktopSetup
Compression=lzma
SolidCompression=yes
SetupIconFile=AppIcon.ico
WizardStyle=modern

[Files]
; Tauri-compiled client application assets bundle
Source: "..\frontend\src-tauri\target\release\ERP.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\frontend\src-tauri\target\release\*.dll"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\ERP Client Console"; Filename: "{app}\ERP.exe"
Name: "{commondesktop}\ERP Client Console"; Filename: "{app}\ERP.exe"

[Run]
Filename: "{app}\ERP.exe"; Description: "Launch ERP Client Console"; Flags: nowait postinstall skipifsilent
