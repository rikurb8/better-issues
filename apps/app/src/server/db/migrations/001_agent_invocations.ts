import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable('agent_invocations')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(db.fn('gen_random_uuid')))
    .addColumn('agent', 'text', (col) => col.notNull())
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('workflow', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('target_kind', 'text', (col) => col.notNull().defaultTo('unknown'))
    .addColumn('owner', 'text')
    .addColumn('repo', 'text')
    .addColumn('target_number', 'integer')
    .addColumn('target_title', 'text')
    .addColumn('target_url', 'text')
    .addColumn('summary', 'text')
    .addColumn('result_label', 'text')
    .addColumn('comment_url', 'text')
    .addColumn('details', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(db.fn('now')))
    .execute();

  await db.schema.createIndex('agent_invocations_created_at_idx').on('agent_invocations').column('created_at').execute();
  await db.schema.createIndex('agent_invocations_target_idx').on('agent_invocations').columns(['owner', 'repo', 'target_number']).execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable('agent_invocations').execute();
}
