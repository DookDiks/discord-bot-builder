import { Logger, type LogLevel } from "./Logger.js";

/**
 * Fluent builder for structured bot logging.
 */
export class LoggerBuilder {
  private logLevel: LogLevel = "info";
  private logPrefix = "discord-bot-builder";
  private useTimestamps = true;

  static create(): LoggerBuilder {
    return new LoggerBuilder();
  }

  static production(name: string): LoggerBuilder {
    return new LoggerBuilder().withPrefix(name).withLevel("info");
  }

  static debug(name: string): LoggerBuilder {
    return new LoggerBuilder().withPrefix(name).withLevel("debug");
  }

  withLevel(value: LogLevel): this {
    this.logLevel = value;
    return this;
  }

  withPrefix(value: string): this {
    this.logPrefix = value;
    return this;
  }

  timestamps(enabled = true): this {
    this.useTimestamps = enabled;
    return this;
  }

  build(): Logger {
    return new Logger({
      level: this.logLevel,
      prefix: this.logPrefix,
      timestamp: this.useTimestamps,
    });
  }
}
