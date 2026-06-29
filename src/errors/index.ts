/** Base error for all discord-bot-builder errors. */
export class BotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalCause?: unknown,
  ) {
    super(message);
    this.name = "BotError";
  }
}

export class ConfigurationError extends BotError {
  constructor(message: string, cause?: unknown) {
    super(message, "CONFIGURATION_ERROR", cause);
    this.name = "ConfigurationError";
  }
}

export class CommandExecutionError extends BotError {
  constructor(
    message: string,
    public readonly commandName: string,
    cause?: unknown,
  ) {
    super(message, "COMMAND_EXECUTION_ERROR", cause);
    this.name = "CommandExecutionError";
  }
}

export class PermissionDeniedError extends BotError {
  constructor(
    message: string,
    public readonly commandName: string,
  ) {
    super(message, "PERMISSION_DENIED");
    this.name = "PermissionDeniedError";
  }
}

export class DatabaseError extends BotError {
  constructor(message: string, cause?: unknown) {
    super(message, "DATABASE_ERROR", cause);
    this.name = "DatabaseError";
  }
}

export class InteractionError extends BotError {
  constructor(
    message: string,
    public readonly customId?: string,
    cause?: unknown,
  ) {
    super(message, "INTERACTION_ERROR", cause);
    this.name = "InteractionError";
  }
}
