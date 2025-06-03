import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Lazy initialization to avoid build-time database connection
let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

function ensureDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle({ client: _pool, schema });
  }
  
  return { pool: _pool, db: _db };
}

export function getPool() {
  return ensureDatabaseConnection().pool;
}

export function getDb() {
  return ensureDatabaseConnection().db;
}

// For compatibility
export const pool = getPool();
export const db = getDb();