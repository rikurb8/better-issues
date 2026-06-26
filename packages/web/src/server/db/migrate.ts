import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { getDatabase } from './client';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const db = getDatabase();
const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(dirname, 'migrations'),
  }),
});

const direction = process.argv[2] ?? 'latest';
const result = direction === 'down' ? await migrator.migrateDown() : await migrator.migrateToLatest();

for (const migration of result.results ?? []) {
  if (migration.status === 'Success') console.log(`${migration.migrationName}: migrated`);
  if (migration.status === 'Error') console.error(`${migration.migrationName}: failed`);
}

if (result.error) {
  console.error(result.error);
  process.exitCode = 1;
}

await db.destroy();
