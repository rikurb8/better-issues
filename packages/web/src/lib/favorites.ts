export type FavoriteRepo = { owner: string; name: string; nameWithOwner: string; url?: string; description?: string | null };

type FavoriteRow = { owner: string; repo: string; name_with_owner: string; url?: string | null; description?: string | null };
const fromRow = (row: FavoriteRow): FavoriteRepo => ({ owner: row.owner, name: row.repo, nameWithOwner: row.name_with_owner, url: row.url ?? undefined, description: row.description });

export async function fetchFavoriteRepos(): Promise<FavoriteRepo[]> {
  const response = await fetch('/api/mentions?resource=favorites');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to load favorites.');
  return (payload.favorites ?? []).map(fromRow);
}

export async function toggleFavoriteRepo(repo: FavoriteRepo, currentlyFavorite: boolean) {
  const response = await fetch('/api/mentions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: currentlyFavorite ? 'favorite:remove' : 'favorite:add', owner: repo.owner.trim(), repo: repo.name.trim(), nameWithOwner: repo.nameWithOwner.trim(), url: repo.url, description: repo.description }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to update favorite.');
  const favorites = (payload.favorites ?? []).map(fromRow) as FavoriteRepo[];
  window.dispatchEvent(new CustomEvent('favorite-repos-changed', { detail: favorites }));
  return { favorites, isFavorite: !currentlyFavorite };
}
