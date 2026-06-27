import { sql } from 'kysely';
import { getDatabase } from './db/client';
import type { MentionEventRow, NewMentionEventRow } from './db/schema';
import { resolveGitHubToken } from './github/auth';
import { createGitHubClients } from './github/client';

const HANDLE = 'randy-helper';
const mentionRe = /(^|[^A-Za-z0-9_.+-])@randy-helper(?![A-Za-z0-9_-])/i;
export const hasRandyMention = (body?: string | null) => mentionRe.test(body ?? '');
const snippet = (body?: string | null) => (body ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);

export async function listFavorites() {
  return getDatabase().selectFrom('favorite_repositories').selectAll().orderBy('created_at', 'desc').execute();
}

export async function addFavorite(repo: { owner: string; repo: string; nameWithOwner?: string; url?: string | null; description?: string | null }) {
  const db = getDatabase();
  const owner = repo.owner.trim();
  const name = repo.repo.trim();
  await db.insertInto('favorite_repositories').values({ owner, repo: name, name_with_owner: repo.nameWithOwner ?? `${owner}/${name}`, url: repo.url ?? null, description: repo.description ?? null }).onConflict((oc) => oc.columns(['owner', 'repo']).doUpdateSet({ name_with_owner: repo.nameWithOwner ?? `${owner}/${name}`, url: repo.url ?? null, description: repo.description ?? null })).execute();
  return listFavorites();
}

export async function removeFavorite(owner: string, repo: string) {
  await getDatabase().deleteFrom('favorite_repositories').where('owner', '=', owner).where('repo', '=', repo).execute();
  return listFavorites();
}

export async function listMentions(status?: string | null) {
  let q = getDatabase().selectFrom('mention_events').selectAll().orderBy('last_seen_at', 'desc');
  if (status) q = q.where('status', '=', status as MentionEventRow['status']);
  return q.execute();
}

export async function updateMentionStatus(id: string, status: MentionEventRow['status']) {
  return getDatabase().updateTable('mention_events').set({ status }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
}

const POLL_QUERY = `query MentionPoll($owner:String!,$repo:String!){ repository(owner:$owner,name:$repo){
  issues(first:20, states:OPEN, orderBy:{field:UPDATED_AT,direction:DESC}){ nodes{ id databaseId number title body url createdAt updatedAt author{login} comments(first:50){nodes{id databaseId body url createdAt updatedAt author{login}}} } }
  pullRequests(first:20, states:OPEN, orderBy:{field:UPDATED_AT,direction:DESC}){ nodes{ id databaseId number title body url createdAt updatedAt author{login} comments(first:50){nodes{id databaseId body url createdAt updatedAt author{login}}} reviews(first:50){nodes{id databaseId body url createdAt updatedAt author{login} comments(first:50){nodes{id databaseId body url createdAt updatedAt author{login}}}}} }
}}}`;

type Obj = { id: string; databaseId?: number | null; body?: string | null; url?: string; createdAt: string; updatedAt: string; author?: { login: string } | null };
type Thread = Obj & { number: number; title: string; comments?: { nodes: Obj[] }; reviews?: { nodes: (Obj & { comments?: { nodes: Obj[] } })[] } };

function event(owner: string, repo: string, thread: Thread, threadKind: 'issue' | 'pull', sourceType: NewMentionEventRow['source_type'], source: Obj): NewMentionEventRow | null {
  if (!hasRandyMention(source.body) || source.author?.login?.toLowerCase() === HANDLE) return null;
  return { status: 'new', handle: HANDLE, owner, repo, thread_kind: threadKind, thread_number: thread.number, thread_title: thread.title, thread_url: thread.url ?? '', source_type: sourceType, github_node_id: source.id, github_database_id: source.databaseId ?? null, source_url: source.url ?? thread.url ?? '', author_login: source.author?.login ?? null, body_snippet: snippet(source.body), source_created_at: new Date(source.createdAt), source_updated_at: new Date(source.updatedAt) };
}

async function upsert(events: NewMentionEventRow[]) {
  if (!events.length) return 0;
  const db = getDatabase();
  let created = 0;
  for (const item of events) {
    const res = await db.insertInto('mention_events').values(item).onConflict((oc) => oc.columns(['handle', 'github_node_id']).doNothing()).returning('id').executeTakeFirst();
    if (res) created++;
    else await db.updateTable('mention_events').set({ last_seen_at: sql`now()`, source_updated_at: item.source_updated_at, body_snippet: item.body_snippet }).where('handle', '=', item.handle).where('github_node_id', '=', item.github_node_id).execute();
  }
  return created;
}

export async function pollMentions() {
  const token = await resolveGitHubToken();
  if (!token) throw new Error('Connect GitHub before polling mentions.');
  const clients = createGitHubClients(token);
  const favorites = await listFavorites();
  const errors: Array<{ repo: string; error: string }> = [];
  let newlyDetected = 0;
  for (const fav of favorites) {
    try {
      const data = await clients.graphql<any>(POLL_QUERY, { owner: fav.owner, repo: fav.repo });
      const events: NewMentionEventRow[] = [];
      for (const issue of data.repository.issues.nodes as Thread[]) {
        const own = event(fav.owner, fav.repo, issue, 'issue', 'issue_body', issue); if (own) events.push(own);
        for (const c of issue.comments?.nodes ?? []) { const ev = event(fav.owner, fav.repo, issue, 'issue', 'issue_comment', c); if (ev) events.push(ev); }
      }
      for (const pr of data.repository.pullRequests.nodes as Thread[]) {
        const own = event(fav.owner, fav.repo, pr, 'pull', 'pr_body', pr); if (own) events.push(own);
        for (const c of pr.comments?.nodes ?? []) { const ev = event(fav.owner, fav.repo, pr, 'pull', 'pr_comment', c); if (ev) events.push(ev); }
        for (const r of pr.reviews?.nodes ?? []) { const rev = event(fav.owner, fav.repo, pr, 'pull', 'pr_review', r); if (rev) events.push(rev); for (const c of r.comments?.nodes ?? []) { const ev = event(fav.owner, fav.repo, pr, 'pull', 'pr_review_comment', c); if (ev) events.push(ev); } }
      }
      newlyDetected += await upsert(events);
    } catch (err) { errors.push({ repo: fav.name_with_owner, error: err instanceof Error ? err.message : 'Polling failed' }); }
  }
  const items = await listMentions();
  return { newlyDetected, items, errors, favorites: favorites.length };
}
