import type { EventDefinition } from "../types/index.js";

/**
 * Registry for Discord client events.
 */
export class EventRegistry<TDatabase = unknown> {
  private readonly events = new Map<string, EventDefinition<TDatabase>>();

  register<T extends string>(event: EventDefinition<TDatabase, T>): this {
    this.events.set(event.name, event);
    return this;
  }

  registerMany(events: EventDefinition<TDatabase>[]): this {
    for (const evt of events) {
      this.register(evt);
    }
    return this;
  }

  get(name: string): EventDefinition<TDatabase> | undefined {
    return this.events.get(name);
  }

  getAll(): EventDefinition<TDatabase>[] {
    return [...this.events.values()];
  }
}
