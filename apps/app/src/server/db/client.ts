import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './schema';

let db: Kysely<Database> | undefined;

export function getDatabase() {
  if (db) return db;
  const connectionString = process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' ? undefined : 'postgres://better_issues:better_issues@localhost:55432/better_issues');
  if (!connectionString) throw new Error('DATABASE_URL is required for database-backed agent activity.');

  db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString, max: 10 }),
    }),
  });
  return db;
}
