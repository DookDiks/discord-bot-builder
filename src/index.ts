/**
 * discord-bot-builder — Production-ready OOP Discord bot framework.
 */

// Core
export { BotBuilder, BuiltBot } from "./core/BotBuilder.js";
export { InteractionRouter } from "./core/InteractionRouter.js";

// Commands
export {
  CommandBuilder,
  CommandGroupBuilder,
  SubcommandBuilder,
  MessageCommandBuilder,
  UserContextMenuBuilder,
  MessageContextMenuBuilder,
  CommandRegistry,
} from "./commands/index.js";

// Events
export { EventBuilder, EventRegistry } from "./events/index.js";

// Components
export {
  ComponentRegistry,
  ButtonRowBuilder,
  SelectMenuRowBuilder,
  ModalFormBuilder,
  ButtonHandlerBuilder,
  SelectMenuHandlerBuilder,
  ModalHandlerBuilder,
  ButtonStyle,
  TextInputStyle,
} from "./components/index.js";

// Database
export {
  DatabaseAdapter,
  MemoryAdapter,
  FileAdapter,
  createAdapter,
  DatabaseBuilder,
} from "./database/index.js";

// Config
export {
  botConfigSchema,
  loadConfigFromEnv,
  validateConfig,
  ConfigBuilder,
} from "./config/index.js";
export type { ValidatedBotConfig } from "./config/index.js";

// Logging
export { Logger, defaultLogger } from "./logging/Logger.js";
export { LoggerBuilder } from "./logging/LoggerBuilder.js";
export type { LogLevel, LoggerOptions } from "./logging/Logger.js";

// Plugins
export { PluginBuilder } from "./plugins/index.js";

// Errors
export {
  BotError,
  ConfigurationError,
  CommandExecutionError,
  PermissionDeniedError,
  DatabaseError,
  InteractionError,
} from "./errors/index.js";

// Middleware
export {
  runMiddleware,
  HaltError,
  loggerMiddleware,
  errorHandlerMiddleware,
  ownerOnlyMiddleware,
  deferMiddleware,
  MiddlewareBuilder,
} from "./middleware/index.js";

// Utilities
export { IntentBuilder } from "./utils/intents.js";
export { EmbedBuilder } from "./utils/embeds.js";
export { sendPaginator } from "./utils/pagination.js";
export { PaginatorBuilder } from "./utils/PaginatorBuilder.js";
export { checkPermissions, PermissionBuilder } from "./utils/permissions.js";
export { CooldownManager } from "./utils/CooldownManager.js";
export { CooldownBuilder } from "./utils/CooldownBuilder.js";
export { resolveBuildable, type Buildable } from "./utils/buildable.js";

// Types
export type {
  BotConfig,
  BotServices,
  BotPlugin,
  BotHealth,
  CommandContext,
  AutocompleteContext,
  MessageContext,
  EventContext,
  ButtonContext,
  SelectMenuContext,
  ModalContext,
  UserContextMenuContext,
  MessageContextMenuContext,
  CommandDefinition,
  SubcommandDefinition,
  MessageCommandDefinition,
  EventDefinition,
  UserContextMenuDefinition,
  MessageContextMenuDefinition,
  ButtonDefinition,
  SelectMenuDefinition,
  ModalDefinition,
  CommandOptionDef,
  CooldownConfig,
  PermissionConfig,
  MiddlewareFn,
  MiddlewareResult,
  CommandOptions,
} from "./types/index.js";
