import {
  Client,
  Partials,
  type BitFieldResolvable,
  type GatewayIntentsString,
} from "discord.js";
import { CommandRegistry } from "../commands/CommandRegistry.js";
import { EventRegistry } from "../events/EventRegistry.js";
import { ComponentRegistry } from "../components/ComponentRegistry.js";
import type { DatabaseAdapter } from "../database/DatabaseAdapter.js";
import { MemoryAdapter } from "../database/MemoryAdapter.js";
import { InteractionRouter } from "./InteractionRouter.js";
import { Logger, defaultLogger } from "../logging/Logger.js";
import { IntentBuilder } from "../utils/intents.js";
import { ConfigurationError } from "../errors/index.js";
import type {
  BotConfig,
  BotHealth,
  BotPlugin,
  BotServices,
  CommandDefinition,
  EventDefinition,
  MessageCommandDefinition,
  MiddlewareFn,
  UserContextMenuDefinition,
  MessageContextMenuDefinition,
} from "../types/index.js";
import type { CommandBuilder } from "../commands/CommandBuilder.js";
import type { CommandGroupBuilder } from "../commands/CommandGroupBuilder.js";
import type { MessageCommandBuilder } from "../commands/MessageCommandBuilder.js";
import type { EventBuilder } from "../events/EventBuilder.js";
import type { UserContextMenuBuilder, MessageContextMenuBuilder } from "../commands/ContextMenuBuilder.js";
import type { ButtonDefinition, ModalDefinition, SelectMenuDefinition } from "../types/index.js";

type CommandInput<TDatabase> =
  | CommandBuilder<TDatabase>
  | CommandGroupBuilder<TDatabase>
  | CommandDefinition<TDatabase>;

/**
 * Main entry point — fluent OOP builder for production Discord bots.
 */
export class BotBuilder<TDatabase = unknown> {
  private config: Partial<BotConfig> = {};
  private dbAdapter: DatabaseAdapter<TDatabase> = new MemoryAdapter() as unknown as DatabaseAdapter<TDatabase>;
  private readonly commandRegistry = new CommandRegistry<TDatabase>();
  private readonly eventRegistry = new EventRegistry<TDatabase>();
  private readonly componentRegistry = new ComponentRegistry<TDatabase>();
  private readonly messageCommands = new Map<string, MessageCommandDefinition<TDatabase>>();
  private globalMiddleware: MiddlewareFn<TDatabase>[] = [];
  private plugins: BotPlugin<TDatabase>[] = [];
  private intentBuilder = IntentBuilder.default();
  private logger: Logger = defaultLogger;

  token(value: string): this { this.config.token = value; return this; }
  clientId(value: string): this { this.config.clientId = value; return this; }
  guildId(value: string): this { this.config.guildId = value; return this; }
  prefix(value: string): this { this.config.prefix = value; return this; }
  ownerIds(...ids: string[]): this { this.config.ownerIds = ids; return this; }

  registerCommandsGlobally(value = true): this {
    this.config.registerCommandsGlobally = value;
    return this;
  }

  deployCommandsOnStart(value = true): this {
    this.config.deployCommandsOnStart = value;
    return this;
  }

  logLevel(level: BotConfig["logLevel"]): this {
    this.config.logLevel = level;
    this.logger.setLevel(level ?? "info");
    return this;
  }

  gracefulShutdown(value = true): this {
    this.config.gracefulShutdown = value;
    return this;
  }

  intents(builder: IntentBuilder): this {
    this.intentBuilder = builder;
    return this;
  }

  loggerInstance(logger: Logger): this {
    this.logger = logger;
    return this;
  }

  database(adapter: DatabaseAdapter<TDatabase>): this {
    this.dbAdapter = adapter;
    return this;
  }

  command(cmd: CommandInput<TDatabase>): this {
    const def = "build" in cmd ? cmd.build() : cmd;
    this.commandRegistry.register(def as CommandDefinition);
    return this;
  }

  commands(cmds: CommandInput<TDatabase>[]): this {
    for (const cmd of cmds) this.command(cmd);
    return this;
  }

  messageCommand(cmd: MessageCommandBuilder<TDatabase> | MessageCommandDefinition<TDatabase>): this {
    const def = "build" in cmd ? cmd.build() : cmd;
    this.messageCommands.set(def.name, def);
    for (const alias of def.aliases ?? []) this.messageCommands.set(alias, def);
    return this;
  }

  userContextMenu(menu: UserContextMenuBuilder<TDatabase> | UserContextMenuDefinition<TDatabase>): this {
    const def = "build" in menu ? menu.build() : menu;
    this.commandRegistry.registerUserContextMenu(def);
    return this;
  }

  messageContextMenu(menu: MessageContextMenuBuilder<TDatabase> | MessageContextMenuDefinition<TDatabase>): this {
    const def = "build" in menu ? menu.build() : menu;
    this.commandRegistry.registerMessageContextMenu(def);
    return this;
  }

  button(def: ButtonDefinition<TDatabase>): this {
    this.componentRegistry.button(def);
    return this;
  }

  selectMenu(def: SelectMenuDefinition<TDatabase>): this {
    this.componentRegistry.selectMenu(def);
    return this;
  }

  modal(def: ModalDefinition<TDatabase>): this {
    this.componentRegistry.modal(def);
    return this;
  }

  event(evt: EventBuilder<TDatabase, string> | EventDefinition<TDatabase>): this {
    const def = "build" in evt ? evt.build() : evt;
    this.eventRegistry.register(def as EventDefinition);
    return this;
  }

  onReady(handler: (ctx: import("../types/index.js").EventContext<TDatabase>) => Promise<void>): this {
    this.eventRegistry.register({ name: "clientReady", once: true, execute: handler });
    return this;
  }

  use(middleware: MiddlewareFn<TDatabase>): this {
    this.globalMiddleware.push(middleware);
    return this;
  }

  plugin(plugin: BotPlugin<TDatabase>): this {
    this.plugins.push(plugin);
    return this;
  }

  /** Load config from validated BotConfig object. */
  configure(config: BotConfig): this {
    Object.assign(this.config, config);
    if (config.logLevel) this.logger.setLevel(config.logLevel);
    return this;
  }

  getCommandRegistry(): CommandRegistry<TDatabase> {
    return this.commandRegistry;
  }

  async build(): Promise<BuiltBot<TDatabase>> {
    for (const p of this.plugins) {
      await p.setup(this);
    }

    if (!this.config.token) throw new ConfigurationError("Bot token is required. Call .token()");
    if (!this.config.clientId) throw new ConfigurationError("Client ID is required. Call .clientId()");

    const config: BotConfig = {
      token: this.config.token,
      clientId: this.config.clientId,
      guildId: this.config.guildId,
      prefix: this.config.prefix ?? "!",
      registerCommandsGlobally: this.config.registerCommandsGlobally ?? false,
      deployCommandsOnStart: this.config.deployCommandsOnStart ?? true,
      logLevel: this.config.logLevel ?? "info",
      gracefulShutdown: this.config.gracefulShutdown ?? true,
      ownerIds: this.config.ownerIds ?? [],
    };

    return new BuiltBot({
      config,
      database: this.dbAdapter,
      commandRegistry: this.commandRegistry,
      eventRegistry: this.eventRegistry,
      componentRegistry: this.componentRegistry,
      messageCommands: this.messageCommands,
      globalMiddleware: this.globalMiddleware,
      plugins: this.plugins,
      intents: this.intentBuilder.build(),
      logger: this.logger,
    });
  }
}

interface BuiltBotOptions<TDatabase> {
  config: BotConfig;
  database: DatabaseAdapter<TDatabase>;
  commandRegistry: CommandRegistry<TDatabase>;
  eventRegistry: EventRegistry<TDatabase>;
  componentRegistry: ComponentRegistry<TDatabase>;
  messageCommands: Map<string, MessageCommandDefinition<TDatabase>>;
  globalMiddleware: MiddlewareFn<TDatabase>[];
  plugins: BotPlugin<TDatabase>[];
  intents: BitFieldResolvable<GatewayIntentsString, number>;
  logger: Logger;
}

/**
 * Production-ready runnable Discord bot instance.
 */
export class BuiltBot<TDatabase = unknown> {
  private readonly client: Client;
  private readonly services: BotServices<TDatabase>;
  private readonly router: InteractionRouter<TDatabase>;
  private readonly logger: Logger;
  private started = false;
  private startedAt: Date | null = null;
  private healthStatus: BotHealth["status"] = "stopped";
  private shutdownHandlers: Array<() => void> = [];

  constructor(private readonly options: BuiltBotOptions<TDatabase>) {
    this.logger = options.logger.child("bot");
    this.client = new Client({
      intents: options.intents,
      partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
    });

    this.services = {
      db: options.database,
      client: this.client,
      logger: this.logger,
    };

    this.router = new InteractionRouter({
      client: this.client,
      services: this.services,
      commandRegistry: options.commandRegistry,
      messageCommands: options.messageCommands,
      componentRegistry: options.componentRegistry,
      globalMiddleware: options.globalMiddleware,
      ownerIds: options.config.ownerIds ?? [],
      logger: this.logger,
    });

    this.wireEvents();
    this.router.wire();
    this.router.wireMessages(options.config.prefix ?? "!");
  }

  get discord(): Client { return this.client; }
  get serviceContainer(): BotServices<TDatabase> { return this.services; }
  get commandRegistry(): CommandRegistry<TDatabase> { return this.options.commandRegistry; }

  getHealth(): BotHealth {
    return {
      status: this.healthStatus,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      commands: this.options.commandRegistry.getAll().length,
      databaseConnected: this.options.database.isConnected(),
      startedAt: this.startedAt,
    };
  }

  /** Deploy slash commands without starting the bot. */
  async deployCommands(): Promise<void> {
    const { config, commandRegistry } = this.options;
    await commandRegistry.deploy(config.token, config.clientId, {
      guildId: config.guildId,
      global: config.registerCommandsGlobally && !config.guildId,
    });
    this.logger.info("Commands deployed", { count: commandRegistry.getAll().length });
  }

  async start(): Promise<void> {
    if (this.started) throw new ConfigurationError("Bot is already started.");
    this.healthStatus = "starting";
    this.logger.info("Starting bot...");

    await this.options.database.connect();
    this.logger.info("Database connected");

    if (this.options.config.deployCommandsOnStart !== false) {
      await this.deployCommands();
    }

    await this.client.login(this.options.config.token);
    this.started = true;
    this.startedAt = new Date();
    this.healthStatus = "ready";

    for (const p of this.options.plugins) {
      if (p.onStart) await p.onStart(this.services);
    }

    if (this.options.config.gracefulShutdown !== false) {
      this.registerShutdownHandlers();
    }

    this.logger.info("Bot started", { user: this.client.user?.tag });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.healthStatus = "stopping";
    this.logger.info("Stopping bot...");

    for (const p of this.options.plugins) {
      if (p.onStop) await p.onStop(this.services);
    }

    for (const handler of this.shutdownHandlers) handler();
    this.router.clearCooldowns();
    await this.options.database.disconnect();
    this.client.destroy();
    this.started = false;
    this.healthStatus = "stopped";
    this.logger.info("Bot stopped");
  }

  private wireEvents(): void {
    for (const evt of this.options.eventRegistry.getAll()) {
      const handler = async (...args: unknown[]) => {
        await evt.execute({ client: this.client, services: this.services, args });
        if (evt.name === "clientReady") {
          for (const p of this.options.plugins) {
            if (p.onReady) await p.onReady(this.services);
          }
        }
      };
      if (evt.once) this.client.once(evt.name, handler);
      else this.client.on(evt.name, handler);
    }
  }

  private registerShutdownHandlers(): void {
    const shutdown = (): void => {
      void this.stop().then(() => process.exit(0));
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    this.shutdownHandlers.push(() => {
      process.removeListener("SIGINT", shutdown);
      process.removeListener("SIGTERM", shutdown);
    });
  }
}
