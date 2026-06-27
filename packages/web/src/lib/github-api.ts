export async function githubGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/github', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'graphql', query, variables }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) throw new Error(payload.error ?? payload.errors?.[0]?.message ?? 'GitHub request failed.');
  return payload as T;
}

export async function githubAuthStatus(): Promise<{ authenticated: boolean; username: string | null; source: 'oauth' | 'env' | 'github-app' | null; invalid?: boolean }> {
  const response = await fetch('/api/github?action=status');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to check GitHub auth.');
  return payload;
}
