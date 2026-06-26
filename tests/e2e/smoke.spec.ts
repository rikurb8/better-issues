import { expect, test } from '@playwright/test';

test('global navbar exposes core destinations', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });

  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Work Hub' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Repos' })).toHaveAttribute('href', '/repos');
  await expect(page.getByRole('link', { name: 'Agent', exact: true })).toHaveAttribute('href', '/agent');
  await expect(page.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/setup');
  await expect(page.getByRole('heading', { name: 'Favorite repositories' })).toBeVisible();
});

test('setup page starts GitHub device flow without storing tokens in browser storage', async ({ page }) => {
  await page.route('**/api/github?action=status', (route) => route.fulfill({ json: { authenticated: false, username: null, source: null } }));
  await page.route('**/api/github?action=start-device', (route) => route.fulfill({ json: { device_code: 'device-1', user_code: 'ABCD-1234', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 60 } }));

  await page.goto('/setup', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Connect GitHub' })).toBeVisible();
  await expect(page.getByText('Connect your GitHub account to continue.')).toBeVisible();

  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await expect(page.getByText('ABCD-1234')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy code' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open GitHub' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.length)).toBe(0);
});
