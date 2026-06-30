import type { CooldownConfig } from "../types/index.js";

/**
 * Fluent builder for command cooldowns.
 */
export class CooldownBuilder {
  private durationSeconds = 3;
  private scope: CooldownConfig["scope"] = "user";

  static create(): CooldownBuilder {
    return new CooldownBuilder();
  }

  static ofSeconds(seconds: number): CooldownBuilder {
    return new CooldownBuilder().duration(seconds);
  }

  duration(value: number): this {
    this.durationSeconds = value;
    return this;
  }

  perUser(): this {
    this.scope = "user";
    return this;
  }

  perGuild(): this {
    this.scope = "guild";
    return this;
  }

  perChannel(): this {
    this.scope = "channel";
    return this;
  }

  build(): CooldownConfig {
    return { seconds: this.durationSeconds, scope: this.scope };
  }
}
