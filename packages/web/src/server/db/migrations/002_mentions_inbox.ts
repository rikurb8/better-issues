import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable('favorite_repositories')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(db.fn('gen_random_uuid')))
    .addColumn('owner', 'text', (col) => col.notNull())
    .addColumn('repo', 'text', (col) => col.notNull())
    .addColumn('name_with_owner', 'text', (col) => col.notNull())
    .addColumn('url', 'text')
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(db.fn('now')))
    .execute();
  await db.schema.createIndex('favorite_repositories_owner_repo_uidx').unique().on('favorite_repositories').columns(['owner', 'repo']).execute();

  await db.schema
    .createTable('mention_events')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(db.fn('gen_random_uuid')))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('new'))
    .addColumn('handle', 'text', (col) => col.notNull())
    .addColumn('owner', 'text', (col) => col.notNull())
    .addColumn('repo', 'text', (col) => col.notNull())
    .addColumn('thread_kind', 'text', (col) => col.notNull())
    .addColumn('thread_number', 'integer', (col) => col.notNull())
    .addColumn('thread_title', 'text', (col) => col.notNull())
    .addColumn('thread_url', 'text', (col) => col.notNull())
    .addColumn('source_type', 'text', (col) => col.notNull())
    .addColumn('github_node_id', 'text', (col) => col.notNull())
    .addColumn('github_database_id', 'bigint')
    .addColumn('source_url', 'text', (col) => col.notNull())
    .addColumn('author_login', 'text')
    .addColumn('body_snippet', 'text')
    .addColumn('source_created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('source_updated_at', 'timestamptz', (col) => col.notNull())
    .addColumn('first_detected_at', 'timestamptz', (col) => col.notNull().defaultTo(db.fn('now')))
    .addColumn('last_seen_at', 'timestamptz', (col) => col.notNull().defaultTo(db.fn('now')))
    .execute();
  await db.schema.createIndex('mention_events_source_uidx').unique().on('mention_events').columns(['handle', 'github_node_id']).execute();
  await db.schema.createIndex('mention_events_status_idx').on('mention_events').column('status').execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable('mention_events').execute();
  await db.schema.dropTable('favorite_repositories').execute();
}
