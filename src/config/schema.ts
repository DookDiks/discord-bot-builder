import { z } from "zod";
import { ConfigurationError } from "../errors/index.js";

export const botConfigSchema = z.object({
  token: z.string().min(1, "DISCORD_TOKEN is required"),
  clientId: z.string().min(1, "CLIENT_ID is required"),
  guildId: z.string().optional(),
  prefix: z.string().default("!"),
  registerCommandsGlobally: z.boolean().default(false),
  deployCommandsOnStart: z.boolean().default(true),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  gracefulShutdown: z.boolean().default(true),
  ownerIds: z.array(z.string()).default([]),
});

export type ValidatedBotConfig = z.infer<typeof botConfigSchema>;

const ENV_MAP = {
  token: ["DISCORD_TOKEN", "BOT_TOKEN"],
  clientId: ["CLIENT_ID", "DISCORD_CLIENT_ID"],
  guildId: ["GUILD_ID", "DISCORD_GUILD_ID"],
  prefix: ["BOT_PREFIX"],
  registerCommandsGlobally: ["REGISTER_COMMANDS_GLOBALLY"],
  deployCommandsOnStart: ["DEPLOY_COMMANDS_ON_START"],
  logLevel: ["LOG_LEVEL"],
  gracefulShutdown: ["GRACEFUL_SHUTDOWN"],
  ownerIds: ["BOT_OWNER_IDS"],
} as const;

function readEnv(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const val = process.env[key];
    if (val !== undefined && val !== "") return val;
  }
  return undefined;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

/**
 * Load and validate bot configuration from environment variables.
 */
export function loadConfigFromEnv(overrides: Partial<ValidatedBotConfig> = {}): ValidatedBotConfig {
  const raw = {
    token: overrides.token ?? readEnv(ENV_MAP.token),
    clientId: overrides.clientId ?? readEnv(ENV_MAP.clientId),
    guildId: overrides.guildId ?? readEnv(ENV_MAP.guildId),
    prefix: overrides.prefix ?? readEnv(ENV_MAP.prefix) ?? "!",
    registerCommandsGlobally: overrides.registerCommandsGlobally ??
      parseBool(readEnv(ENV_MAP.registerCommandsGlobally), false),
    deployCommandsOnStart: overrides.deployCommandsOnStart ??
      parseBool(readEnv(ENV_MAP.deployCommandsOnStart), true),
    logLevel: overrides.logLevel ??
      (readEnv(ENV_MAP.logLevel) as ValidatedBotConfig["logLevel"] | undefined) ??
      "info",
    gracefulShutdown: overrides.gracefulShutdown ??
      parseBool(readEnv(ENV_MAP.gracefulShutdown), true),
    ownerIds: overrides.ownerIds ??
      readEnv(ENV_MAP.ownerIds)?.split(",").map((s) => s.trim()).filter(Boolean) ??
      [],
  };

  const result = botConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join("; ");
    throw new ConfigurationError(`Invalid configuration: ${messages}`, result.error);
  }
  return result.data;
}

/**
 * Validate a partial config object.
 */
export function validateConfig(config: unknown): ValidatedBotConfig {
  const result = botConfigSchema.safeParse(config);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join("; ");
    throw new ConfigurationError(`Invalid configuration: ${messages}`, result.error);
  }
  return result.data;
}
