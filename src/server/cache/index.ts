interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache<K, V> {
  private store: Map<K, CacheEntry<V>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 600000) {
    this.defaultTTL = defaultTTL;
  }

  set(key: K, value: V, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.store.set(key, { value, expiresAt });
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  deleteByPattern(predicate: (key: K) => boolean): number {
    let deleted = 0;
    for (const key of this.store.keys()) {
      if (predicate(key)) {
        this.store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }
}
