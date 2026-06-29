import { DatabaseAdapter } from "./DatabaseAdapter.js";

/**
 * Wrap any external database client in a DatabaseAdapter.
 *
 * @example Prisma
 * ```ts
 * const adapter = createAdapter(prisma, {
 *   connect: () => prisma.$connect(),
 *   disconnect: () => prisma.$disconnect(),
 * });
 * ```
 */
export function createAdapter<TClient>(
  client: TClient,
  hooks: {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
  },
): DatabaseAdapter<TClient> {
  return new (class extends DatabaseAdapter<TClient> {
    constructor() {
      super();
      this.client = client;
    }

    async connect(): Promise<void> {
      await hooks.connect();
    }

    async disconnect(): Promise<void> {
      await hooks.disconnect();
      this.client = null;
    }
  })();
}
