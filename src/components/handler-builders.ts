import type {
  ButtonContext,
  ButtonDefinition,
  ModalContext,
  ModalDefinition,
  SelectMenuContext,
  SelectMenuDefinition,
} from "../types/index.js";

/**
 * Fluent builder for button interaction handlers.
 *
 * @example
 * ```ts
 * new ButtonHandlerBuilder("confirm")
 *   .prefix()
 *   .execute(async (ctx) => { ... })
 * ```
 */
export class ButtonHandlerBuilder<TDatabase = unknown> {
  private readonly definition: ButtonDefinition<TDatabase>;

  constructor(customId: string) {
    this.definition = {
      customId,
      execute: async () => {
        throw new Error(`Button handler "${customId}" has no execute handler.`);
      },
    };
  }

  static create<TDatabase = unknown>(customId: string): ButtonHandlerBuilder<TDatabase> {
    return new ButtonHandlerBuilder<TDatabase>(customId);
  }

  /** Match any customId starting with `customId:` (e.g. `confirm:delete`). */
  prefix(enabled = true): this {
    this.definition.prefix = enabled;
    return this;
  }

  execute(handler: (ctx: ButtonContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): ButtonDefinition<TDatabase> {
    return { ...this.definition };
  }

  get customId(): string {
    return this.definition.customId;
  }
}

/**
 * Fluent builder for string select menu interaction handlers.
 */
export class SelectMenuHandlerBuilder<TDatabase = unknown> {
  private readonly definition: SelectMenuDefinition<TDatabase>;

  constructor(customId: string) {
    this.definition = {
      customId,
      execute: async () => {
        throw new Error(`Select menu handler "${customId}" has no execute handler.`);
      },
    };
  }

  static create<TDatabase = unknown>(customId: string): SelectMenuHandlerBuilder<TDatabase> {
    return new SelectMenuHandlerBuilder<TDatabase>(customId);
  }

  prefix(enabled = true): this {
    this.definition.prefix = enabled;
    return this;
  }

  execute(handler: (ctx: SelectMenuContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): SelectMenuDefinition<TDatabase> {
    return { ...this.definition };
  }
}

/**
 * Fluent builder for modal submit interaction handlers.
 */
export class ModalHandlerBuilder<TDatabase = unknown> {
  private readonly definition: ModalDefinition<TDatabase>;

  constructor(customId: string) {
    this.definition = {
      customId,
      execute: async () => {
        throw new Error(`Modal handler "${customId}" has no execute handler.`);
      },
    };
  }

  static create<TDatabase = unknown>(customId: string): ModalHandlerBuilder<TDatabase> {
    return new ModalHandlerBuilder<TDatabase>(customId);
  }

  prefix(enabled = true): this {
    this.definition.prefix = enabled;
    return this;
  }

  execute(handler: (ctx: ModalContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): ModalDefinition<TDatabase> {
    return { ...this.definition };
  }
}
