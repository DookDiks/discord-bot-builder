import type { EventDefinition } from "../types/index.js";
import type { EventContext } from "../types/index.js";

/**
 * Fluent builder for Discord client events.
 */
export class EventBuilder<TDatabase = unknown, TEvent extends string = string> {
  private readonly definition: EventDefinition<TDatabase, TEvent>;

  constructor(name: TEvent) {
    this.definition = {
      name,
      once: false,
      execute: async () => {
        throw new Error(`Event "${name}" has no execute handler.`);
      },
    };
  }

  /** Run handler only once. */
  once(): this {
    this.definition.once = true;
    return this;
  }

  execute(handler: (ctx: EventContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): EventDefinition<TDatabase, TEvent> {
    return { ...this.definition };
  }

  get name(): TEvent {
    return this.definition.name;
  }
}
