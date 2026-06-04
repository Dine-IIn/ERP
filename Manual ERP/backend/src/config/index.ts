const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  centralUrl: process.env.CENTRAL_SERVICES_URL || (nodeEnv === 'production' 
    ? 'https://license.xyz.com' 
    : 'http://localhost:6001'),
  centralAdminSecret: process.env.CENTRAL_ADMIN_SECRET || 'default-central-admin-secret-2026',
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv
};
