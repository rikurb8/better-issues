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

  await expect(page.getByRole('link', { name: 'octocat/hello-world' })).toBeVisible();
  await expect(page.getByText('My first repository')).toBeVisible();
  expect(requests).toEqual([`bearer ${token}`]);
});

test('repos page explains that a saved token is required before fetching', async ({ page }) => {
  await page.goto('/repos');
  await page.getByRole('button', { name: 'Fetch repositories' }).click();

  await expect(page.getByText('Save a GitHub token before fetching repositories.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect GitHub' })).toBeVisible();
});
