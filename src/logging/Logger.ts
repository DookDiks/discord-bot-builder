export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const REDACT_KEY_PATTERN = /^(token|authorization|secret|password|api[_-]?key)$/i;
const REDACTED = "[REDACTED]";

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

/**
 * Structured logger for bot runtime output.
 */
export class Logger {
  private level: LogLevel;
  private readonly prefix: string;
  private readonly timestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "info";
    this.prefix = options.prefix ?? "discord-bot-builder";
    this.timestamp = options.timestamp ?? true;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix}:${prefix}`,
      timestamp: this.timestamp,
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return;

    const parts: string[] = [];
    if (this.timestamp) parts.push(new Date().toISOString());
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(`[${this.prefix}]`);
    parts.push(message);

    const line = parts.join(" ");
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    const safeMeta = meta ? (redactMeta(meta) as Record<string, unknown>) : undefined;
    if (safeMeta && Object.keys(safeMeta).length > 0) {
      fn(line, safeMeta);
    } else {
      fn(line);
    }
  }
}

function redactMeta(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactMeta);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = REDACT_KEY_PATTERN.test(key) ? REDACTED : redactMeta(nested);
    }
    return result;
  }
  return value;
}

export const defaultLogger = new Logger();
