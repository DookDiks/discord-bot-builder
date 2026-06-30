import { loadConfigFromEnv, validateConfig } from "./schema.js";
import type { ValidatedBotConfig } from "./schema.js";

/**
 * Fluent builder for bot configuration.
 *
 * @example
 * ```ts
 * const config = ConfigBuilder.fromEnv()
 *   .prefix("!")
 *   .ownerIds("123")
 *   .build();
 * ```
 */
export class ConfigBuilder {
  private values: Partial<ValidatedBotConfig> = {};
  private useEnv = false;

  static create(): ConfigBuilder {
    return new ConfigBuilder();
  }

  static fromEnv(overrides: Partial<ValidatedBotConfig> = {}): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder.useEnv = true;
    builder.values = overrides;
    return builder;
  }

  token(value: string): this {
    this.values.token = value;
    return this;
  }

  clientId(value: string): this {
    this.values.clientId = value;
    return this;
  }

  guildId(value: string): this {
    this.values.guildId = value;
    return this;
  }

  prefix(value: string): this {
    this.values.prefix = value;
    return this;
  }

  registerCommandsGlobally(value = true): this {
    this.values.registerCommandsGlobally = value;
    return this;
  }

  deployCommandsOnStart(value = true): this {
    this.values.deployCommandsOnStart = value;
    return this;
  }

  logLevel(level: ValidatedBotConfig["logLevel"]): this {
    this.values.logLevel = level;
    return this;
  }

  gracefulShutdown(value = true): this {
    this.values.gracefulShutdown = value;
    return this;
  }

  ownerIds(...ids: string[]): this {
    this.values.ownerIds = ids;
    return this;
  }

  build(): ValidatedBotConfig {
    if (this.useEnv) {
      return loadConfigFromEnv(this.values);
    }
    return validateConfig(this.values);
  }
}
