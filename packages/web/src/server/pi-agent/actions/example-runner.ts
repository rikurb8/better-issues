import { EnvPiAgentClient } from '../client';
import { summarizeThread } from './summarize-thread.action';
import type { GitHubThreadContext } from './types';

if (process.argv.includes('--help')) {
  console.log('Example: pnpm --filter @work-hub/web tsx src/server/pi-agent/actions/example-runner.ts');
  process.exit(0);
}

const ctx: GitHubThreadContext = {
  owner: 'example', repo: 'repo', number: 1, kind: 'issue', title: 'Improve issue reader',
  body: 'We need a full-width GitHub-like markdown reader.',
  labels: ['agent:pi'],
  comments: [{ author: 'human', body: 'Can Pi summarize the next steps?' }],
};

const output = await summarizeThread(new EnvPiAgentClient(), ctx);
console.log(output);
