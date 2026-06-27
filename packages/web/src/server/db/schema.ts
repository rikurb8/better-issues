import type { Generated, Insertable, JSONColumnType, Selectable } from 'kysely';

export type AgentInvocationTable = {
  id: Generated<string>;
  agent: string;
  action: string;
  workflow: string;
  status: 'succeeded' | 'failed';
  target_kind: 'issue' | 'pull' | 'repo' | 'unknown';
  owner: string | null;
  repo: string | null;
  target_number: number | null;
  target_title: string | null;
  target_url: string | null;
  summary: string | null;
  result_label: string | null;
  comment_url: string | null;
  details: JSONColumnType<Record<string, unknown> | null, Record<string, unknown> | null, Record<string, unknown> | null>;
  created_at: Generated<Date>;
};

export type FavoriteRepositoryTable = {
  id: Generated<string>;
  owner: string;
  repo: string;
  name_with_owner: string;
  url: string | null;
  description: string | null;
  created_at: Generated<Date>;
};

export type MentionEventTable = {
  id: Generated<string>;
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  handle: string;
  owner: string;
  repo: string;
  thread_kind: 'issue' | 'pull';
  thread_number: number;
  thread_title: string;
  thread_url: string;
  source_type: 'issue_body' | 'issue_comment' | 'pr_body' | 'pr_comment' | 'pr_review' | 'pr_review_comment';
  github_node_id: string;
  github_database_id: number | null;
  source_url: string;
  author_login: string | null;
  body_snippet: string | null;
  source_created_at: Date;
  source_updated_at: Date;
  first_detected_at: Generated<Date>;
  last_seen_at: Generated<Date>;
};

export type Database = {
  agent_invocations: AgentInvocationTable;
  favorite_repositories: FavoriteRepositoryTable;
  mention_events: MentionEventTable;
};

export type AgentInvocationRow = Selectable<AgentInvocationTable>;
export type NewAgentInvocationRow = Insertable<AgentInvocationTable>;
export type FavoriteRepositoryRow = Selectable<FavoriteRepositoryTable>;
export type NewFavoriteRepositoryRow = Insertable<FavoriteRepositoryTable>;
export type MentionEventRow = Selectable<MentionEventTable>;
export type NewMentionEventRow = Insertable<MentionEventTable>;
