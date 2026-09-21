import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, '../server-config.json');
const ENV_FILE = path.join(__dirname, '../.env');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

  // Update .env
  const envContent = `PORT=${config.port || 5000}
NODE_ENV=production
STORAGE_DIR=${config.dataDir.replace(/\\/g, '/')}/storage
BACKUP_DIR=${config.dataDir.replace(/\\/g, '/')}/backups
PG_HOST=${config.pgHost || 'localhost'}
PG_PORT=${config.pgPort || 5432}
PG_USER=${config.pgUser || 'postgres'}
PG_PASSWORD=${config.pgPassword || 'postgres'}
PG_DATABASE=${config.pgDatabase || 'gec_erp'}
AUTO_BACKUP_CYCLE_HOURS=48
BACKUP_RETENTION_DAYS=0
CORS_ORIGIN=*
SUPERADMIN_MASTER_KEY=${config.superadminKey || 'GEC_SuperAdmin#2026!Secured$'}
JWT_SECRET=gec_moulding_machine_enterprise_secret_key_2026
`;
  fs.writeFileSync(ENV_FILE, envContent, 'utf8');

  // Ensure dedicated database & backup directories exist
  const storagePath = path.join(config.dataDir, 'storage');
  const backupPath = path.join(config.dataDir, 'backups');
  if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, { recursive: true });
}

async function initialSetup() {
  console.log('\n======================================================');
  console.log('   🏭 GEC MOULDING MACHINE ERP - SERVER SETUP WIZARD   ');
  console.log('======================================================\n');
  console.log('Welcome to GEC ERP Central Server Setup.');
  console.log('Please configure your server parameters below:\n');

  const defaultPort = '5000';
  const portInput = await askQuestion(`1. Enter Server Port [default: ${defaultPort}]: `);
  const port = portInput || defaultPort;

  const defaultDataDir = path.resolve(process.cwd(), '../GEC_ERP_DATA');
  console.log(`\n2. Choose a dedicated directory for your ERP Database & Backups.`);
  console.log(`   IMPORTANT: This directory will NEVER be touched or deleted during server uninstallation.`);
  const dataDirInput = await askQuestion(`   Enter Data Directory Path [default: ${defaultDataDir}]: `);
  const dataDir = dataDirInput ? path.resolve(dataDirInput) : defaultDataDir;

  const defaultDbHost = 'localhost';
  const dbHost = (await askQuestion(`\n3. PostgreSQL Host [default: ${defaultDbHost}]: `)) || defaultDbHost;

  const defaultDbPort = '5432';
  const dbPort = (await askQuestion(`4. PostgreSQL Port [default: ${defaultDbPort}]: `)) || defaultDbPort;

  const defaultDbUser = 'postgres';
  const dbUser = (await askQuestion(`5. PostgreSQL User [default: ${defaultDbUser}]: `)) || defaultDbUser;

  const defaultDbPass = 'postgres';
  const dbPass = (await askQuestion(`6. PostgreSQL Password [default: ${defaultDbPass}]: `)) || defaultDbPass;

  const defaultDbName = 'gec_erp';
  const dbName = (await askQuestion(`7. PostgreSQL Database Name [default: ${defaultDbName}]: `)) || defaultDbName;

  const config = {
    isInstalled: true,
    installedAt: new Date().toISOString(),
    port,
    dataDir,
    pgHost: dbHost,
    pgPort: dbPort,
    pgUser: dbUser,
    pgPassword: dbPass,
    pgDatabase: dbName,
    superadminKey: 'GEC_SuperAdmin#2026!Secured$'
  };

  saveConfig(config);

  console.log('\n✅ Configuration saved successfully!');
  console.log(`📁 Dedicated Data & Backups Location: ${config.dataDir}`);
  console.log(`🌐 Server Port: ${config.port}\n`);

  return config;
}

function startServer() {
  console.log('\n🚀 Launching GEC ERP Server...\n');
  const serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    shell: true
  });

  serverProcess.on('close', code => {
    console.log(`\nServer process exited with code ${code}`);
  });
}

async function uninstallServer(config) {
  console.log('\n======================================================');
  console.log('   ⚠️  GEC ERP SERVER UNINSTALLATION WIZARD           ');
  console.log('======================================================\n');
  console.log('This will delete the server application configuration and runtime setup.');
  console.log(`🛡️  SAFEGUARD ACTIVE: Your database, documents, and backups at:`);
  console.log(`   👉 ${config.dataDir}`);
  console.log(`   will NOT be deleted and will remain completely intact!\n`);

  const confirm = await askQuestion('Type "UNINSTALL" to confirm server uninstallation: ');
  if (confirm !== 'UNINSTALL') {
    console.log('❌ Uninstallation cancelled. No changes made.\n');
    return;
  }

  // Remove configuration file
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
  if (fs.existsSync(ENV_FILE)) {
    fs.unlinkSync(ENV_FILE);
  }

  console.log('\n✅ GEC ERP Server successfully uninstalled from this PC.');
  console.log(`📦 Your database and backups are preserved at: ${config.dataDir}`);
  console.log('You may reinstall or reconnect a new server to this database at any time.\n');
}

async function main() {
  let config = loadConfig();

  if (!config || !config.isInstalled) {
    config = await initialSetup();
    const startNow = await askQuestion('Do you want to start the server now? (Y/n): ');
    if (startNow.toLowerCase() !== 'n') {
      startServer();
    }
    return;
  }

  console.log('\n======================================================');
  console.log('   🏭 GEC MOULDING MACHINE ERP - SERVER CONTROL PANEL  ');
  console.log('======================================================\n');
  console.log(`📍 Status: Installed & Configured`);
  console.log(`🌐 Port: ${config.port}`);
  console.log(`📁 Dedicated Data & Backup Location: ${config.dataDir}\n`);

  console.log('Please select an option:');
  console.log('  [1] Start ERP Server');
  console.log('  [2] Reconfigure Server Settings (Port / DB / Paths)');
  console.log('  [3] Uninstall Server (Preserves Database & Backups)');
  console.log('  [4] Exit\n');

  const choice = await askQuestion('Enter choice (1-4) [default: 1]: ');

  switch (choice) {
    case '2':
      await initialSetup();
      break;
    case '3':
      await uninstallServer(config);
      break;
    case '4':
      console.log('Exiting...');
      process.exit(0);
      break;
    case '1':
    default:
      startServer();
      break;
  }
}

main().catch(err => {
  console.error('Server Manager Error:', err);
});
