import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  Message,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  User,
  UserContextMenuCommandInteraction,
} from "discord.js";
import type { DatabaseAdapter } from "../database/DatabaseAdapter.js";
import type { Logger } from "../logging/Logger.js";

/** Parsed option values from a slash command, keyed by option name. */
export type CommandOptions = Record<string, unknown>;

/** Services injected into every handler context. */
export interface BotServices<TDatabase = unknown> {
  db: DatabaseAdapter<TDatabase>;
  client: Client;
  logger: Logger;
}

/** Context passed to slash command handlers. */
export interface CommandContext<TDatabase = unknown> {
  interaction: ChatInputCommandInteraction;
  user: User;
  member: GuildMember | null;
  options: CommandOptions;
  subcommand: string | null;
  subcommandGroup: string | null;
  services: BotServices<TDatabase>;
  reply: ChatInputCommandInteraction["reply"];
  deferReply: ChatInputCommandInteraction["deferReply"];
  editReply: ChatInputCommandInteraction["editReply"];
  followUp: ChatInputCommandInteraction["followUp"];
}

/** Context for autocomplete handlers. */
export interface AutocompleteContext<TDatabase = unknown> {
  interaction: AutocompleteInteraction;
  user: User;
  member: GuildMember | null;
  focusedOption: string;
  focusedValue: string;
  services: BotServices<TDatabase>;
  respond: AutocompleteInteraction["respond"];
}

/** Context passed to message (prefix) command handlers. */
export interface MessageContext<TDatabase = unknown> {
  message: Message;
  user: User;
  member: GuildMember | null;
  args: string[];
  services: BotServices<TDatabase>;
  reply: Message["reply"];
}

/** Context passed to event handlers. */
export interface EventContext<TDatabase = unknown, TArgs extends unknown[] = unknown[]> {
  client: Client;
  services: BotServices<TDatabase>;
  args: TArgs;
}

/** Context for button interactions. */
export interface ButtonContext<TDatabase = unknown> {
  interaction: ButtonInteraction;
  user: User;
  member: GuildMember | null;
  customId: string;
  services: BotServices<TDatabase>;
  reply: ButtonInteraction["reply"];
  update: ButtonInteraction["update"];
  deferUpdate: ButtonInteraction["deferUpdate"];
}

/** Context for string select menu interactions. */
export interface SelectMenuContext<TDatabase = unknown> {
  interaction: StringSelectMenuInteraction;
  user: User;
  member: GuildMember | null;
  customId: string;
  values: string[];
  services: BotServices<TDatabase>;
  reply: StringSelectMenuInteraction["reply"];
  update: StringSelectMenuInteraction["update"];
  deferUpdate: StringSelectMenuInteraction["deferUpdate"];
}

/** Context for modal submit interactions. */
export interface ModalContext<TDatabase = unknown> {
  interaction: ModalSubmitInteraction;
  user: User;
  member: GuildMember | null;
  customId: string;
  fields: Record<string, string>;
  services: BotServices<TDatabase>;
  reply: ModalSubmitInteraction["reply"];
  deferReply: ModalSubmitInteraction["deferReply"];
}

/** Context for user context menu commands. */
export interface UserContextMenuContext<TDatabase = unknown> {
  interaction: UserContextMenuCommandInteraction;
  user: User;
  targetUser: User;
  member: GuildMember | null;
  services: BotServices<TDatabase>;
  reply: UserContextMenuCommandInteraction["reply"];
}

/** Context for message context menu commands. */
export interface MessageContextMenuContext<TDatabase = unknown> {
  interaction: MessageContextMenuCommandInteraction;
  user: User;
  targetMessage: Message;
  member: GuildMember | null;
  services: BotServices<TDatabase>;
  reply: MessageContextMenuCommandInteraction["reply"];
}

/** Result of middleware — continue chain or short-circuit. */
export type MiddlewareResult = void | { halt: true; reason?: string };

/** Middleware function signature. */
export type MiddlewareFn<TDatabase = unknown> = (
  ctx: CommandContext<TDatabase>,
  next: () => Promise<void>,
) => Promise<MiddlewareResult>;

/** Bot configuration options. */
export interface BotConfig {
  token: string;
  clientId: string;
  guildId?: string;
  prefix?: string;
  intents?: number[];
  registerCommandsGlobally?: boolean;
  deployCommandsOnStart?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  gracefulShutdown?: boolean;
  ownerIds?: string[];
}

/** Cooldown configuration per command. */
export interface CooldownConfig {
  seconds: number;
  scope?: "user" | "guild" | "channel";
}

/** Permission requirements for a command. */
export interface PermissionConfig {
  memberPermissions?: bigint[];
  roleIds?: string[];
  ownerIds?: string[];
  botPermissions?: bigint[];
}

/** Slash command option definition. */
export interface CommandOptionDef {
  name: string;
  description: string;
  type: "string" | "integer" | "number" | "boolean" | "user" | "channel" | "role" | "mentionable" | "attachment";
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  autocomplete?: boolean;
}

/** Subcommand definition within a command group. */
export interface SubcommandDefinition<TDatabase = unknown> {
  name: string;
  description: string;
  group?: string;
  options?: CommandOptionDef[];
  cooldown?: CooldownConfig;
  permissions?: PermissionConfig;
  middleware?: MiddlewareFn<TDatabase>[];
  guildOnly?: boolean;
  dmOnly?: boolean;
  defer?: boolean;
  ephemeral?: boolean;
  execute: (ctx: CommandContext<TDatabase>) => Promise<void>;
}

/** Slash command definition. */
export interface CommandDefinition<TDatabase = unknown> {
  name: string;
  description: string;
  options?: CommandOptionDef[];
  subcommands?: SubcommandDefinition<TDatabase>[];
  cooldown?: CooldownConfig;
  permissions?: PermissionConfig;
  middleware?: MiddlewareFn<TDatabase>[];
  guildOnly?: boolean;
  dmOnly?: boolean;
  defer?: boolean;
  ephemeral?: boolean;
  autocomplete?: (
    ctx: AutocompleteContext<TDatabase>,
  ) => Promise<ApplicationCommandOptionChoiceData[]>;
  execute: (ctx: CommandContext<TDatabase>) => Promise<void>;
}

/** Prefix (message) command definition. */
export interface MessageCommandDefinition<TDatabase = unknown> {
  name: string;
  aliases?: string[];
  description: string;
  cooldown?: CooldownConfig;
  permissions?: PermissionConfig;
  guildOnly?: boolean;
  execute: (ctx: MessageContext<TDatabase>) => Promise<void>;
}

/** Discord event definition. */
export interface EventDefinition<TDatabase = unknown, TEvent extends string = string> {
  name: TEvent;
  once?: boolean;
  execute: (ctx: EventContext<TDatabase>) => Promise<void>;
}

/** User context menu definition. */
export interface UserContextMenuDefinition<TDatabase = unknown> {
  name: string;
  permissions?: PermissionConfig;
  execute: (ctx: UserContextMenuContext<TDatabase>) => Promise<void>;
}

/** Message context menu definition. */
export interface MessageContextMenuDefinition<TDatabase = unknown> {
  name: string;
  permissions?: PermissionConfig;
  execute: (ctx: MessageContextMenuContext<TDatabase>) => Promise<void>;
}

/** Button component handler definition. */
export interface ButtonDefinition<TDatabase = unknown> {
  customId: string;
  /** If true, matches any customId starting with customId + ":" */
  prefix?: boolean;
  execute: (ctx: ButtonContext<TDatabase>) => Promise<void>;
}

/** Select menu handler definition. */
export interface SelectMenuDefinition<TDatabase = unknown> {
  customId: string;
  prefix?: boolean;
  execute: (ctx: SelectMenuContext<TDatabase>) => Promise<void>;
}

/** Modal submit handler definition. */
export interface ModalDefinition<TDatabase = unknown> {
  customId: string;
  prefix?: boolean;
  execute: (ctx: ModalContext<TDatabase>) => Promise<void>;
}

/** Plugin with full lifecycle hooks. */
export interface BotPlugin<TDatabase = unknown> {
  name: string;
  setup: (builder: import("../core/BotBuilder.js").BotBuilder<TDatabase>) => void | Promise<void>;
  onReady?: (services: BotServices<TDatabase>) => void | Promise<void>;
  onStart?: (services: BotServices<TDatabase>) => void | Promise<void>;
  onStop?: (services: BotServices<TDatabase>) => void | Promise<void>;
}

/** Bot health status snapshot. */
export interface BotHealth {
  status: "starting" | "ready" | "stopping" | "stopped";
  uptime: number;
  guilds: number;
  users: number;
  commands: number;
  databaseConnected: boolean;
  startedAt: Date | null;
}
