; =====================================================================
; INNO SETUP COMPILER SCRIPT FOR COMMERICAL ERP SINGLE-TENANT SERVER
; =====================================================================

[Setup]
AppName=ERP Enterprise Server
AppVersion=1.0.0
AppPublisher=ERP Vendor
DefaultDirName=D:\ERP
DefaultGroupName=ERP Enterprise Server
DisableProgramGroupPage=yes
OutputDir=build_installer
OutputBaseFilename=ERPServerSetup
Compression=lzma
SolidCompression=yes
SetupIconFile=AppIcon.ico
WizardStyle=modern

[Types]
Name: "full"; Description: "Full Installation (Recommended)"

[Components]
Name: "server"; Description: "ERP Application Server Core"; Types: full
Name: "postgres"; Description: "PostgreSQL Database Engine (Local)"; Types: full
Name: "tunnel"; Description: "Cloudflare Secure Tunnel Endpoint Daemon"; Types: full

[Dirs]
Name: "{app}\App"
Name: "{app}\Data"
Name: "{app}\Data\Postgres"
Name: "{app}\Data\Uploads"
Name: "{app}\Data\Logs"
Name: "{app}\Data\Config"
Name: "{app}\Backups"
Name: "{app}\Updates"

[Files]
; Standalone compiled backend app
Source: "..\backend\build\ERPServer.exe"; DestDir: "{app}\App"; Components: server; Flags: ignoreversion
Source: "..\backend\build\schema.prisma"; DestDir: "{app}\App\prisma"; Components: server; Flags: ignoreversion

; Third-party binaries for service orchestration and secure routing
Source: "bin\nssm.exe"; DestDir: "{app}\App"; Components: server; Flags: ignoreversion
Source: "bin\cloudflared.exe"; DestDir: "{app}\App"; Components: tunnel; Flags: ignoreversion

; Unpack silent PostgreSQL engine installer
Source: "bin\postgresql-installer.exe"; DestDir: "{tmp}"; Components: postgres; Flags: deleteafterinstall

[Code]
var
  CompanyPage: TInputQueryWizardPage;
  LicensePage: TInputQueryWizardPage;
  DomainPage: TInputOptionWizardPage;
  OwnerPage: TInputQueryWizardPage;
  RandomDBPassword: String;

  function GetRandomPasswordString(): String;
var
  Chars: String;
  I: Integer;
begin
  Chars := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  Result := '';
  for I := 1 to 24 do
  begin
    Result := Result + Chars[Random(Length(Chars)) + 1];
  end;
end;

procedure InitializeWizard;
begin
  // --- Step 1: Company Profile Input Screen ---
  CompanyPage := CreateInputQueryPage(wpWelcome,
    'Company Profiling', 'Enter company specifications',
    'Please enter the company name and dynamic billing code.');
  CompanyPage.Add('Company Name:', False);
  CompanyPage.Add('Company Code (e.g. ABC001):', False);
  CompanyPage.Values[0] := 'ABC Industries';
  CompanyPage.Values[1] := 'ABC001';

  // --- Step 2: Licensing Validation Screen ---
  LicensePage := CreateInputQueryPage(CompanyPage.ID,
    'License Activation', 'Activate your ERP copy',
    'Please input the serial key provided by the vendor support.');
  LicensePage.Add('License Serial Key:', False);
  LicensePage.Values[0] := 'ANB-TRIAL-ABC001';

  // --- Step 3: Domain Routing Screen ---
  DomainPage := CreateInputOptionPage(LicensePage.ID,
    'Domain Routing Setup', 'Configure the server networking route',
    'Select whether to map a managed dev domain or assign a custom corporate domain.',
    True, False);
  DomainPage.Add('Use Developer Tunnel Domain (companycode.xyz.com)');
  DomainPage.Add('Use Custom Corporate Domain (e.g., erp.mycompany.com)');
  DomainPage.SelectedValueIndex := 0;

  // --- Step 4: Owner Account Credentials ---
  OwnerPage := CreateInputQueryPage(wpSelectDir,
    'Owner Credentials Setup', 'Create primary admin configurations',
    'Define the credentials of the main company root owner.');
  OwnerPage.Add('Admin Username:', False);
  OwnerPage.Add('Admin Password:', True);
  OwnerPage.Values[0] := 'admin';
  OwnerPage.Values[1] := '';

  // Generate a random database password during installation sequence
  RandomDBPassword := GetRandomPasswordString();
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigContent: String;
  DBEnvContent: String;
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // 1. Write Data\Config\db.env database connection details
    DBEnvContent := 'DATABASE_URL=postgresql://erpadmin:' + RandomDBPassword + '@localhost:5432/ERP' + #13#10;
    SaveStringToFile(ExpandConstant('{app}\Data\Config\db.env'), DBEnvContent, False);

    // 2. Write Data\Config\config.env licensing keys & central services configurations
    ConfigContent := 'LICENSE_KEY=' + LicensePage.Values[0] + #13#10;
    ConfigContent := ConfigContent + 'COMPANY_CODE=' + CompanyPage.Values[1] + #13#10;
    ConfigContent := ConfigContent + 'CENTRAL_SERVICES_URL=http://localhost:6000' + #13#10;
    SaveStringToFile(ExpandConstant('{app}\Data\Config\config.env'), ConfigContent, False);

    // 3. Trigger unattended PostgreSQL installation silently pointing to D:\ERP\Data\Postgres
    WizardForm.StatusLabel.Caption := 'Installing PostgreSQL Database engine silently...';
    Exec(ExpandConstant('{tmp}\postgresql-installer.exe'),
      '--mode unattended --unattendedmodeui none --datadir "' + ExpandConstant('{app}\Data\Postgres') + '" --password "' + RandomDBPassword + '"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // 4. Register services with NSSM under Automatic recovery rules
    WizardForm.StatusLabel.Caption := 'Registering ERP System Windows Services...';
    
    // Register Database Service
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'install ERP_PostgreSQL "' + ExpandConstant('{app}\Data\Postgres\bin\pg_ctl.exe') + '" runservice -N "ERP_PostgreSQL" -D "' + ExpandConstant('{app}\Data\Postgres') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'set ERP_PostgreSQL Start SERVICE_AUTO_START', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Register Backend App Service
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'install ERP_Backend "' + ExpandConstant('{app}\App\ERPServer.exe') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'set ERP_Backend AppDirectory "' + ExpandConstant('{app}\App') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'set ERP_Backend DependOnService ERP_PostgreSQL', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'set ERP_Backend Start SERVICE_AUTO_START', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Configure Automatic recovery crash rules (10-second restarts)
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'set ERP_Backend AppExit Default Restart', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{app}\App\nssm.exe'), 'set ERP_Backend AppThrottle 10000', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // Start Windows Services
    Exec('net', 'start ERP_PostgreSQL', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('net', 'start ERP_Backend', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
