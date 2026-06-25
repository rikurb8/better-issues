import type { PiAgentClient } from '../client';
import { formatThread, type GitHubThreadContext } from './types';

export async function triageIssue(client: PiAgentClient, ctx: GitHubThreadContext) {
  const result = await client.run({ action: 'triage-issue', messages: [
    { role: 'system', content: 'Triage a GitHub issue. Suggest classification, labels, missing information, and next step.' },
    { role: 'user', content: formatThread(ctx) },
  ], metadata: { target: ctx } });
  return `### Pi Agent triage\n\n${result.text}`;
}
