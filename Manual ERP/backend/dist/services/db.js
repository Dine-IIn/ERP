"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadDatabaseUrl() {
    // Determine root path based on whether the Node process is running as a packaged pkg binary
    const isPackaged = process.argv[0].endsWith('ERPServer.exe');
    const appRoot = isPackaged
        ? path_1.default.dirname(process.execPath)
        : process.cwd();
    // Resolve absolute path to local database configuration
    const envFilePath = path_1.default.resolve(appRoot, '../Data/Config/db.env');
    if (fs_1.default.existsSync(envFilePath)) {
        try {
            const content = fs_1.default.readFileSync(envFilePath, 'utf8');
            const match = content.match(/^DATABASE_URL\s*=\s*["']?([^\r\n"']+)["']?/m);
            if (match && match[1]) {
                console.log(`🔌 [Database Config] Dynamically loaded database URL from local configuration file: "${envFilePath}"`);
                return match[1].trim();
            }
        }
        catch (e) {
            console.warn(`⚠️ [Database Config] Failed to read database env file: ${e.message}`);
        }
    }
    return undefined;
}
const dbUrl = loadDatabaseUrl();
const prisma = new client_1.PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
exports.default = prisma;
//# sourceMappingURL=db.js.map