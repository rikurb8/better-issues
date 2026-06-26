import { expect, test } from '@playwright/test';

test('agent page renders persisted activity from the API', async ({ page }) => {
  await page.route('**/api/agent-invocations?limit=100', (route) => route.fulfill({ json: { invocations: [
    {
      id: 'run-1',
      agent: 'pi',
      action: 'analyze-issue-readiness',
      workflow: 'Analyze issue readiness',
      status: 'succeeded',
      ranAt: '2026-06-26T12:00:00Z',
      target: { kind: 'issue', owner: 'octocat', repo: 'hello-world', number: 123, title: 'Fix empty state' },
      summary: 'Ready for a coding agent.',
      resultLabel: 'ready-for-agent',
      commentUrl: 'https://github.com/octocat/hello-world/issues/123#issuecomment-1',
    },
    {
      id: 'run-2',
      agent: 'pi',
      action: 'analyze-issue-readiness',
      workflow: 'Analyze issue readiness',
      status: 'failed',
      ranAt: '2026-06-25T12:00:00Z',
      target: { kind: 'issue', owner: 'octocat', repo: 'hello-world', number: 99, title: 'Broken issue' },
      summary: 'OPENROUTER_API_KEY is required.',
    },
  ] } }));

  await page.goto('/agent', { waitUntil: 'commit' });

  await expect(page.getByRole('heading', { name: 'Agent activity' })).toBeVisible();
  await expect(page.getByText('Total runs')).toBeVisible();
  await expect(page.getByText('Succeeded', { exact: true })).toBeVisible();
  await expect(page.getByText('Failed', { exact: true })).toBeVisible();
  await expect(page.getByText('Ready for a coding agent.')).toBeVisible();
  await expect(page.getByText('ready-for-agent')).toBeVisible();
  await expect(page.getByText('OPENROUTER_API_KEY is required.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'octocat/hello-world#123' })).toHaveAttribute('href', '/repos/octocat/hello-world/issues/123');
  await expect(page.getByRole('link', { name: 'GitHub comment' })).toHaveAttribute('href', 'https://github.com/octocat/hello-world/issues/123#issuecomment-1');
});

test('agent page has an empty state when there are no runs', async ({ page }) => {
  await page.route('**/api/agent-invocations?limit=100', (route) => route.fulfill({ json: { invocations: [] } }));

  await page.goto('/agent', { waitUntil: 'commit' });

  await expect(page.getByText('No agent activity yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
});
