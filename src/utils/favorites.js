const STORAGE_KEY = 'zzapbang_favorites';
export const MAX_FAVORITES = 20;

export function favoriteKey(r) {
  return [r.date, r.apartment, r.dong, r.floor, r.area, r.deposit].join('|');
}

export function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveFavorites(favs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs.slice(0, MAX_FAVORITES)));
}
