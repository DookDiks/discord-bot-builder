import { describe, it, expect } from "vitest";
import {
  BotError,
  ConfigurationError,
  CommandExecutionError,
  PermissionDeniedError,
  DatabaseError,
  InteractionError,
} from "../src/errors/index.js";

describe("Error classes", () => {
  it("BotError stores code and original cause", () => {
    const cause = new Error("root");
    const err = new BotError("failed", "TEST_CODE", cause);
    expect(err.message).toBe("failed");
    expect(err.code).toBe("TEST_CODE");
    expect(err.originalCause).toBe(cause);
    expect(err.name).toBe("BotError");
    expect(err).toBeInstanceOf(Error);
  });

  it("ConfigurationError uses CONFIGURATION_ERROR code", () => {
    const err = new ConfigurationError("bad config");
    expect(err.code).toBe("CONFIGURATION_ERROR");
    expect(err.name).toBe("ConfigurationError");
    expect(err).toBeInstanceOf(BotError);
  });

  it("CommandExecutionError stores command name", () => {
    const err = new CommandExecutionError("boom", "ping");
    expect(err.commandName).toBe("ping");
    expect(err.code).toBe("COMMAND_EXECUTION_ERROR");
  });

  it("PermissionDeniedError stores command name", () => {
    const err = new PermissionDeniedError("denied", "admin");
    expect(err.commandName).toBe("admin");
    expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("DatabaseError wraps cause", () => {
    const err = new DatabaseError("db fail", "io");
    expect(err.code).toBe("DATABASE_ERROR");
    expect(err.originalCause).toBe("io");
  });

  it("InteractionError stores customId", () => {
    const err = new InteractionError("bad button", "btn:1");
    expect(err.customId).toBe("btn:1");
    expect(err.code).toBe("INTERACTION_ERROR");
  });
});
