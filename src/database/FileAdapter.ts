import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from "node:fs";
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
  private writeChain: Promise<void> = Promise.resolve();

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
    await this.queueWrite(() => this.writeToDisk());
  }

  get<T>(key: string): T | undefined {
    return this.getClient()[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.getClient()[key] = value;
    await this.queueWrite(() => this.writeToDisk());
  }

  async delete(key: string): Promise<boolean> {
    const existed = key in this.getClient();
    delete this.getClient()[key];
    await this.queueWrite(() => this.writeToDisk());
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

  private async queueWrite(write: () => void): Promise<void> {
    const task = this.writeChain.then(write);
    this.writeChain = task.catch(() => undefined);
    await task;
  }

  private writeToDisk(): void {
    const tmpPath = `${this.filePath}.tmp`;
    try {
      writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), "utf-8");
      renameSync(tmpPath, this.filePath);
    } catch (err) {
      if (existsSync(tmpPath)) {
        try {
          unlinkSync(tmpPath);
        } catch {
          // best-effort cleanup
        }
      }
      throw new DatabaseError(`Failed to write database file: ${this.filePath}`, err);
    }
  }
}
