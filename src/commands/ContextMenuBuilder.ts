import type {
  MessageContextMenuDefinition,
  PermissionConfig,
  UserContextMenuDefinition,
} from "../types/index.js";
import type { MessageContextMenuContext, UserContextMenuContext } from "../types/index.js";

/** Builder for user context menu commands (right-click user). */
export class UserContextMenuBuilder<TDatabase = unknown> {
  private readonly definition: UserContextMenuDefinition<TDatabase>;

  constructor(name: string) {
    this.definition = {
      name,
      execute: async () => {
        throw new Error(`User context menu "${name}" has no execute handler.`);
      },
    };
  }

  permissions(config: PermissionConfig): this {
    this.definition.permissions = config;
    return this;
  }

  execute(handler: (ctx: UserContextMenuContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): UserContextMenuDefinition<TDatabase> {
    return { ...this.definition };
  }

  get name(): string {
    return this.definition.name;
  }
}

/** Builder for message context menu commands (right-click message). */
export class MessageContextMenuBuilder<TDatabase = unknown> {
  private readonly definition: MessageContextMenuDefinition<TDatabase>;

  constructor(name: string) {
    this.definition = {
      name,
      execute: async () => {
        throw new Error(`Message context menu "${name}" has no execute handler.`);
      },
    };
  }

  permissions(config: PermissionConfig): this {
    this.definition.permissions = config;
    return this;
  }

  execute(handler: (ctx: MessageContextMenuContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): MessageContextMenuDefinition<TDatabase> {
    return { ...this.definition };
  }

  get name(): string {
    return this.definition.name;
  }
}
