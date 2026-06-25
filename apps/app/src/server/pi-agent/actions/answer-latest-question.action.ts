import type { PiAgentClient } from '../client';
import { formatThread, type GitHubThreadContext } from './types';

export async function answerLatestQuestion(client: PiAgentClient, ctx: GitHubThreadContext) {
  const latest = [...ctx.comments].reverse().find((c) => c.body.includes('?'));
  const result = await client.run({ action: 'answer-latest-question', messages: [
    { role: 'system', content: 'Answer the latest unanswered GitHub question directly, with caveats and next steps.' },
    { role: 'user', content: `Latest question: ${latest?.body ?? 'No explicit question found'}\n\nContext:\n${formatThread(ctx)}` },
  ], metadata: { target: ctx } });
  return `### Pi Agent answer\n\n${result.text}`;
}
