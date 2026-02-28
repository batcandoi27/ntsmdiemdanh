/**
 * Simple In-Memory TTL Cache cho Next.js server actions.
 * Lưu ý: Cache này tồn tại trong memory của Node process.
 * Hợp lý nhất cho danh sách các dữ liệu ít thay đổi: Classes, Students...
 */

type CacheEntry<T> = {
    data: T;
    expiry: number;
};

const cache = new Map<string, CacheEntry<any>>();

// Mặc định cache 5 phút
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
    }

    return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const expiry = Date.now() + ttlMs;
    cache.set(key, { data, expiry });
}

export function invalidateCachePrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
        if (key.startsWith(prefix)) {
            keysToDelete.push(key);
        }
    });

    keysToDelete.forEach(key => cache.delete(key));
}

export function invalidateCache(key: string): void {
    cache.delete(key);
}

export function clearAllCache(): void {
    cache.clear();
}
