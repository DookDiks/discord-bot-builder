import type { MessageCommandDefinition } from "../types/index.js";
import type { MessageContext } from "../types/index.js";

/**
 * Fluent builder for prefix (message) commands.
 */
export class MessageCommandBuilder<TDatabase = unknown> {
  private readonly definition: MessageCommandDefinition<TDatabase>;

  constructor(name: string, description: string) {
    this.definition = {
      name: name.toLowerCase(),
      description,
      aliases: [],
      execute: async () => {
        throw new Error(`Message command "${name}" has no execute handler.`);
      },
    };
  }

  /** Add command aliases. */
  aliases(...names: string[]): this {
    this.definition.aliases = names.map((n) => n.toLowerCase());
    return this;
  }

  cooldown(seconds: number, scope: "user" | "guild" | "channel" = "user"): this {
    this.definition.cooldown = { seconds, scope };
    return this;
  }

  execute(handler: (ctx: MessageContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): MessageCommandDefinition<TDatabase> {
    return { ...this.definition };
  }

  get name(): string {
    return this.definition.name;
  }
}
