import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable('mention_events').alterColumn('github_database_id', (col) => col.setDataType('bigint')).execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable('mention_events').alterColumn('github_database_id', (col) => col.setDataType('integer')).execute();
}
