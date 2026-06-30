import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  REST,
  Routes,
  type APIApplicationCommandOption,
  type ChatInputCommandInteraction,
} from "discord.js";
import type {
  CommandDefinition,
  CommandOptionDef,
  MessageContextMenuDefinition,
  SubcommandDefinition,
  UserContextMenuDefinition,
} from "../types/index.js";

function mapOptionType(type: CommandOptionDef["type"]): ApplicationCommandOptionType {
  const map: Record<CommandOptionDef["type"], ApplicationCommandOptionType> = {
    string: ApplicationCommandOptionType.String,
    integer: ApplicationCommandOptionType.Integer,
    number: ApplicationCommandOptionType.Number,
    boolean: ApplicationCommandOptionType.Boolean,
    user: ApplicationCommandOptionType.User,
    channel: ApplicationCommandOptionType.Channel,
    role: ApplicationCommandOptionType.Role,
    mentionable: ApplicationCommandOptionType.Mentionable,
    attachment: ApplicationCommandOptionType.Attachment,
  };
  return map[type];
}

function toDiscordOption(opt: CommandOptionDef): APIApplicationCommandOption {
  return {
    name: opt.name,
    description: opt.description,
    type: mapOptionType(opt.type),
    required: opt.required ?? false,
    choices: opt.choices,
    min_value: opt.minValue,
    max_value: opt.maxValue,
    min_length: opt.minLength,
    max_length: opt.maxLength,
    autocomplete: opt.autocomplete,
  } as APIApplicationCommandOption;
}

function toSubcommandOption<TDatabase>(sub: SubcommandDefinition<TDatabase>): APIApplicationCommandOption {
  return {
    name: sub.name,
    description: sub.description,
    type: ApplicationCommandOptionType.Subcommand,
    options: sub.options?.map(toDiscordOption) ?? [],
  } as APIApplicationCommandOption;
}

function toSubcommandGroupOption<TDatabase>(groupName: string, subs: SubcommandDefinition<TDatabase>[]): APIApplicationCommandOption {
  return {
    name: groupName,
    description: `${groupName} commands`,
    type: ApplicationCommandOptionType.SubcommandGroup,
    options: subs.map(toSubcommandOption),
  } as APIApplicationCommandOption;
}

export interface DeployOptions {
  guildId?: string;
  global?: boolean;
}

/**
 * Registers slash commands, context menus, and resolves subcommand routing.
 */
export class CommandRegistry<TDatabase = unknown> {
  private readonly commands = new Map<string, CommandDefinition<TDatabase>>();
  private readonly userContextMenus = new Map<string, UserContextMenuDefinition<TDatabase>>();
  private readonly messageContextMenus = new Map<string, MessageContextMenuDefinition<TDatabase>>();

  register(command: CommandDefinition<TDatabase>): this {
    this.commands.set(command.name, command);
    return this;
  }

  registerMany(commands: CommandDefinition<TDatabase>[]): this {
    for (const cmd of commands) this.register(cmd);
    return this;
  }

  registerUserContextMenu(menu: UserContextMenuDefinition<TDatabase>): this {
    this.userContextMenus.set(menu.name, menu);
    return this;
  }

  registerMessageContextMenu(menu: MessageContextMenuDefinition<TDatabase>): this {
    this.messageContextMenus.set(menu.name, menu);
    return this;
  }

  get(name: string): CommandDefinition<TDatabase> | undefined {
    return this.commands.get(name);
  }

  getUserContextMenu(name: string): UserContextMenuDefinition<TDatabase> | undefined {
    return this.userContextMenus.get(name);
  }

  getMessageContextMenu(name: string): MessageContextMenuDefinition<TDatabase> | undefined {
    return this.messageContextMenus.get(name);
  }

  getAll(): CommandDefinition<TDatabase>[] {
    return [...this.commands.values()];
  }

  getAllContextMenus(): Array<UserContextMenuDefinition<TDatabase> | MessageContextMenuDefinition<TDatabase>> {
    return [...this.userContextMenus.values(), ...this.messageContextMenus.values()];
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  /** Resolve subcommand handler from interaction. */
  resolveHandler(interaction: ChatInputCommandInteraction): {
    command: CommandDefinition<TDatabase>;
    subcommand: SubcommandDefinition<TDatabase> | null;
    subcommandGroup: string | null;
  } | null {
    const command = this.commands.get(interaction.commandName);
    if (!command) return null;

    const subGroup = interaction.options.getSubcommandGroup(false);
    const subName = interaction.options.getSubcommand(false);

    if (!subName || !command.subcommands?.length) {
      return { command, subcommand: null, subcommandGroup: subGroup };
    }

    const sub = command.subcommands.find(
      (s) => s.name === subName && (subGroup ? s.group === subGroup : !s.group),
    );
    return { command, subcommand: sub ?? null, subcommandGroup: subGroup };
  }

  extractOptions(interaction: ChatInputCommandInteraction): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const collect = (options: readonly { name: string; type: number; value?: unknown; user?: unknown; member?: unknown; channel?: unknown; role?: unknown; attachment?: unknown; options?: readonly unknown[] }[]): void => {
      for (const option of options) {
        if (option.type === ApplicationCommandOptionType.SubcommandGroup && Array.isArray(option.options)) {
          collect(option.options as typeof options);
        } else if (option.type === ApplicationCommandOptionType.Subcommand && Array.isArray(option.options)) {
          collect(option.options as typeof options);
        } else {
          result[option.name] = option.value ?? option.user ?? option.member ?? option.channel ?? option.role ?? option.attachment;
        }
      }
    };

    collect(interaction.options.data);
    return result;
  }

  private buildSlashCommandBody(cmd: CommandDefinition<TDatabase>) {
    if (cmd.subcommands?.length) {
      const ungrouped = cmd.subcommands.filter((s) => !s.group);
      const groups = [...new Set(cmd.subcommands.filter((s) => s.group).map((s) => s.group!))];
      const options: APIApplicationCommandOption[] = [
        ...ungrouped.map(toSubcommandOption),
        ...groups.map((g) => toSubcommandGroupOption(g, cmd.subcommands!.filter((s) => s.group === g))),
      ];
      return { name: cmd.name, description: cmd.description, type: ApplicationCommandType.ChatInput, options };
    }
    return {
      name: cmd.name,
      description: cmd.description,
      type: ApplicationCommandType.ChatInput,
      options: cmd.options?.map(toDiscordOption) ?? [],
    };
  }

  private buildDeployBody() {
    const slash = this.getAll().map((cmd) => this.buildSlashCommandBody(cmd));
    const userMenus = [...this.userContextMenus.values()].map((m) => ({
      name: m.name,
      type: ApplicationCommandType.User,
    }));
    const messageMenus = [...this.messageContextMenus.values()].map((m) => ({
      name: m.name,
      type: ApplicationCommandType.Message,
    }));
    return [...slash, ...userMenus, ...messageMenus];
  }

  async deploy(token: string, clientId: string, options: DeployOptions = {}): Promise<void> {
    const rest = new REST({ version: "10" }).setToken(token);
    const body = this.buildDeployBody();
    if (body.length === 0) return;

    if (options.guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, options.guildId), { body });
      return;
    }

    if (options.global) {
      await rest.put(Routes.applicationCommands(clientId), { body });
      return;
    }

    throw new Error(
      "Command deploy requires guildId or global:true. Set .guildId() for dev or .registerCommandsGlobally(true) for production.",
    );
  }

  /** Deploy without starting the bot — useful for CI/CD pipelines. */
  static async deployCommands<TDatabase = unknown>(
    registry: CommandRegistry<TDatabase>,
    token: string,
    clientId: string,
    options: DeployOptions = {},
  ): Promise<void> {
    await registry.deploy(token, clientId, options);
  }
}
