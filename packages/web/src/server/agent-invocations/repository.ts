import { getDatabase } from '../db/client';
import type { AgentInvocationRow, NewAgentInvocationRow } from '../db/schema';

export type AgentInvocationDto = {
  id: string;
  agent: 'pi' | string;
  action: string;
  workflow: string;
  status: 'succeeded' | 'failed';
  ranAt: string;
  target: {
    kind: 'issue' | 'pull' | 'repo' | 'unknown';
    owner?: string;
    repo?: string;
    number?: number;
    title?: string;
    url?: string;
  };
  summary?: string;
  resultLabel?: string;
  commentUrl?: string | null;
  details?: Record<string, unknown> | null;
};

export type NewAgentInvocation = Omit<AgentInvocationDto, 'id' | 'ranAt'>;

function toDto(row: AgentInvocationRow): AgentInvocationDto {
  return {
    id: row.id,
    agent: row.agent,
    action: row.action,
    workflow: row.workflow,
    status: row.status,
    ranAt: row.created_at.toISOString(),
    target: {
      kind: row.target_kind,
      ...(row.owner ? { owner: row.owner } : {}),
      ...(row.repo ? { repo: row.repo } : {}),
      ...(row.target_number ? { number: row.target_number } : {}),
      ...(row.target_title ? { title: row.target_title } : {}),
      ...(row.target_url ? { url: row.target_url } : {}),
    },
    ...(row.summary ? { summary: row.summary } : {}),
    ...(row.result_label ? { resultLabel: row.result_label } : {}),
    commentUrl: row.comment_url,
    details: row.details,
  };
}

export async function listAgentInvocations(limit = 100) {
  const rows = await getDatabase()
    .selectFrom('agent_invocations')
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(Math.min(Math.max(limit, 1), 200))
    .execute();
  return rows.map(toDto);
}

export async function createAgentInvocation(input: NewAgentInvocation) {
  const row: NewAgentInvocationRow = {
    agent: input.agent,
    action: input.action,
    workflow: input.workflow,
    status: input.status,
    target_kind: input.target.kind,
    owner: input.target.owner ?? null,
    repo: input.target.repo ?? null,
    target_number: input.target.number ?? null,
    target_title: input.target.title ?? null,
    target_url: input.target.url ?? null,
    summary: input.summary ?? null,
    result_label: input.resultLabel ?? null,
    comment_url: input.commentUrl ?? null,
    details: input.details ?? null,
  };
  const inserted = await getDatabase().insertInto('agent_invocations').values(row).returningAll().executeTakeFirstOrThrow();
  return toDto(inserted);
}
