import { describe, it, expect, vi } from "vitest";
import {
  ButtonHandlerBuilder,
  SelectMenuHandlerBuilder,
  ModalHandlerBuilder,
} from "../src/components/handler-builders.js";
import { ConfigBuilder } from "../src/config/ConfigBuilder.js";
import { LoggerBuilder } from "../src/logging/LoggerBuilder.js";
import { DatabaseBuilder } from "../src/database/DatabaseBuilder.js";
import { MiddlewareBuilder } from "../src/middleware/MiddlewareBuilder.js";
import { PluginBuilder } from "../src/plugins/PluginBuilder.js";
import { PaginatorBuilder } from "../src/utils/PaginatorBuilder.js";
import { PermissionBuilder } from "../src/utils/permissions.js";
import { CooldownBuilder } from "../src/utils/CooldownBuilder.js";
import { BotBuilder } from "../src/core/BotBuilder.js";
import { CommandBuilder } from "../src/commands/CommandBuilder.js";
import { MessageCommandBuilder } from "../src/commands/MessageCommandBuilder.js";
import { PermissionFlagsBits } from "discord.js";

describe("ButtonHandlerBuilder", () => {
  it("builds prefix button handler", () => {
    const handler = vi.fn();
    const def = ButtonHandlerBuilder.create("action").prefix().execute(handler).build();
    expect(def.customId).toBe("action");
    expect(def.prefix).toBe(true);
    expect(def.execute).toBe(handler);
  });
});

describe("SelectMenuHandlerBuilder", () => {
  it("builds select menu handler", () => {
    const def = SelectMenuHandlerBuilder.create("menu").execute(vi.fn()).build();
    expect(def.customId).toBe("menu");
  });
});

describe("ModalHandlerBuilder", () => {
  it("builds modal handler", () => {
    const def = ModalHandlerBuilder.create("form").execute(vi.fn()).build();
    expect(def.customId).toBe("form");
  });
});

describe("ConfigBuilder", () => {
  it("builds config from values", () => {
    const config = ConfigBuilder.create()
      .token("t")
      .clientId("c")
      .prefix("?")
      .ownerIds("o1")
      .build();
    expect(config.token).toBe("t");
    expect(config.prefix).toBe("?");
    expect(config.ownerIds).toEqual(["o1"]);
  });
});

describe("LoggerBuilder", () => {
  it("builds configured logger", () => {
    const logger = LoggerBuilder.production("my-bot").withLevel("warn").timestamps(false).build();
    expect(logger).toBeDefined();
  });
});

describe("DatabaseBuilder", () => {
  it("builds memory adapter by default", () => {
    const db = DatabaseBuilder.create().build();
    expect(db.isConnected()).toBe(true);
  });

  it("builds file adapter", () => {
    const db = DatabaseBuilder.create().file("/tmp/test.json").build();
    expect(db).toBeDefined();
  });
});

describe("MiddlewareBuilder", () => {
  it("builds default middleware chain", () => {
    const chain = MiddlewareBuilder.defaults().owners("123").build();
    expect(chain.length).toBeGreaterThanOrEqual(3);
  });
});

describe("PluginBuilder", () => {
  it("builds plugin with hooks", async () => {
    const setup = vi.fn();
    const plugin = PluginBuilder.create("test").setup(setup).build();
    const builder = new BotBuilder().token("t").clientId("c");
    await plugin.setup(builder);
    expect(setup).toHaveBeenCalled();
    expect(plugin.name).toBe("test");
  });
});

describe("PaginatorBuilder", () => {
  it("builds paginator options", () => {
    const opts = PaginatorBuilder.create()
      .page("A")
      .page("B")
      .timeout(5000)
      .forUser("u1")
      .buildOptions();
    expect(opts.pages).toHaveLength(2);
    expect(opts.timeout).toBe(5000);
    expect(opts.userId).toBe("u1");
  });
});

describe("PermissionBuilder", () => {
  it("builds permission config with flags", () => {
    const perms = PermissionBuilder.create()
      .roles("admin")
      .member(PermissionFlagsBits.BanMembers)
      .bot("ManageMessages")
      .owners("owner1")
      .build();
    expect(perms.roleIds).toEqual(["admin"]);
    expect(perms.ownerIds).toEqual(["owner1"]);
    expect(perms.memberPermissions?.length).toBe(1);
  });
});

describe("CooldownBuilder", () => {
  it("builds cooldown config", () => {
    expect(CooldownBuilder.ofSeconds(10).perGuild().build()).toEqual({
      seconds: 10,
      scope: "guild",
    });
  });
});

describe("BotBuilder integration", () => {
  it("accepts all builder types", async () => {
    const bot = await BotBuilder.create()
      .configure(ConfigBuilder.create().token("t").clientId("c"))
      .logging(LoggerBuilder.create().withPrefix("bot"))
      .database(DatabaseBuilder.create().memory())
      .middleware(MiddlewareBuilder.create().log())
      .plugin(PluginBuilder.create("p"))
      .button(ButtonHandlerBuilder.create("x").execute(vi.fn()))
      .command(
        new CommandBuilder("ping", "Pong")
          .permissions(PermissionBuilder.role("mod"))
          .cooldownConfig(CooldownBuilder.ofSeconds(5))
          .execute(vi.fn()),
      )
      .messageCommand(
        new MessageCommandBuilder("help", "Help")
          .permissions(PermissionBuilder.owner("o1"))
          .guildOnly()
          .execute(vi.fn()),
      )
      .build();

    expect(bot.commandRegistry.has("ping")).toBe(true);
  });
});
