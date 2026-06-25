import { expect, test } from '@playwright/test';

const token = 'github_pat_example_for_e2e';

test('saving a GitHub token persists it in localStorage', async ({ page }) => {
  await page.goto('/setup');

  await page.getByPlaceholder('github_pat_...').fill(token);
  await page.getByRole('button', { name: 'Save locally' }).click();

  await expect(page.getByText('Token saved locally.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fetch repositories' })).toHaveAttribute('href', '/repos');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('github_token_hint'))).toBe(token);

  await page.reload();
  await expect(page.getByPlaceholder('github_pat_...')).toHaveValue(token);
});

test('repos page fetches repositories using the saved token', async ({ page }) => {
  const requests: string[] = [];

  await page.route('https://api.github.com/graphql', async (route) => {
    const request = route.request();
    requests.push(request.headers().authorization ?? '');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          viewer: {
            repositories: {
              nodes: [
                {
                  id: 'repo-1',
                  nameWithOwner: 'octocat/hello-world',
                  name: 'hello-world',
                  owner: { login: 'octocat' },
                  description: 'My first repository',
                  isPrivate: false,
                  url: 'https://github.com/octocat/hello-world',
                },
              ],
            },
          },
        },
      }),
    });
  });

  await page.addInitScript((savedToken) => localStorage.setItem('github_token_hint', savedToken), token);
  await page.goto('/repos');
  await page.getByRole('button', { name: 'Fetch repositories' }).click();

  const repoLink = page.getByRole('link', { name: 'octocat/hello-world' });
  await expect(repoLink).toBeVisible();
  await expect(repoLink).toHaveAttribute('href', '/repos/octocat/hello-world');
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/octocat/hello-world');
  await expect(page.getByText('My first repository')).toBeVisible();
  expect(requests).toEqual([`bearer ${token}`]);
});

test('repos page explains that a saved token is required before fetching', async ({ page }) => {
  await page.goto('/repos');
  await page.getByRole('button', { name: 'Fetch repositories' }).click();

  await expect(page.getByText('Save a GitHub token before fetching repositories.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect GitHub' })).toBeVisible();
});

test('repo detail page fetches and displays repository metadata, issues, and PRs', async ({ page }) => {
  const requests: { authorization?: string; variables?: unknown }[] = [];

  await page.route('https://api.github.com/graphql', async (route) => {
    const request = route.request();
    requests.push({
      authorization: request.headers().authorization,
      variables: request.postDataJSON().variables,
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          repository: {
            id: 'repo-1',
            nameWithOwner: 'octocat/hello-world',
            description: 'My first repository',
            isPrivate: false,
            url: 'https://github.com/octocat/hello-world',
            homepageUrl: null,
            stargazerCount: 42,
            forkCount: 7,
            watchers: { totalCount: 3 },
            primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
            licenseInfo: { name: 'MIT License' },
            defaultBranchRef: { name: 'main' },
            pushedAt: '2026-06-20T12:00:00Z',
            updatedAt: '2026-06-21T12:00:00Z',
            issues: {
              totalCount: 12,
              nodes: [
                {
                  id: 'issue-1',
                  number: 123,
                  title: 'Fix repo dashboard empty state',
                  url: 'https://github.com/octocat/hello-world/issues/123',
                  updatedAt: '2026-06-22T12:00:00Z',
                  author: { login: 'mona' },
                  labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] },
                },
              ],
            },
            pullRequests: {
              totalCount: 2,
              nodes: [
                {
                  id: 'pr-1',
                  number: 45,
                  title: 'Add repository detail page',
                  url: 'https://github.com/octocat/hello-world/pull/45',
                  updatedAt: '2026-06-23T12:00:00Z',
                  author: { login: 'hubot' },
                  isDraft: false,
                  reviewDecision: 'REVIEW_REQUIRED',
                },
              ],
            },
          },
        },
      }),
    });
  });

  await page.addInitScript((savedToken) => localStorage.setItem('github_token_hint', savedToken), token);
  await page.goto('/repos/octocat/hello-world');

  await expect(page.getByRole('heading', { name: 'octocat/hello-world' })).toBeVisible();
  await expect(page.getByText('My first repository')).toBeVisible();
  await expect(page.getByText('Public')).toBeVisible();
  await expect(page.getByText('42')).toBeVisible();
  await expect(page.getByText('TypeScript')).toBeVisible();
  await expect(page.getByText('main')).toBeVisible();
  await expect(page.getByText('MIT License')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open issues (12)' })).toBeVisible();
  await expect(page.getByRole('link', { name: '#123 Fix repo dashboard empty state' })).toHaveAttribute('href', '/repos/octocat/hello-world/issues/123');
  await expect(page.getByText('bug')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open PRs (2)' })).toBeVisible();
  await expect(page.getByRole('link', { name: '#45 Add repository detail page' })).toHaveAttribute('href', 'https://github.com/octocat/hello-world/pull/45');
  await expect(page.getByText('REVIEW_REQUIRED')).toBeVisible();
  await expect(page.getByRole('link', { name: '← Back to repositories' })).toHaveAttribute('href', '/repos');
  expect(requests).toEqual([{ authorization: `bearer ${token}`, variables: { owner: 'octocat', name: 'hello-world' } }]);
});

test('repo detail page explains that a saved token is required', async ({ page }) => {
  await page.goto('/repos/octocat/hello-world');

  await expect(page.getByText('Save a GitHub token before viewing repository details.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect GitHub' })).toBeVisible();
});

test('issue detail page fetches and displays description, metadata, and comments', async ({ page }) => {
  const requests: { authorization?: string; variables?: unknown }[] = [];

  await page.route('https://api.github.com/graphql', async (route) => {
    const request = route.request();
    requests.push({ authorization: request.headers().authorization, variables: request.postDataJSON().variables });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          repository: {
            nameWithOwner: 'octocat/hello-world',
            url: 'https://github.com/octocat/hello-world',
            issue: {
              id: 'issue-123',
              number: 123,
              title: 'Fix repo dashboard empty state',
              body: 'The **repository dashboard** should show a helpful empty state.\n\n- Show recent issues\n\n[Docs](https://docs.github.com)',
              url: 'https://github.com/octocat/hello-world/issues/123',
              state: 'OPEN',
              createdAt: '2026-06-20T10:00:00Z',
              updatedAt: '2026-06-22T12:00:00Z',
              closedAt: null,
              author: { login: 'mona' },
              labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] },
              assignees: { nodes: [{ login: 'hubot' }] },
              comments: {
                totalCount: 2,
                nodes: [
                  {
                    id: 'comment-1',
                    body: 'I can reproduce this on a repo with no issues.',
                    url: 'https://github.com/octocat/hello-world/issues/123#issuecomment-1',
                    createdAt: '2026-06-21T10:00:00Z',
                    updatedAt: '2026-06-21T10:00:00Z',
                    author: { login: 'octocat' },
                  },
                  {
                    id: 'comment-2',
                    body: 'Working on a fix now.',
                    url: 'https://github.com/octocat/hello-world/issues/123#issuecomment-2',
                    createdAt: '2026-06-22T10:00:00Z',
                    updatedAt: '2026-06-22T10:00:00Z',
                    author: { login: 'mona' },
                  },
                ],
              },
            },
          },
        },
      }),
    });
  });

  await page.addInitScript((savedToken) => localStorage.setItem('github_token_hint', savedToken), token);
  await page.goto('/repos/octocat/hello-world/issues/123');

  await expect(page.getByRole('heading', { name: 'Fix repo dashboard empty state' })).toBeVisible();
  await expect(page.getByText('octocat/hello-world #123')).toBeVisible();
  await expect(page.getByText('Opened by mona')).toBeVisible();
  await expect(page.getByText('OPEN', { exact: true })).toBeVisible();
  await expect(page.getByText('bug')).toBeVisible();
  await expect(page.getByText('Assigned to hubot')).toBeVisible();
  await expect(page.locator('strong').filter({ hasText: 'repository dashboard' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Show recent issues' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://docs.github.com');
  await expect(page.getByRole('heading', { name: 'Comments (2)' })).toBeVisible();
  await expect(page.getByText('I can reproduce this on a repo with no issues.')).toBeVisible();
  await expect(page.getByText('Working on a fix now.')).toBeVisible();
  await expect(page.getByRole('link', { name: '← Back to repository' })).toHaveAttribute('href', '/repos/octocat/hello-world');
  await expect(page.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute('href', 'https://github.com/octocat/hello-world/issues/123');
  expect(requests).toEqual([{ authorization: `bearer ${token}`, variables: { owner: 'octocat', name: 'hello-world', number: 123 } }]);
});

test('issue detail page explains that a saved token is required', async ({ page }) => {
  await page.goto('/repos/octocat/hello-world/issues/123');

  await expect(page.getByText('Save a GitHub token before viewing issue details.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect GitHub' })).toBeVisible();
});
