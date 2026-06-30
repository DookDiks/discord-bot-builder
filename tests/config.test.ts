import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfigFromEnv, validateConfig, botConfigSchema } from "../src/config/schema.js";
import { ConfigurationError } from "../src/errors/index.js";

const ENV_KEYS = [
  "DISCORD_TOKEN",
  "BOT_TOKEN",
  "CLIENT_ID",
  "DISCORD_CLIENT_ID",
  "GUILD_ID",
  "DISCORD_GUILD_ID",
  "BOT_PREFIX",
  "REGISTER_COMMANDS_GLOBALLY",
  "DEPLOY_COMMANDS_ON_START",
  "LOG_LEVEL",
  "GRACEFUL_SHUTDOWN",
  "BOT_OWNER_IDS",
] as const;

describe("validateConfig", () => {
  it("validates minimal config with defaults", () => {
    const config = validateConfig({ token: "test-token", clientId: "123456" });
    expect(config.token).toBe("test-token");
    expect(config.clientId).toBe("123456");
    expect(config.prefix).toBe("!");
    expect(config.registerCommandsGlobally).toBe(false);
    expect(config.deployCommandsOnStart).toBe(true);
    expect(config.logLevel).toBe("info");
    expect(config.gracefulShutdown).toBe(true);
    expect(config.ownerIds).toEqual([]);
  });

  it("accepts full config object", () => {
    const config = validateConfig({
      token: "t",
      clientId: "c",
      guildId: "g",
      prefix: "?",
      registerCommandsGlobally: true,
      deployCommandsOnStart: false,
      logLevel: "debug",
      gracefulShutdown: false,
      ownerIds: ["o1", "o2"],
    });

    expect(config).toMatchObject({
      guildId: "g",
      prefix: "?",
      registerCommandsGlobally: true,
      deployCommandsOnStart: false,
      logLevel: "debug",
      gracefulShutdown: false,
      ownerIds: ["o1", "o2"],
    });
  });

  it("throws ConfigurationError on missing token", () => {
    expect(() => validateConfig({ clientId: "123" })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError on missing clientId", () => {
    expect(() => validateConfig({ token: "t" })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError on empty token", () => {
    expect(() => validateConfig({ token: "", clientId: "c" })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError on invalid log level", () => {
    expect(() => validateConfig({ token: "t", clientId: "c", logLevel: "trace" })).toThrow(ConfigurationError);
  });
});

describe("loadConfigFromEnv", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("loads DISCORD_TOKEN and CLIENT_ID", () => {
    process.env.DISCORD_TOKEN = "env-token";
    process.env.CLIENT_ID = "env-client";
    const config = loadConfigFromEnv();
    expect(config.token).toBe("env-token");
    expect(config.clientId).toBe("env-client");
  });

  it("falls back to BOT_TOKEN and DISCORD_CLIENT_ID", () => {
    delete process.env.DISCORD_TOKEN;
    process.env.BOT_TOKEN = "bot-token";
    process.env.DISCORD_CLIENT_ID = "discord-client";
    const config = loadConfigFromEnv();
    expect(config.token).toBe("bot-token");
    expect(config.clientId).toBe("discord-client");
  });

  it("parses boolean env vars", () => {
    process.env.DISCORD_TOKEN = "t";
    process.env.CLIENT_ID = "c";
    process.env.REGISTER_COMMANDS_GLOBALLY = "true";
    process.env.DEPLOY_COMMANDS_ON_START = "0";
    process.env.GRACEFUL_SHUTDOWN = "off";

    const config = loadConfigFromEnv();
    expect(config.registerCommandsGlobally).toBe(true);
    expect(config.deployCommandsOnStart).toBe(false);
    expect(config.gracefulShutdown).toBe(false);
  });

  it("parses owner ids from comma-separated env", () => {
    process.env.DISCORD_TOKEN = "t";
    process.env.CLIENT_ID = "c";
    process.env.BOT_OWNER_IDS = " owner1 , owner2 , ";
    expect(loadConfigFromEnv().ownerIds).toEqual(["owner1", "owner2"]);
  });

  it("applies overrides over env", () => {
    process.env.DISCORD_TOKEN = "env";
    process.env.CLIENT_ID = "env";
    const config = loadConfigFromEnv({ token: "override", prefix: ">" });
    expect(config.token).toBe("override");
    expect(config.prefix).toBe(">");
  });

  it("throws ConfigurationError when required env missing", () => {
    delete process.env.DISCORD_TOKEN;
    delete process.env.BOT_TOKEN;
    delete process.env.CLIENT_ID;
    delete process.env.DISCORD_CLIENT_ID;
    expect(() => loadConfigFromEnv()).toThrow(ConfigurationError);
  });
});

describe("botConfigSchema", () => {
  it("strips unknown keys by default", () => {
    const result = botConfigSchema.safeParse({
      token: "t",
      clientId: "c",
      extra: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("extra" in result.data).toBe(false);
    }
  });
});
