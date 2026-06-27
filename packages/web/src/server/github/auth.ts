import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isGitHubAppAuthMode, resolveGitHubAppToken } from './app-auth';
import { createGitHubClients } from './client';

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || 'Ov23liQVEcCGHU1uxAGI';
const SCOPES = 'repo read:user';
const TOKEN_PATH = join(process.env.APP_DATA_DIR || '.data', 'auth', 'github.json');

type StoredAuth = { accessToken: string; tokenType?: string; scope?: string; username?: string; savedAt: string };

async function getAuthenticatedUsername(token: string) {
  const { data } = await createGitHubClients(token).rest.users.getAuthenticated();
  return data.login ?? null;
}

export async function readStoredGitHubAuth(): Promise<StoredAuth | null> {
  try { return JSON.parse(await readFile(TOKEN_PATH, 'utf8')) as StoredAuth; } catch { return null; }
}

export async function writeStoredGitHubAuth(auth: Omit<StoredAuth, 'savedAt'>) {
  await mkdir(dirname(TOKEN_PATH), { recursive: true });
  await writeFile(TOKEN_PATH, JSON.stringify({ ...auth, savedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
}

export async function deleteStoredGitHubAuth() { await rm(TOKEN_PATH, { force: true }); }

export async function resolveGitHubToken() {
  if (isGitHubAppAuthMode()) return resolveGitHubAppToken();
  const stored = await readStoredGitHubAuth();
  return stored?.accessToken || process.env.GITHUB_TOKEN || '';
}

export async function getAuthStatus() {
  if (isGitHubAppAuthMode()) {
    try {
      await resolveGitHubAppToken();
      return { authenticated: true, username: process.env.GITHUB_APP_SLUG || 'GitHub App', source: 'github-app' };
    } catch {
      return { authenticated: false, username: null, source: 'github-app', invalid: true };
    }
  }

  const token = await resolveGitHubToken();
  if (!token) return { authenticated: false, username: null, source: null };
  try {
    const username = await getAuthenticatedUsername(token);
    return { authenticated: true, username, source: (await readStoredGitHubAuth())?.accessToken ? 'oauth' : 'env' };
  } catch {
    if ((await readStoredGitHubAuth())?.accessToken) await deleteStoredGitHubAuth();
    return { authenticated: false, username: null, source: null, invalid: true };
  }
}

export async function startDeviceFlow() {
  if (isGitHubAppAuthMode()) throw new Error('Device Flow is disabled while GITHUB_AUTH_MODE=app.');
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPES }),
  });
  if (!response.ok) throw new Error('Unable to start GitHub Device Flow.');
  return response.json() as Promise<{ device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval: number }>;
}

export async function pollDeviceFlow(deviceCode: string) {
  if (isGitHubAppAuthMode()) throw new Error('Device Flow is disabled while GITHUB_AUTH_MODE=app.');
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
  });
  const payload = await response.json() as { access_token?: string; token_type?: string; scope?: string; error?: string; error_description?: string; interval?: number };
  if (!response.ok) throw new Error('Unable to complete GitHub Device Flow.');
  if (payload.error) return { status: payload.error, message: payload.error_description, interval: payload.interval };
  if (!payload.access_token) return { status: 'authorization_pending' };
  const username = await getAuthenticatedUsername(payload.access_token).catch(() => { throw new Error('GitHub accepted the login, but user lookup failed.'); });
  await writeStoredGitHubAuth({ accessToken: payload.access_token, tokenType: payload.token_type, scope: payload.scope, username: username ?? undefined });
  return { status: 'success', username };
}
