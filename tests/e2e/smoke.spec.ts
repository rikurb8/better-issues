import { expect, test } from '@playwright/test';

test('home page presents Linear meets GitHub Lite landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Linear meets GitHub Lite')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agentic GitHub work hub' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect GitHub' })).toBeVisible();
  await page.screenshot({ path: 'test-artifacts/screenshots/home.png', fullPage: true });
});

test('setup page lets a local user paste a GitHub token', async ({ page }) => {
  await page.goto('/setup');
  await expect(page.getByRole('heading', { name: 'Connect GitHub' })).toBeVisible();
  await page.getByPlaceholder('github_pat_...').fill('github_pat_example_for_e2e');
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByPlaceholder('github_pat_...')).toHaveValue('github_pat_example_for_e2e');
  await page.screenshot({ path: 'test-artifacts/screenshots/setup.png', fullPage: true });
});

test('repos page communicates repository picker state', async ({ page }) => {
  await page.goto('/repos');
  await expect(page.getByRole('heading', { name: 'Repositories' })).toBeVisible();
  await expect(page.getByText('GraphQL-backed repo picker goes here')).toBeVisible();
  await page.screenshot({ path: 'test-artifacts/screenshots/repos.png', fullPage: true });
});
