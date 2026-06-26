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

export type Database = {
  agent_invocations: AgentInvocationTable;
};

export type AgentInvocationRow = Selectable<AgentInvocationTable>;
export type NewAgentInvocationRow = Insertable<AgentInvocationTable>;
