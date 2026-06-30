import type { DatabaseAdapter } from "./DatabaseAdapter.js";
import { MemoryAdapter } from "./MemoryAdapter.js";
import { FileAdapter } from "./FileAdapter.js";
import { createAdapter } from "./createAdapter.js";

type AdapterKind = "memory" | "file" | "custom";

/**
 * Fluent builder for database adapters.
 *
 * @example
 * ```ts
 * DatabaseBuilder.create().file("./data.json").build()
 * DatabaseBuilder.create().custom(prisma, { connect, disconnect }).build()
 * ```
 */
export class DatabaseBuilder<TClient = unknown> {
  private kind: AdapterKind = "memory";
  private filePath?: string;
  private customAdapter?: DatabaseAdapter<TClient>;
  private customClient?: TClient;
  private hooks?: { connect: () => Promise<void>; disconnect: () => Promise<void> };

  static create<TClient = unknown>(): DatabaseBuilder<TClient> {
    return new DatabaseBuilder<TClient>();
  }

  static memory(): MemoryAdapter {
    return new MemoryAdapter();
  }

  static file(path: string): FileAdapter {
    return new FileAdapter(path);
  }

  memory(): this {
    this.kind = "memory";
    return this;
  }

  file(path: string): this {
    this.kind = "file";
    this.filePath = path;
    return this;
  }

  adapter(adapter: DatabaseAdapter<TClient>): this {
    this.kind = "custom";
    this.customAdapter = adapter;
    return this;
  }

  custom(
    client: TClient,
    hooks: { connect: () => Promise<void>; disconnect: () => Promise<void> },
  ): this {
    this.kind = "custom";
    this.customClient = client;
    this.hooks = hooks;
    return this;
  }

  build(): DatabaseAdapter<TClient> {
    if (this.kind === "custom") {
      if (this.customAdapter) return this.customAdapter;
      if (this.customClient && this.hooks) {
        return createAdapter(this.customClient, this.hooks);
      }
      throw new Error("Custom database requires .adapter() or .custom(client, hooks).");
    }
    if (this.kind === "file") {
      if (!this.filePath) throw new Error("File database requires .file(path).");
      return new FileAdapter(this.filePath) as unknown as DatabaseAdapter<TClient>;
    }
    return new MemoryAdapter() as unknown as DatabaseAdapter<TClient>;
  }
}
