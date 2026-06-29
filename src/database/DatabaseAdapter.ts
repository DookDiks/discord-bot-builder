/**
 * Abstract database adapter — implement for Prisma, Drizzle, MongoDB, etc.
 */
export abstract class DatabaseAdapter<TClient = unknown> {
  protected client: TClient | null = null;

  /** Connect to the database. Called automatically on bot start. */
  abstract connect(): Promise<void>;

  /** Disconnect from the database. Called on bot shutdown. */
  abstract disconnect(): Promise<void>;

  /** Return the underlying database client. */
  getClient(): TClient {
    if (!this.client) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.client;
  }

  /** Whether the adapter is currently connected. */
  isConnected(): boolean {
    return this.client !== null;
  }
}
