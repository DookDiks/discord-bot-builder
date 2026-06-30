import type { BotPlugin, BotServices } from "../types/index.js";
import type { BotBuilder } from "../core/BotBuilder.js";

/**
 * Fluent builder for bot plugins with lifecycle hooks.
 */
export class PluginBuilder<TDatabase = unknown> {
  private readonly name: string;
  private setupFn: (builder: BotBuilder<TDatabase>) => void | Promise<void> = async () => {};
  private onReadyFn?: (services: BotServices<TDatabase>) => void | Promise<void>;
  private onStartFn?: (services: BotServices<TDatabase>) => void | Promise<void>;
  private onStopFn?: (services: BotServices<TDatabase>) => void | Promise<void>;

  constructor(name: string) {
    this.name = name;
  }

  static create<TDatabase = unknown>(name: string): PluginBuilder<TDatabase> {
    return new PluginBuilder<TDatabase>(name);
  }

  setup(handler: (builder: BotBuilder<TDatabase>) => void | Promise<void>): this {
    this.setupFn = handler;
    return this;
  }

  onReady(handler: (services: BotServices<TDatabase>) => void | Promise<void>): this {
    this.onReadyFn = handler;
    return this;
  }

  onStart(handler: (services: BotServices<TDatabase>) => void | Promise<void>): this {
    this.onStartFn = handler;
    return this;
  }

  onStop(handler: (services: BotServices<TDatabase>) => void | Promise<void>): this {
    this.onStopFn = handler;
    return this;
  }

  build(): BotPlugin<TDatabase> {
    return {
      name: this.name,
      setup: this.setupFn,
      onReady: this.onReadyFn,
      onStart: this.onStartFn,
      onStop: this.onStopFn,
    };
  }
}
