interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCache<T>(key: string, ttlMinutes = 5): T | null {
  try {
    const item = localStorage.getItem(`cache_${key}`);
    if (!item) return null;
    const entry: CacheEntry<T> = JSON.parse(item);
    if (Date.now() - entry.timestamp > ttlMinutes * 60 * 1000) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    return entry.data;
  } catch { return null; }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch { /* ignore */ }
}

export function clearCache(prefix?: string): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('cache_' + (prefix || '')))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
