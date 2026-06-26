import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || 'Ov23liQVEcCGHU1uxAGI';
const SCOPES = 'repo read:user';
const TOKEN_PATH = join(process.env.APP_DATA_DIR || '.data', 'auth', 'github.json');

type StoredAuth = { accessToken: string; tokenType?: string; scope?: string; username?: string; savedAt: string };

export async function readStoredGitHubAuth(): Promise<StoredAuth | null> {
  try { return JSON.parse(await readFile(TOKEN_PATH, 'utf8')) as StoredAuth; } catch { return null; }
}

export async function writeStoredGitHubAuth(auth: Omit<StoredAuth, 'savedAt'>) {
  await mkdir(dirname(TOKEN_PATH), { recursive: true });
  await writeFile(TOKEN_PATH, JSON.stringify({ ...auth, savedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
}

export async function deleteStoredGitHubAuth() { await rm(TOKEN_PATH, { force: true }); }

export async function resolveGitHubToken() {
  const stored = await readStoredGitHubAuth();
  return stored?.accessToken || process.env.GITHUB_TOKEN || '';
}

export async function getAuthStatus() {
  const token = await resolveGitHubToken();
  if (!token) return { authenticated: false, username: null, source: null };
  const response = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    if ((await readStoredGitHubAuth())?.accessToken) await deleteStoredGitHubAuth();
    return { authenticated: false, username: null, source: null, invalid: true };
  }
  const user = await response.json() as { login?: string };
  return { authenticated: true, username: user.login ?? null, source: (await readStoredGitHubAuth())?.accessToken ? 'oauth' : 'env' };
}

export async function startDeviceFlow() {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPES }),
  });
  if (!response.ok) throw new Error('Unable to start GitHub Device Flow.');
  return response.json() as Promise<{ device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval: number }>;
}

export async function pollDeviceFlow(deviceCode: string) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
  });
  const payload = await response.json() as { access_token?: string; token_type?: string; scope?: string; error?: string; error_description?: string; interval?: number };
  if (!response.ok) throw new Error('Unable to complete GitHub Device Flow.');
  if (payload.error) return { status: payload.error, message: payload.error_description, interval: payload.interval };
  if (!payload.access_token) return { status: 'authorization_pending' };
  const userResponse = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${payload.access_token}`, accept: 'application/vnd.github+json' } });
  if (!userResponse.ok) throw new Error('GitHub accepted the login, but user lookup failed.');
  const user = await userResponse.json() as { login?: string };
  await writeStoredGitHubAuth({ accessToken: payload.access_token, tokenType: payload.token_type, scope: payload.scope, username: user.login });
  return { status: 'success', username: user.login ?? null };
}
