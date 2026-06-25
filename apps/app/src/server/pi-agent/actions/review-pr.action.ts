import type { PiAgentClient } from '../client';
import { formatThread, type GitHubThreadContext } from './types';

export async function reviewPr(client: PiAgentClient, ctx: GitHubThreadContext) {
  const result = await client.run({ action: 'review-pr', messages: [
    { role: 'system', content: 'Review a PR conversation without full diff UI. Focus on risks, missing tests, unresolved questions, and next review actions.' },
    { role: 'user', content: formatThread(ctx) },
  ], metadata: { target: ctx } });
  return `### Pi Agent PR review\n\n${result.text}`;
}
