import { describe, it, expect, vi } from "vitest";
import { BotBuilder } from "../src/core/BotBuilder.js";
import { CommandBuilder } from "../src/commands/CommandBuilder.js";
import { MessageCommandBuilder } from "../src/commands/MessageCommandBuilder.js";
import { EventBuilder } from "../src/events/EventBuilder.js";
import { UserContextMenuBuilder } from "../src/commands/ContextMenuBuilder.js";
import { MemoryAdapter } from "../src/database/MemoryAdapter.js";
import { Logger } from "../src/logging/Logger.js";
import { IntentBuilder } from "../src/utils/intents.js";
import { ConfigurationError } from "../src/errors/index.js";

describe("BotBuilder", () => {
  it("builds bot with required config", async () => {
    const bot = await new BotBuilder()
      .token("test-token")
      .clientId("client-123")
      .command(new CommandBuilder("ping", "Pong").execute(async () => {}))
      .build();

    expect(bot.commandRegistry.has("ping")).toBe(true);
    expect(bot.discord).toBeDefined();
    expect(bot.serviceContainer.db).toBeDefined();
  });

  it("throws ConfigurationError without token", async () => {
    await expect(new BotBuilder().clientId("c").build()).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError without clientId", async () => {
    await expect(new BotBuilder().token("t").build()).rejects.toThrow(ConfigurationError);
  });

  it("registers message commands and aliases", async () => {
    const builder = new BotBuilder()
      .token("t")
      .clientId("c")
      .messageCommand(
        new MessageCommandBuilder("help", "Help").aliases("h").execute(async () => {}),
      );

    const bot = await builder.build();
    expect(bot.commandRegistry).toBeDefined();
  });

  it("registers context menus, components, and events", async () => {
    const builder = new BotBuilder()
      .token("t")
      .clientId("c")
      .userContextMenu(new UserContextMenuBuilder("Info").execute(async () => {}))
      .button({ customId: "ok", execute: async () => {} })
      .selectMenu({ customId: "pick", execute: async () => {} })
      .modal({ customId: "form", execute: async () => {} })
      .event(new EventBuilder("messageCreate").execute(async () => {}))
      .onReady(async () => {});

    const bot = await builder.build();
    expect(bot.commandRegistry.getAllContextMenus()).toHaveLength(1);
  });

  it("applies fluent config options", async () => {
    const customLogger = new Logger({ prefix: "custom" });
    const adapter = new MemoryAdapter();

    const bot = await new BotBuilder()
      .token("t")
      .clientId("c")
      .guildId("g")
      .prefix("?")
      .ownerIds("o1")
      .registerCommandsGlobally(true)
      .deployCommandsOnStart(false)
      .logLevel("debug")
      .gracefulShutdown(false)
      .intents(IntentBuilder.all())
      .loggerInstance(customLogger)
      .database(adapter)
      .configure({
        token: "t2",
        clientId: "c2",
        prefix: "!",
      })
      .build();

    expect(bot.getHealth().status).toBe("stopped");
    expect(bot.getHealth().commands).toBe(0);
  });

  it("runs plugin setup during build", async () => {
    const setup = vi.fn();
    await new BotBuilder()
      .token("t")
      .clientId("c")
      .plugin({ name: "test", setup })
      .build();

    expect(setup).toHaveBeenCalled();
  });

  it("getCommandRegistry exposes registry", async () => {
    const builder = new BotBuilder()
      .token("t")
      .clientId("c")
      .command(new CommandBuilder("ping", "Pong").execute(async () => {}));

    expect(builder.getCommandRegistry().has("ping")).toBe(true);
  });

  it("getHealth reports initial stopped state", async () => {
    const bot = await new BotBuilder().token("t").clientId("c").build();
    const health = bot.getHealth();
    expect(health.status).toBe("stopped");
    expect(health.uptime).toBe(0);
    expect(health.databaseConnected).toBe(true);
    expect(health.startedAt).toBeNull();
  });
});

describe("BuiltBot lifecycle guards", () => {
  it("start throws when already started", async () => {
    const bot = await new BotBuilder()
      .token("t")
      .clientId("c")
      .deployCommandsOnStart(false)
      .build();

    const login = vi.spyOn(bot.discord, "login").mockResolvedValue("token");
    await bot.start();
    await expect(bot.start()).rejects.toThrow("Bot is already started.");
    login.mockRestore();
    await bot.stop();
  });

  it("stop is no-op when not started", async () => {
    const bot = await new BotBuilder().token("t").clientId("c").build();
    await expect(bot.stop()).resolves.toBeUndefined();
  });
});
