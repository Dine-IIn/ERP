import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '6001', 10),
  nodeEnv,
  centralAdminSecret: process.env.CENTRAL_ADMIN_SECRET || 'default-central-admin-secret-2026',

  
  // Auto-Updates Registry Settings
  latestVersion: process.env.LATEST_VERSION || '1.1.0',
  downloadUrl: process.env.DOWNLOAD_URL || (nodeEnv === 'production' 
    ? 'https://updates.xyz.com/bin/ERPServer-v1.1.0.exe' 
    : 'http://localhost:6001/bin/ERPServer-v1.1.0.exe'),
  releaseNotes: process.env.RELEASE_NOTES || 'Performance optimizations, socket stabilization, and remote diagnostics toggles.',
  tauriUpdateSignature: process.env.TAURI_UPDATE_SIGNATURE || 'dW51c2VkX3NhbmRib3hfc2lnbmF0dXJlX3BsYWNlaG9sZGVy==',
  
  // Seed Database Configurations (JSON encoded arrays)
  licenseSeeds: process.env.LICENSE_SEEDS,
  discoverySeeds: process.env.DISCOVERY_SEEDS,
  
  // Workspace mapping default server fallback
  fallbackServerUrl: nodeEnv === 'production' 
    ? 'https://erp.anbindustries.com' 
    : 'http://localhost:5000'
};
