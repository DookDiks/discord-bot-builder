import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "../src/logging/Logger.js";

describe("Logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("respects log level filtering", () => {
    const logger = new Logger({ level: "warn", timestamp: false });
    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("includes prefix and level in output", () => {
    const logger = new Logger({ level: "info", prefix: "test-bot", timestamp: false });
    logger.info("hello");
    expect(logSpy).toHaveBeenCalledWith("[INFO] [test-bot] hello");
  });

  it("passes meta object as second argument", () => {
    const logger = new Logger({ level: "info", timestamp: false });
    logger.info("evt", { id: 1 });
    expect(logSpy).toHaveBeenCalledWith("[INFO] [discord-bot-builder] evt", { id: 1 });
  });

  it("setLevel changes filtering at runtime", () => {
    const logger = new Logger({ level: "error", timestamp: false });
    logger.warn("hidden");
    logger.setLevel("warn");
    logger.warn("visible");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("child logger extends prefix", () => {
    const parent = new Logger({ level: "info", prefix: "bot", timestamp: false });
    parent.child("router").info("routed");
    expect(logSpy).toHaveBeenCalledWith("[INFO] [bot:router] routed");
  });
});
