/**
 * Persistent Client-Side Cache using localStorage.
 * Giúp UI hiển thị tức thì (Optimistic UI) cho trải nghiệm nhanh.
 */

const IS_BROWSER = typeof window !== 'undefined';

export function getLocalCache<T>(key: string): T | null {
    if (!IS_BROWSER) return null;
    try {
        const item = localStorage.getItem(`app_cache_${key}`);
        if (!item) return null;
        const entry = JSON.parse(item);
        
        // TTL mặc định 24h cho dữ liệu danh mục
        if (entry.expiry && Date.now() > entry.expiry) {
            localStorage.removeItem(`app_cache_${key}`);
            return null;
        }
        return entry.data;
    } catch (e) {
        return null;
    }
}

export function setLocalCache<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): void {
    if (!IS_BROWSER) return;
    try {
        const entry = {
            data,
            expiry: Date.now() + ttlMs,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`app_cache_${key}`, JSON.stringify(entry));
    } catch (e) {
        console.error('Cache write failed', e);
    }
}

export function invalidateLocalCache(key: string): void {
    if (!IS_BROWSER) return;
    localStorage.removeItem(`app_cache_${key}`);
}

export function clearLocalCache(): void {
    if (!IS_BROWSER) return;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('app_cache_')) {
            localStorage.removeItem(key);
        }
    });
}
