import type { PiAgentClient } from '../client';
import { formatThread, type GitHubThreadContext } from './types';

export async function draftReply(client: PiAgentClient, ctx: GitHubThreadContext, instruction: string) {
  const result = await client.run({ action: 'draft-reply', messages: [
    { role: 'system', content: 'Draft a GitHub comment. Do not overclaim; mention assumptions.' },
    { role: 'user', content: `Instruction: ${instruction}\n\nThread:\n${formatThread(ctx)}` },
  ], metadata: { target: ctx, instruction } });
  return result.text;
}
