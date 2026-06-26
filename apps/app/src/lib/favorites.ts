export const FAVORITE_REPOS_STORAGE_KEY = 'work_hub_favorite_repos_v1';

export type FavoriteRepo = {
  owner: string;
  name: string;
  nameWithOwner: string;
  url?: string;
  description?: string | null;
};

function normalize(repo: FavoriteRepo): FavoriteRepo {
  return {
    ...repo,
    owner: repo.owner.trim(),
    name: repo.name.trim(),
    nameWithOwner: repo.nameWithOwner.trim(),
  };
}

export function loadFavoriteRepos(): FavoriteRepo[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITE_REPOS_STORAGE_KEY) ?? '[]') as FavoriteRepo[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((repo) => repo.owner && repo.name && repo.nameWithOwner);
  } catch {
    localStorage.removeItem(FAVORITE_REPOS_STORAGE_KEY);
    return [];
  }
}

export function saveFavoriteRepos(repos: FavoriteRepo[]) {
  localStorage.setItem(FAVORITE_REPOS_STORAGE_KEY, JSON.stringify(repos));
  window.dispatchEvent(new CustomEvent('favorite-repos-changed', { detail: repos }));
}

export function isFavoriteRepo(repo: Pick<FavoriteRepo, 'owner' | 'name'>, favorites = loadFavoriteRepos()) {
  return favorites.some((favorite) => favorite.owner === repo.owner && favorite.name === repo.name);
}

export function toggleFavoriteRepo(repo: FavoriteRepo) {
  const nextRepo = normalize(repo);
  const favorites = loadFavoriteRepos();
  const exists = isFavoriteRepo(nextRepo, favorites);
  const next = exists
    ? favorites.filter((favorite) => favorite.owner !== nextRepo.owner || favorite.name !== nextRepo.name)
    : [nextRepo, ...favorites];
  saveFavoriteRepos(next);
  return { favorites: next, isFavorite: !exists };
}
