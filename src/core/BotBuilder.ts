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
import type { DatabaseBuilder } from "../database/DatabaseBuilder.js";
import { InteractionRouter } from "./InteractionRouter.js";
import { Logger, defaultLogger } from "../logging/Logger.js";
import type { LoggerBuilder } from "../logging/LoggerBuilder.js";
import { IntentBuilder } from "../utils/intents.js";
import { ConfigurationError } from "../errors/index.js";
import { resolveBuildable, type Buildable } from "../utils/buildable.js";
import type { ConfigBuilder } from "../config/ConfigBuilder.js";
import type { ValidatedBotConfig } from "../config/schema.js";
import type { MiddlewareBuilder } from "../middleware/MiddlewareBuilder.js";
import type { PluginBuilder } from "../plugins/PluginBuilder.js";
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
import type { ButtonHandlerBuilder } from "../components/handler-builders.js";
import type { SelectMenuHandlerBuilder } from "../components/handler-builders.js";
import type { ModalHandlerBuilder } from "../components/handler-builders.js";

type ButtonInput<TDatabase> =
  | ButtonHandlerBuilder<TDatabase>
  | ButtonDefinition<TDatabase>;

type SelectMenuInput<TDatabase> =
  | SelectMenuHandlerBuilder<TDatabase>
  | SelectMenuDefinition<TDatabase>;

type ModalInput<TDatabase> =
  | ModalHandlerBuilder<TDatabase>
  | ModalDefinition<TDatabase>;

type DatabaseInput<TDatabase> =
  | DatabaseBuilder<TDatabase>
  | DatabaseAdapter<TDatabase>;

type LoggerInput = LoggerBuilder | Logger;

type PluginInput<TDatabase> = PluginBuilder<TDatabase> | BotPlugin<TDatabase>;

type ConfigInput = ConfigBuilder | ValidatedBotConfig | BotConfig;

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
  private botLogger: Logger = defaultLogger;

  static create<TDatabase = unknown>(): BotBuilder<TDatabase> {
    return new BotBuilder<TDatabase>();
  }

  token(value: string): this { this.config.token = value; return this; }
  clientId(value: string): this { this.config.clientId = value; return this; }
  guildId(value?: string): this {
    if (value) this.config.guildId = value;
    return this;
  }
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
    this.botLogger.setLevel(level ?? "info");
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

  loggerInstance(logger: LoggerInput): this {
    this.botLogger = resolveBuildable(logger);
    return this;
  }

  logging(builder: LoggerInput): this {
    return this.loggerInstance(builder);
  }

  /** Alias for {@link logging}. */
  withLogger(builder: LoggerInput): this {
    return this.loggerInstance(builder);
  }

  database(adapter: DatabaseInput<TDatabase>): this {
    this.dbAdapter = resolveBuildable(adapter as Buildable<DatabaseAdapter<TDatabase>>);
    return this;
  }

  command(cmd: CommandInput<TDatabase>): this {
    this.commandRegistry.register(resolveBuildable(cmd as Buildable<CommandDefinition<TDatabase>>));
    return this;
  }

  commands(cmds: CommandInput<TDatabase>[]): this {
    for (const cmd of cmds) this.command(cmd);
    return this;
  }

  messageCommand(cmd: MessageCommandBuilder<TDatabase> | MessageCommandDefinition<TDatabase>): this {
    const def = resolveBuildable(cmd);
    this.messageCommands.set(def.name, def);
    for (const alias of def.aliases ?? []) this.messageCommands.set(alias, def);
    return this;
  }

  userContextMenu(menu: UserContextMenuBuilder<TDatabase> | UserContextMenuDefinition<TDatabase>): this {
    this.commandRegistry.registerUserContextMenu(resolveBuildable(menu));
    return this;
  }

  messageContextMenu(menu: MessageContextMenuBuilder<TDatabase> | MessageContextMenuDefinition<TDatabase>): this {
    this.commandRegistry.registerMessageContextMenu(resolveBuildable(menu));
    return this;
  }

  button(def: ButtonInput<TDatabase>): this {
    this.componentRegistry.button(resolveBuildable(def));
    return this;
  }

  selectMenu(def: SelectMenuInput<TDatabase>): this {
    this.componentRegistry.selectMenu(resolveBuildable(def));
    return this;
  }

  modal(def: ModalInput<TDatabase>): this {
    this.componentRegistry.modal(resolveBuildable(def));
    return this;
  }

  event(evt: EventBuilder<TDatabase, string> | EventDefinition<TDatabase>): this {
    this.eventRegistry.register(resolveBuildable(evt as Buildable<EventDefinition<TDatabase>>));
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

  /** Apply a fluent middleware chain from {@link MiddlewareBuilder}. */
  middleware(chain: MiddlewareBuilder<TDatabase> | MiddlewareFn<TDatabase>[]): this {
    const items = Array.isArray(chain) ? chain : chain.build();
    this.globalMiddleware.push(...items);
    return this;
  }

  plugin(plugin: PluginInput<TDatabase>): this {
    this.plugins.push(resolveBuildable(plugin));
    return this;
  }

  /** Load config from {@link ConfigBuilder}, env-validated config, or plain object. */
  configure(config: ConfigInput): this {
    const resolved = resolveBuildable(config as Buildable<ValidatedBotConfig>);
    Object.assign(this.config, resolved);
    if (resolved.logLevel) this.botLogger.setLevel(resolved.logLevel);
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
      logger: this.botLogger,
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
  private pluginsReadyFired = false;

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

    this.logger.info("Bot logged in — waiting for ready event");
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
        if (evt.name === "clientReady" && !this.pluginsReadyFired) {
          this.pluginsReadyFired = true;
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
