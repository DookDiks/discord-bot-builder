import { describe, it, expect, vi } from "vitest";
import { CommandBuilder } from "../src/commands/CommandBuilder.js";
import { CommandGroupBuilder } from "../src/commands/CommandGroupBuilder.js";
import { CommandRegistry } from "../src/commands/CommandRegistry.js";
import { MessageCommandBuilder } from "../src/commands/MessageCommandBuilder.js";
import {
  UserContextMenuBuilder,
  MessageContextMenuBuilder,
} from "../src/commands/ContextMenuBuilder.js";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

describe("CommandBuilder", () => {
  it("lowercases command name", () => {
    const cmd = new CommandBuilder("Ping", "Pong").execute(async () => {}).build();
    expect(cmd.name).toBe("ping");
  });

  it("builds options of all supported types", () => {
    const cmd = new CommandBuilder("test", "Test")
      .addStringOption("s", "String", { required: true, choices: [{ name: "A", value: "a" }] })
      .addIntegerOption("i", "Int", { minValue: 0, maxValue: 10 })
      .addNumberOption("n", "Num")
      .addBooleanOption("b", "Bool")
      .addUserOption("u", "User")
      .addChannelOption("c", "Channel")
      .addRoleOption("r", "Role")
      .addAttachmentOption("a", "Attach")
      .execute(async () => {})
      .build();

    expect(cmd.options).toHaveLength(8);
    expect(cmd.options![0]).toMatchObject({ type: "string", required: true });
    expect(cmd.options![1]).toMatchObject({ type: "integer", minValue: 0, maxValue: 10 });
  });

  it("applies cooldown, permissions, and location flags", () => {
    const cmd = new CommandBuilder("mod", "Mod")
      .cooldown(10, "guild")
      .permissions({ roleIds: ["admin"] })
      .guildOnly()
      .defer(true)
      .ephemeral()
      .execute(async () => {})
      .build();

    expect(cmd.cooldown).toEqual({ seconds: 10, scope: "guild" });
    expect(cmd.permissions).toEqual({ roleIds: ["admin"] });
    expect(cmd.guildOnly).toBe(true);
    expect(cmd.defer).toBe(true);
    expect(cmd.ephemeral).toBe(true);
  });

  it("supports dmOnly and custom middleware", async () => {
    const mw = vi.fn(async (_ctx, next) => { await next(); });
    const cmd = new CommandBuilder("dm", "DM")
      .dmOnly()
      .use(mw)
      .execute(async () => {})
      .build();

    expect(cmd.dmOnly).toBe(true);
    expect(cmd.middleware).toHaveLength(1);
  });

  it("returns shallow copy on build", () => {
    const builder = new CommandBuilder("x", "X").execute(async () => {});
    const a = builder.build();
    const b = builder.build();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("CommandGroupBuilder", () => {
  it("builds flat subcommands", () => {
    const group = new CommandGroupBuilder("mod", "Moderation")
      .subcommand("ban", "Ban user", (b) =>
        b.addUserOption("user", "Target", { required: true }).execute(async () => {}),
      )
      .subcommand("kick", "Kick user", (b) =>
        b.addUserOption("user", "Target", { required: true }).execute(async () => {}),
      )
      .build();

    expect(group.subcommands).toHaveLength(2);
    expect(group.subcommands!.map((s) => s.name)).toEqual(["ban", "kick"]);
  });

  it("builds nested subcommand groups", () => {
    const group = new CommandGroupBuilder("eco", "Economy")
      .group("wallet", "Wallet ops", (g) =>
        g.subcommand("balance", "Check balance", (b) => b.execute(async () => {}))
          .subcommand("deposit", "Deposit", (b) => b.execute(async () => {})),
      )
      .build();

    const grouped = group.subcommands!.filter((s) => s.group === "wallet");
    expect(grouped).toHaveLength(2);
    expect(grouped.map((s) => s.name)).toEqual(["balance", "deposit"]);
  });

  it("inherits group-level cooldown and middleware", () => {
    const mw = vi.fn(async (_ctx, next) => { await next(); });
    const group = new CommandGroupBuilder("g", "G")
      .cooldown(5)
      .guildOnly()
      .use(mw)
      .subcommand("a", "A", (b) => b.execute(async () => {}))
      .build();

    expect(group.cooldown?.seconds).toBe(5);
    expect(group.guildOnly).toBe(true);
    expect(group.middleware).toHaveLength(1);
  });
});

describe("MessageCommandBuilder", () => {
  it("builds message command with aliases and cooldown", () => {
    const cmd = new MessageCommandBuilder("help", "Help")
      .aliases("h", "?")
      .cooldown(3, "channel")
      .execute(async () => {})
      .build();

    expect(cmd.name).toBe("help");
    expect(cmd.aliases).toEqual(["h", "?"]);
    expect(cmd.cooldown).toEqual({ seconds: 3, scope: "channel" });
  });
});

describe("Context menu builders", () => {
  it("builds user context menu", () => {
    const menu = new UserContextMenuBuilder("Inspect User")
      .permissions({ ownerIds: ["owner"] })
      .execute(async () => {})
      .build();

    expect(menu.name).toBe("Inspect User");
    expect(menu.permissions?.ownerIds).toEqual(["owner"]);
  });

  it("builds message context menu", () => {
    const menu = new MessageContextMenuBuilder("Pin Message")
      .execute(async () => {})
      .build();

    expect(menu.name).toBe("Pin Message");
  });
});

describe("CommandRegistry", () => {
  it("registers and retrieves commands", () => {
    const registry = new CommandRegistry();
    const cmd = new CommandBuilder("ping", "Pong").execute(async () => {}).build();
    registry.register(cmd);
    registry.registerMany([
      new CommandBuilder("pong", "Ping").execute(async () => {}).build(),
    ]);

    expect(registry.getAll()).toHaveLength(2);
    expect(registry.has("ping")).toBe(true);
    expect(registry.get("ping")).toBe(cmd);
  });

  it("registers context menus", () => {
    const registry = new CommandRegistry();
    registry.registerUserContextMenu(new UserContextMenuBuilder("User Info").execute(async () => {}).build());
    registry.registerMessageContextMenu(new MessageContextMenuBuilder("Quote").execute(async () => {}).build());

    expect(registry.getAllContextMenus()).toHaveLength(2);
    expect(registry.getUserContextMenu("User Info")).toBeDefined();
    expect(registry.getMessageContextMenu("Quote")).toBeDefined();
  });

  it("throws when deploy has no guildId or global target", async () => {
    const registry = new CommandRegistry();
    registry.register(new CommandBuilder("ping", "Pong").execute(async () => {}).build());
    await expect(registry.deploy("token", "client-id", {})).rejects.toThrow(
      "Command deploy requires guildId or global:true",
    );
  });

  it("returns early on deploy when registry is empty", async () => {
    const registry = new CommandRegistry();
    await expect(registry.deploy("token", "client-id", { global: true })).resolves.toBeUndefined();
  });

  it("resolveHandler returns null for unknown command", () => {
    const registry = new CommandRegistry();
    const interaction = {
      commandName: "missing",
      options: { getSubcommandGroup: () => null, getSubcommand: () => null },
    } as never;
    expect(registry.resolveHandler(interaction)).toBeNull();
  });

  it("resolveHandler matches subcommand without group", () => {
    const registry = new CommandRegistry();
    const group = new CommandGroupBuilder("mod", "Mod")
      .subcommand("ban", "Ban", (b) => b.execute(async () => {}))
      .build();
    registry.register(group);

    const interaction = {
      commandName: "mod",
      options: {
        getSubcommandGroup: (required?: boolean) => null,
        getSubcommand: (required?: boolean) => "ban",
      },
    } as never;

    const resolved = registry.resolveHandler(interaction);
    expect(resolved?.subcommand?.name).toBe("ban");
    expect(resolved?.subcommandGroup).toBeNull();
  });

  it("extractOptions flattens nested subcommand options", () => {
    const registry = new CommandRegistry();
    const interaction = {
      options: {
        data: [
          {
            name: "wallet",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
              {
                name: "deposit",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                  { name: "amount", type: ApplicationCommandOptionType.Integer, value: 100 },
                ],
              },
            ],
          },
        ],
      },
    } as never;

    expect(registry.extractOptions(interaction)).toEqual({ amount: 100 });
  });

  it("static deployCommands delegates to registry.deploy", async () => {
    const registry = new CommandRegistry();
    await expect(
      CommandRegistry.deployCommands(registry, "t", "c", { global: true }),
    ).resolves.toBeUndefined();
  });
});
