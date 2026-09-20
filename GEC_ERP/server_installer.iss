; ====================================================================
; 🏢 GEC Moulding Machine ERP - Enterprise Server Installer Script
; Inno Setup 6.x Configuration (.iss)
; Complete Zero-Dependency Package (Bundled VC++, Node.js & PostgreSQL)
; Standalone Single-File Backend Architecture (Zero Missing Modules)
; ====================================================================

#define MyAppName "GEC Moulding Machine ERP - Enterprise Server"
#define MyAppShortName "GEC ERP Server"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Ghanshyam Engineering Co."
#define MyAppURL "https://ghanshyameng.com"
#define MyAppExeName "server_setup.exe"
#define MyLaunchBat "start_hybrid_server.bat"

[Setup]
; Unique Application GUID
AppId={{E72A99B1-8C54-4D6F-9C12-A8B9C0E12345}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL=https://github.com/Dine-IIn/ERP
DefaultDirName={autopf}\GEC_ERP
DefaultGroupName={#MyAppShortName}
AllowNoIcons=yes
OutputDir=dist_installer
OutputBaseFilename=GEC_ERP_Enterprise_Server_Setup_v1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=auto
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "autostart"; Description: "Automatically launch GEC ERP Central Server on Windows startup"; GroupDescription: "Server Auto-Run Services:"; Flags: checkedonce

[Dirs]
Name: "{app}\storage"; Permissions: users-full
Name: "{app}\backups"; Permissions: users-full
Name: "{app}\pgsql\data"; Permissions: users-full
Name: "{app}\frontend\dist"; Permissions: users-full
Name: "{app}\backend\dist"; Permissions: users-full

[Files]
; Visual C++ 2015-2022 Redistributable Installer (Silent Auto-Provisioning)
Source: "vc_redist.x64.exe"; DestDir: "{tmp}"; Flags: ignoreversion deleteafterinstall

; Visual C++ Runtime DLLs directly into App Root (Guarantees immediate side-by-side DLL resolution)
Source: "vcruntime140*.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "msvcp140*.dll"; DestDir: "{app}"; Flags: ignoreversion

; Standalone Node.js Runtime Engine (Zero Prerequisites)
Source: "bin\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs

; Standalone PostgreSQL Engine (Zero Prerequisites)
Source: "pgsql\*"; DestDir: "{app}\pgsql"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "data\*"

; Standalone Server Setup Wizard Executable
Source: "server_setup.exe"; DestDir: "{app}"; Flags: ignoreversion

; Server Launch & Tunnel Batch Scripts
Source: "start_hybrid_server.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_tunnel.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "cloudflared.exe"; DestDir: "{app}"; Flags: ignoreversion

; Root Configuration
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env.example"; DestDir: "{app}"; Flags: ignoreversion

; Standalone Self-Contained Backend Application Bundle (Zero node_modules dependencies needed)
Source: "backend\dist\*"; DestDir: "{app}\backend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "backend\db\*"; DestDir: "{app}\backend\db"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "backend\package.json"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "backend\.env.example"; DestDir: "{app}\backend"; DestName: ".env"; Flags: onlyifdoesntexist

; Compiled Production Frontend Bundle (Statically Served on Port 5000)
Source: "frontend\dist\*"; DestDir: "{app}\frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu Shortcuts
Name: "{group}\Launch GEC ERP Server"; Filename: "{app}\{#MyLaunchBat}"; WorkingDir: "{app}"
Name: "{group}\GEC Server Setup Wizard"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppShortName}}"; Filename: "{uninstallexe}"

; Desktop Shortcut
Name: "{autodesktop}\Launch GEC ERP Server"; Filename: "{app}\{#MyLaunchBat}"; WorkingDir: "{app}"; Tasks: desktopicon

; Windows Startup Folder (Auto-Run on PC Boot)
Name: "{commonstartup}\GEC_ERP_Server_AutoStart"; Filename: "{app}\{#MyLaunchBat}"; WorkingDir: "{app}"; Tasks: autostart

[Run]
; Silently install Microsoft Visual C++ 2015-2022 Runtime Prerequisites
Filename: "{tmp}\vc_redist.x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Configuring Microsoft Visual C++ 2015-2022 Runtime Prerequisites..."; Flags: runhidden

; Launch GEC ERP Server immediately after installation
Filename: "{app}\{#MyLaunchBat}"; Description: "Launch GEC ERP Enterprise Server now"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean up temporary state and logs while PRESERVING actual database and backups
Type: files; Name: "{app}\*.log"

[Code]
// Safeguard: Notify user during uninstall that production database & backups remain intact
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    MsgBox('GEC ERP Server application uninstalled successfully.' + #13#10 + #13#10 +
           '🛡️ SAFEGUARD ACTIVE:' + #13#10 +
           'Your ERP database records, document archives, and scheduled backups inside:' + #13#10 +
           ExpandConstant('{app}\storage') + #13#10 +
           ExpandConstant('{app}\backups') + #13#10 +
           ExpandConstant('{app}\pgsql\data') + #13#10 +
           'have been preserved completely intact and will NOT be deleted.', mbInformation, MB_OK);
  end;
end;
