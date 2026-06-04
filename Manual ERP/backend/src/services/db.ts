import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function loadDatabaseUrl(): string | undefined {
  // Determine root path based on whether the Node process is running as a packaged pkg binary
  const isPackaged = process.argv[0].endsWith('ERPServer.exe');
  const appRoot = isPackaged 
    ? path.dirname(process.execPath) 
    : process.cwd();
  
  // Resolve absolute path to local database configuration
  const envFilePath = path.resolve(appRoot, '../Data/Config/db.env');
  
  if (fs.existsSync(envFilePath)) {
    try {
      const content = fs.readFileSync(envFilePath, 'utf8');
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^\r\n"']+)["']?/m);
      if (match && match[1]) {
        console.log(`🔌 [Database Config] Dynamically loaded database URL from local configuration file: "${envFilePath}"`);
        return match[1].trim();
      }
    } catch (e: any) {
      console.warn(`⚠️ [Database Config] Failed to read database env file: ${e.message}`);
    }
  }
  return undefined;
}

const dbUrl = loadDatabaseUrl();
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

export default prisma;
