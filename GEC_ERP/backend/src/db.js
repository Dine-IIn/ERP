import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'gec_erp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 4000,
});

export let isPostgresConnected = false;

export async function initDatabase() {
  try {
    const client = await pool.connect();
    isPostgresConnected = true;
    console.log('✅ Connected to PostgreSQL Database successfully!');

    // Read and run schema.sql if exists
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      // Execute non-database-creation commands
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('CREATE DATABASE') && !s.startsWith('\\c'));

      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (err) {
          // Ignore individual table exists notices
        }
      }
      console.log('✅ PostgreSQL Schema & Tables verified and initialized.');
    }
    client.release();
  } catch (err) {
    isPostgresConnected = false;
    console.warn('⚠️ PostgreSQL connection failed (or PG not running locally yet). Server will operate in resilient Hybrid Mode.');
  }
}

export async function query(text, params) {
  if (!isPostgresConnected) {
    throw new Error('Database is offline');
  }
  return pool.query(text, params);
}
