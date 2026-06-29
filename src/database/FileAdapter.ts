import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseAdapter } from "./DatabaseAdapter.js";
import { DatabaseError } from "../errors/index.js";

interface FileStore {
  [key: string]: unknown;
}

/**
 * JSON file-backed key-value store for lightweight persistence.
 * Suitable for small bots; use createAdapter() with Prisma for production scale.
 */
export class FileAdapter extends DatabaseAdapter<FileStore> {
  private readonly filePath: string;
  private data: FileStore = {};

  constructor(filePath: string) {
    super();
    this.filePath = resolve(filePath);
  }

  async connect(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (existsSync(this.filePath)) {
      try {
        const raw = readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw) as FileStore;
      } catch (err) {
        throw new DatabaseError(`Failed to read database file: ${this.filePath}`, err);
      }
    } else {
      this.data = {};
      await this.flush();
    }
    this.client = this.data;
  }

  async disconnect(): Promise<void> {
    await this.flush();
    this.client = null;
  }

  async flush(): Promise<void> {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      throw new DatabaseError(`Failed to write database file: ${this.filePath}`, err);
    }
  }

  get<T>(key: string): T | undefined {
    return this.getClient()[key] as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.getClient()[key] = value;
    void this.flush();
  }

  delete(key: string): boolean {
    const existed = key in this.getClient();
    delete this.getClient()[key];
    void this.flush();
    return existed;
  }

  has(key: string): boolean {
    return key in this.getClient();
  }

  keys(prefix?: string): string[] {
    const all = Object.keys(this.getClient());
    if (!prefix) return all;
    return all.filter((k) => k.startsWith(prefix));
  }
}
