import { expect, test, type Page } from '@playwright/test';

async function mockGitHub(page: Page, handler: (body: any) => unknown) {
  await page.route('**/api/github', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: { authenticated: true, username: 'mona', source: 'env' } });
    return route.fulfill({ json: handler(request.postDataJSON()) });
  });
}

test('repos page fetches repositories through the app API and favorites a repo', async ({ page }) => {
  await mockGitHub(page, () => ({
    viewer: {
      repositories: {
        nodes: [{ id: 'repo-1', nameWithOwner: 'octocat/hello-world', name: 'hello-world', owner: { login: 'octocat' }, description: 'My first repository', isPrivate: false, url: 'https://github.com/octocat/hello-world' }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    },
  }));

  await page.goto('/repos', { waitUntil: 'commit' });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Fetch repositories' }).click();

  await expect(page.getByRole('link', { name: 'octocat/hello-world' })).toHaveAttribute('href', '/repos/octocat/hello-world');
  await expect(page.getByText('My first repository')).toBeVisible();
  await page.getByRole('button', { name: '☆ Favorite' }).click();
  await expect(page.getByRole('button', { name: '★ Favorited' })).toBeVisible();
});

test('repo detail page renders repository metadata, issues, and PRs', async ({ page }) => {
  await mockGitHub(page, (body) => {
    expect(body.variables).toEqual({ owner: 'octocat', name: 'hello-world' });
    return {
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
        issues: { totalCount: 1, nodes: [{ id: 'issue-1', number: 123, title: 'Fix empty state', url: 'https://github.com/octocat/hello-world/issues/123', updatedAt: '2026-06-22T12:00:00Z', author: { login: 'mona' }, labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] } }] },
        pullRequests: { totalCount: 1, nodes: [{ id: 'pr-1', number: 45, title: 'Add repo page', url: 'https://github.com/octocat/hello-world/pull/45', updatedAt: '2026-06-23T12:00:00Z', author: { login: 'hubot' }, isDraft: false, reviewDecision: 'REVIEW_REQUIRED' }] },
      },
    };
  });

  await page.goto('/repos/octocat/hello-world', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'octocat/hello-world' })).toBeVisible();
  await expect(page.getByText('42')).toBeVisible();
  await expect(page.getByText('TypeScript')).toBeVisible();
  await expect(page.getByRole('link', { name: '#123 Fix empty state' })).toHaveAttribute('href', '/repos/octocat/hello-world/issues/123');
  await expect(page.getByRole('link', { name: '#45 Add repo page' })).toHaveAttribute('href', 'https://github.com/octocat/hello-world/pull/45');
});

test('issue detail page can run readiness analysis and links to agent activity', async ({ page }) => {
  await mockGitHub(page, () => ({
    repository: {
      nameWithOwner: 'octocat/hello-world',
      url: 'https://github.com/octocat/hello-world',
      issue: {
        id: 'issue-123', number: 123, title: 'Fix repo dashboard empty state', body: 'Show a helpful empty state.', url: 'https://github.com/octocat/hello-world/issues/123', state: 'OPEN', createdAt: '2026-06-20T10:00:00Z', updatedAt: '2026-06-22T12:00:00Z', closedAt: null, author: { login: 'mona' }, labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] }, assignees: { nodes: [{ login: 'hubot' }] }, comments: { totalCount: 1, nodes: [{ id: 'comment-1', body: 'Please include acceptance criteria.', url: 'https://github.com/octocat/hello-world/issues/123#issuecomment-1', createdAt: '2026-06-21T10:00:00Z', updatedAt: '2026-06-21T10:00:00Z', author: { login: 'octocat' } }] },
      },
    },
  }));
  await page.route('**/api/pi-agent', (route) => route.fulfill({ json: { result: { status: 'needs-refinement', summary: 'Needs clearer acceptance criteria.', reasons: ['Acceptance criteria are missing.'], recommendations: ['Add expected behavior.'] }, commentUrl: 'https://github.com/octocat/hello-world/issues/123#issuecomment-2' } }));

  await page.goto('/repos/octocat/hello-world/issues/123', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Fix repo dashboard empty state' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Agent activity' })).toHaveAttribute('href', '/agent');
  await page.getByRole('button', { name: 'Analyze issue readiness' }).click();
  await expect(page.getByText('Needs clearer acceptance criteria.')).toBeVisible();
  await expect(page.getByText('needs-refinement')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Posted GitHub comment' })).toHaveAttribute('href', 'https://github.com/octocat/hello-world/issues/123#issuecomment-2');
});
