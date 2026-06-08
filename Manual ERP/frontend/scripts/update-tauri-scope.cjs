const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    // Match KEY=VALUE (ignoring comments)
    const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^\r\n"']*)["']?/);
    if (match) {
      env[match[1]] = match[2].trim();
    }
  });
  return env;
}

const baseEnv = parseEnv(path.resolve(__dirname, '../.env'));
const devEnv = parseEnv(path.resolve(__dirname, '../.env.development'));
const prodEnv = parseEnv(path.resolve(__dirname, '../.env.production'));
const mode = process.env.NODE_ENV || 'development';
const modeEnv = parseEnv(path.resolve(__dirname, `../.env.${mode}`));
const env = { ...baseEnv, ...modeEnv, ...process.env };

// Merge envs to find all variables
const allEnvs = [baseEnv, devEnv, prodEnv, process.env];

// Base allowlist (always include localhosts and connectivity check domains)
const baseAllow = [
  "http://localhost:5000/*",
  "http://localhost:6500/*",
  "http://localhost:6001/*",
  "https://clients3.google.com/*"
];

// Extract custom URLs from env
const customUrls = [];

allEnvs.forEach(env => {
  if (env.TAURI_ALLOWED_REMOTE_URL) {
    env.TAURI_ALLOWED_REMOTE_URL.split(',').forEach(url => {
      const trimmed = url.trim();
      if (trimmed && !customUrls.includes(trimmed)) {
        customUrls.push(trimmed);
      }
    });
  }
  if (env.VITE_ALLOWED_REMOTE_URL) {
    env.VITE_ALLOWED_REMOTE_URL.split(',').forEach(url => {
      const trimmed = url.trim();
      if (trimmed && !customUrls.includes(trimmed)) {
        customUrls.push(trimmed);
      }
    });
  }
});

// Auto-extract host patterns from API and Central Service variables
const autoVars = [];
allEnvs.forEach(env => {
  if (env.VITE_CENTRAL_SERVICES_URL) autoVars.push(env.VITE_CENTRAL_SERVICES_URL);
  if (env.VITE_DISCOVERY_SERVICE_URL) autoVars.push(env.VITE_DISCOVERY_SERVICE_URL);
  if (env.VITE_API_URL) autoVars.push(env.VITE_API_URL);
});

autoVars.forEach(v => {
  if (v && v.startsWith('http')) {
    try {
      const urlObj = new URL(v);
      const originGlob = `${urlObj.origin}/*`;
      if (!customUrls.includes(originGlob) && !baseAllow.includes(originGlob)) {
        customUrls.push(originGlob);
      }
    } catch (e) {
      // Ignore invalid URL structures
    }
  }
});

const finalAllow = [...baseAllow, ...customUrls];

// 1. Update Capabilities fetch scope (capabilities/default.json)
const defaultJsonPath = path.resolve(__dirname, '../src-tauri/capabilities/default.json');
if (fs.existsSync(defaultJsonPath)) {
  try {
    const defaultJson = JSON.parse(fs.readFileSync(defaultJsonPath, 'utf8'));
    
    let updatedCount = 0;
    defaultJson.permissions = defaultJson.permissions.map(perm => {
      if (typeof perm === 'object' && perm.identifier) {
        if (['http:allow-fetch', 'http:allow-fetch-send', 'http:allow-fetch-read-body'].includes(perm.identifier)) {
          delete perm.scope; // clean up old incorrect structure if present
          perm.allow = finalAllow;
          updatedCount++;
        }
      }
      return perm;
    });

    if (updatedCount > 0) {
      fs.writeFileSync(defaultJsonPath, JSON.stringify(defaultJson, null, 2), 'utf8');
      console.log(`🛡️ [Tauri Capability Builder] Successfully updated Allowed Fetch Scope inside default.json`);
    } else {
      console.warn(`⚠️ [Tauri Capability Builder] Could not find fetch permission identifiers in default.json`);
    }
  } catch (err) {
    console.error(`🔴 [Tauri Capability Builder] Failed to update default.json:`, err.message);
  }
} else {
  console.error(`🔴 [Tauri Capability Builder] default.json not found at: ${defaultJsonPath}`);
}

// 2. Update Updater Endpoints (tauri.conf.json)
const tauriConfPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  try {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    
    const finalEndpoints = [];
    const centralUrl = env.VITE_CENTRAL_SERVICES_URL;
    if (centralUrl && centralUrl.startsWith('http')) {
      try {
        const urlObj = new URL(centralUrl);
        const updateEndpoint = `${urlObj.origin}/api/updater/{{target}}/{{current_version}}`;
        finalEndpoints.push(updateEndpoint);
      } catch (e) {}
    }

    if (finalEndpoints.length === 0) {
      finalEndpoints.push("http://localhost:6500/api/updater/{{target}}/{{current_version}}");
    }

    if (tauriConf.plugins && tauriConf.plugins.updater) {
      tauriConf.plugins.updater.endpoints = finalEndpoints;
      fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2), 'utf8');
      console.log(`🔄 [Tauri Config Builder] Successfully updated Updater Endpoints inside tauri.conf.json`);
    }
  } catch (err) {
    console.error(`🔴 [Tauri Config Builder] Failed to update tauri.conf.json:`, err.message);
  }
} else {
  console.error(`🔴 [Tauri Config Builder] tauri.conf.json not found at: ${tauriConfPath}`);
}
