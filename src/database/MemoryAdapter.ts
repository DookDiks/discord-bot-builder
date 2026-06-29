import { DatabaseAdapter } from "./DatabaseAdapter.js";

type MemoryStore = Map<string, unknown>;

/**
 * In-memory database adapter for development and testing.
 * Data is lost on restart.
 */
export class MemoryAdapter extends DatabaseAdapter<MemoryStore> {
  constructor() {
    super();
    this.client = new Map();
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.client = new Map();
    }
  }

  async disconnect(): Promise<void> {
    this.client?.clear();
    this.client = null;
  }

  /** Get a value by key. */
  get<T>(key: string): T | undefined {
    return this.getClient().get(key) as T | undefined;
  }

  /** Set a value by key. */
  set<T>(key: string, value: T): void {
    this.getClient().set(key, value);
  }

  /** Delete a key. */
  delete(key: string): boolean {
    return this.getClient().delete(key);
  }

  /** Check if a key exists. */
  has(key: string): boolean {
    return this.getClient().has(key);
  }

  /** Get all keys matching a prefix. */
  keys(prefix?: string): string[] {
    const all = [...this.getClient().keys()];
    if (!prefix) return all;
    return all.filter((k) => k.startsWith(prefix));
  }

  /** Clear all data. */
  clear(): void {
    this.getClient().clear();
  }
}
