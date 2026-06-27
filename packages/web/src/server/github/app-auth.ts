import { createAppAuth } from '@octokit/auth-app';
import { readFile } from 'node:fs/promises';

let cached: { token: string; expiresAt: number } | null = null;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} for GitHub App auth.`);
  return value;
}

export function isGitHubAppAuthMode() {
  return process.env.GITHUB_AUTH_MODE === 'app';
}

export async function resolveGitHubAppToken() {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY || (privateKeyPath ? await readFile(privateKeyPath, 'utf8') : '');
  if (!privateKey) throw new Error('Missing GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH for GitHub App auth.');

  const auth = createAppAuth({
    appId: required('GITHUB_APP_ID'),
    privateKey,
    installationId: required('GITHUB_APP_INSTALLATION_ID'),
  });
  const installationAuth = await auth({ type: 'installation' });

  cached = {
    token: installationAuth.token,
    expiresAt: new Date(installationAuth.expiresAt).getTime(),
  };
  return cached.token;
}
