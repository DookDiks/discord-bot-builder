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
  ButtonStyle,
  TextInputStyle,
} from "./components/index.js";

// Database
export { DatabaseAdapter, MemoryAdapter, FileAdapter, createAdapter } from "./database/index.js";

// Config
export { botConfigSchema, loadConfigFromEnv, validateConfig } from "./config/index.js";
export type { ValidatedBotConfig } from "./config/index.js";

// Logging
export { Logger, defaultLogger } from "./logging/Logger.js";
export type { LogLevel, LoggerOptions } from "./logging/Logger.js";

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
} from "./middleware/index.js";

// Utilities
export { IntentBuilder } from "./utils/intents.js";
export { EmbedBuilder } from "./utils/embeds.js";
export { sendPaginator } from "./utils/pagination.js";
export { checkPermissions } from "./utils/permissions.js";
export { CooldownManager } from "./utils/CooldownManager.js";

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
