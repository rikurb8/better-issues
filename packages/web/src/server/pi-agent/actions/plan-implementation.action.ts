import type { PiAgentClient } from '../client';
import { formatThread, type GitHubThreadContext } from './types';

export async function planImplementation(client: PiAgentClient, ctx: GitHubThreadContext) {
  const result = await client.run({ action: 'plan-implementation', messages: [
    { role: 'system', content: 'Create an implementation plan for a coding agent: likely files, steps, acceptance criteria, and test plan.' },
    { role: 'user', content: formatThread(ctx) },
  ], metadata: { target: ctx } });
  return `### Pi Agent implementation plan\n\n${result.text}`;
}
