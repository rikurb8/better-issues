import type { PiAgentClient } from '../client';
import { formatThread, type GitHubThreadContext } from './types';

export async function summarizeThread(client: PiAgentClient, ctx: GitHubThreadContext) {
  const result = await client.run({ action: 'summarize-thread', messages: [
    { role: 'system', content: 'You summarize GitHub issue/PR discussions for agentic developers. Be concise and actionable.' },
    { role: 'user', content: `Summarize this thread with: status, decisions, blockers, next actions.\n\n${formatThread(ctx)}` },
  ], metadata: { target: ctx } });
  return `### Pi Agent summary\n\n${result.text}`;
}
