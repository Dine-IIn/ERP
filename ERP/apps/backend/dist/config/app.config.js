"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
const appConfig = () => ({
    app: {
        name: process.env.APP_NAME ?? 'Enterprise ERP',
        nodeEnv: process.env.NODE_ENV ?? 'development',
    },
});
exports.appConfig = appConfig;
//# sourceMappingURL=app.config.js.map