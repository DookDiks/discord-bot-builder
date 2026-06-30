import { describe, it, expect, vi } from "vitest";
import { InteractionRouter } from "../src/core/InteractionRouter.js";
import { CommandRegistry } from "../src/commands/CommandRegistry.js";
import { ComponentRegistry } from "../src/components/ComponentRegistry.js";
import { CommandBuilder } from "../src/commands/CommandBuilder.js";
import { CommandGroupBuilder } from "../src/commands/CommandGroupBuilder.js";
import { MessageCommandBuilder } from "../src/commands/MessageCommandBuilder.js";
import type { BotServices } from "../src/types/index.js";

type RouterInternals = {
  handleInteraction: (interaction: unknown) => Promise<void>;
  handleMessageCommand: (message: unknown, prefix: string) => Promise<void>;
};

function createRouter(overrides: {
  commands?: CommandRegistry;
  messageCommands?: Map<string, ReturnType<MessageCommandBuilder["build"]>>;
  components?: ComponentRegistry;
  ownerIds?: string[];
} = {}) {
  const commandRegistry = overrides.commands ?? new CommandRegistry();
  const componentRegistry = overrides.components ?? new ComponentRegistry();
  const messageCommands = overrides.messageCommands ?? new Map();
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

  const client = {
    on: vi.fn(),
    once: vi.fn(),
  };

  const services = {
    db: { connect: vi.fn(), disconnect: vi.fn(), isConnected: () => true },
    client,
    logger,
  } as unknown as BotServices;

  const router = new InteractionRouter({
    client: client as never,
    services,
    commandRegistry,
    messageCommands,
    componentRegistry,
    globalMiddleware: [],
    ownerIds: overrides.ownerIds ?? [],
    logger: logger as never,
  });

  return { router, client, logger, commandRegistry, componentRegistry, messageCommands, services };
}

describe("InteractionRouter", () => {
  it("wire registers interactionCreate handler", () => {
    const { router, client } = createRouter();
    router.wire();
    expect(client.on).toHaveBeenCalledWith("interactionCreate", expect.any(Function));
  });

  it("wireMessages registers messageCreate handler", () => {
    const { router, client } = createRouter();
    router.wireMessages("!");
    expect(client.on).toHaveBeenCalledWith("messageCreate", expect.any(Function));
  });

  it("clearCooldowns allows command reuse after reset", async () => {
    const execute = vi.fn();
    const registry = new CommandRegistry();
    registry.register(new CommandBuilder("slow", "Slow").cooldown(60).execute(execute).build());

    const { router } = createRouter({ commands: registry });
    const interaction = makeSlashInteraction("slow");

    await dispatchInteraction(router, interaction);
    expect(execute).toHaveBeenCalledTimes(1);

    await dispatchInteraction(router, { ...interaction, reply: vi.fn() });
    expect(execute).toHaveBeenCalledTimes(1);

    router.clearCooldowns();
    await dispatchInteraction(router, { ...interaction, reply: vi.fn() });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

async function dispatchInteraction(router: InteractionRouter, interaction: unknown): Promise<void> {
  await (router as unknown as RouterInternals).handleInteraction(interaction);
}

async function dispatchMessage(router: InteractionRouter, message: unknown, prefix = "!"): Promise<void> {
  await (router as unknown as RouterInternals).handleMessageCommand(message, prefix);
}

function makeSlashInteraction(commandName: string, overrides: Record<string, unknown> = {}) {
  return {
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    isUserContextMenuCommand: () => false,
    isMessageContextMenuCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    commandName,
    user: { id: "u1", tag: "u#1" },
    guildId: "g1",
    channelId: "c1",
    guild: { name: "G" },
    member: null,
    deferred: false,
    replied: false,
    options: { getSubcommandGroup: () => null, getSubcommand: () => null, data: [] },
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    followUp: vi.fn(),
    ...overrides,
  };
}

describe("InteractionRouter slash commands", () => {
  it("executes simple slash command", async () => {
    const execute = vi.fn();
    const registry = new CommandRegistry();
    registry.register(new CommandBuilder("ping", "Pong").execute(execute).build());

    const { router } = createRouter({ commands: registry });
    await dispatchInteraction(router, makeSlashInteraction("ping"));

    expect(execute).toHaveBeenCalled();
  });

  it("blocks guildOnly command in DMs", async () => {
    const execute = vi.fn();
    const registry = new CommandRegistry();
    registry.register(
      new CommandBuilder("guild", "Guild").guildOnly().execute(execute).build(),
    );

    const { router } = createRouter({ commands: registry });
    const reply = vi.fn();
    await dispatchInteraction(
      router,
      makeSlashInteraction("guild", { guild: null, guildId: null, channelId: "dm", reply }),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This command can only be used in a server.", ephemeral: true }),
    );
  });

  it("enforces cooldown on repeated use", async () => {
    const execute = vi.fn();
    const registry = new CommandRegistry();
    registry.register(
      new CommandBuilder("slow", "Slow").cooldown(30).execute(execute).build(),
    );

    const { router } = createRouter({ commands: registry });
    const baseInteraction = makeSlashInteraction("slow");

    await dispatchInteraction(router, baseInteraction);
    expect(execute).toHaveBeenCalledTimes(1);

    const reply = vi.fn();
    await dispatchInteraction(router, { ...baseInteraction, reply });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("Please wait") }));
  });

  it("requires subcommand when group has subcommands", async () => {
    const registry = new CommandRegistry();
    registry.register(
      new CommandGroupBuilder("mod", "Mod")
        .subcommand("ban", "Ban", (b) => b.execute(vi.fn()))
        .build(),
    );

    const { router } = createRouter({ commands: registry });
    const reply = vi.fn();
    await dispatchInteraction(router, makeSlashInteraction("mod", { reply }));

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Please specify a subcommand." }),
    );
  });

  it("replies with error when handler throws before reply", async () => {
    const registry = new CommandRegistry();
    registry.register(
      new CommandBuilder("boom", "Boom")
        .execute(async () => {
          throw new Error("handler failed");
        })
        .build(),
    );

    const { router, logger } = createRouter({ commands: registry });
    const reply = vi.fn();
    await dispatchInteraction(router, makeSlashInteraction("boom", { reply }));

    expect(logger.error).toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Something went wrong.", ephemeral: true }),
    );
  });

  it("editReplies with error when handler throws after defer", async () => {
    const registry = new CommandRegistry();
    registry.register(
      new CommandBuilder("boom", "Boom")
        .defer()
        .execute(async () => {
          throw new Error("handler failed");
        })
        .build(),
    );

    const { router } = createRouter({ commands: registry });
    const editReply = vi.fn().mockResolvedValue(undefined);
    const interaction = makeSlashInteraction("boom", {
      deferred: false,
      replied: false,
      editReply,
      deferReply: vi.fn().mockImplementation(async () => {
        interaction.deferred = true;
      }),
    });
    await dispatchInteraction(router, interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Something went wrong." }),
    );
  });
});

describe("InteractionRouter components", () => {
  it("routes button interactions to registry handler", async () => {
    const execute = vi.fn();
    const components = new ComponentRegistry();
    components.button({ customId: "go", execute });

    const { router } = createRouter({ components });
    await dispatchInteraction(router, {
      isAutocomplete: () => false,
      isChatInputCommand: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      customId: "go",
      user: { id: "u1" },
      member: null,
      reply: vi.fn(),
      update: vi.fn(),
      deferUpdate: vi.fn(),
    });

    expect(execute).toHaveBeenCalled();
  });

  it("routes modal submit with parsed fields", async () => {
    const execute = vi.fn();
    const components = new ComponentRegistry();
    components.modal({ customId: "signup", execute });

    const { router } = createRouter({ components });
    await dispatchInteraction(router, {
      isAutocomplete: () => false,
      isChatInputCommand: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isModalSubmit: () => true,
      customId: "signup",
      user: { id: "u1" },
      member: null,
      fields: {
        fields: new Map([["name", { value: "Alice" }]]),
      },
      reply: vi.fn(),
      deferReply: vi.fn(),
    });

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ fields: { name: "Alice" } }),
    );
  });
});

describe("InteractionRouter message commands", () => {
  it("executes prefix command with args", async () => {
    const execute = vi.fn();
    const def = new MessageCommandBuilder("echo", "Echo").execute(execute).build();
    const messageCommands = new Map([[def.name, def]]);

    const { router } = createRouter({ messageCommands });
    const reply = vi.fn();
    await dispatchMessage(router, {
      author: { bot: false, id: "u1" },
      content: "!echo hello world",
      guild: { id: "g1" },
      guildId: "g1",
      channelId: "c1",
      member: null,
      reply,
    });

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ args: ["hello", "world"] }));
  });

  it("ignores bot messages and wrong prefix", async () => {
    const execute = vi.fn();
    const messageCommands = new Map([
      ["ping", new MessageCommandBuilder("ping", "Ping").execute(execute).build()],
    ]);

    const { router } = createRouter({ messageCommands });
    await dispatchMessage(router, { author: { bot: true }, content: "!ping" });
    await dispatchMessage(router, { author: { bot: false }, content: "?ping" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("denies message command when guildOnly in DMs", async () => {
    const execute = vi.fn();
    const def = new MessageCommandBuilder("ban", "Ban")
      .execute(execute)
      .build();
    (def as { guildOnly?: boolean }).guildOnly = true;
    const messageCommands = new Map([[def.name, def]]);

    const { router } = createRouter({ messageCommands });
    const reply = vi.fn();
    await dispatchMessage(router, {
      author: { bot: false, id: "u1" },
      content: "!ban",
      guild: null,
      guildId: null,
      channelId: "c1",
      member: null,
      reply,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith("This command can only be used in a server.");
  });
});
