export const appConfig = () => ({
  app: {
    name: process.env.APP_NAME ?? 'Enterprise ERP',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
});
