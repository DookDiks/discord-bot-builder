import type {
  CommandDefinition,
  CommandOptionDef,
  CooldownConfig,
  MiddlewareFn,
  PermissionConfig,
  SubcommandDefinition,
} from "../types/index.js";
import type { CommandContext } from "../types/index.js";

/**
 * Fluent builder for slash commands with subcommand support.
 *
 * @example
 * ```ts
 * const mod = new CommandGroupBuilder("mod", "Moderation commands")
 *   .subcommand("ban", "Ban a user", (b) =>
 *     b.addUserOption("user", "Target", { required: true })
 *      .execute(async (ctx) => { ... })
 *   )
 *   .subcommand("kick", "Kick a user", (b) =>
 *     b.addUserOption("user", "Target", { required: true })
 *      .execute(async (ctx) => { ... })
 *   );
 * ```
 */
export class CommandGroupBuilder<TDatabase = unknown> {
  private readonly definition: CommandDefinition<TDatabase>;

  constructor(name: string, description: string) {
    this.definition = {
      name: name.toLowerCase(),
      description,
      subcommands: [],
      middleware: [],
      execute: async () => {
        throw new Error(`Command group "${name}" requires subcommands.`);
      },
    };
  }

  subcommand(
    name: string,
    description: string,
    configure: (builder: SubcommandBuilder<TDatabase>) => SubcommandBuilder<TDatabase>,
  ): this {
    const builder = new SubcommandBuilder<TDatabase>(name, description);
    this.definition.subcommands!.push(configure(builder).build());
    return this;
  }

  /** Nested subcommand group: /cmd group sub */
  group(
    groupName: string,
    description: string,
    configure: (group: CommandSubGroupBuilder<TDatabase>) => CommandSubGroupBuilder<TDatabase>,
  ): this {
    const groupBuilder = new CommandSubGroupBuilder<TDatabase>(groupName, description);
    const built = configure(groupBuilder);
    for (const sub of built.getSubcommands()) {
      this.definition.subcommands!.push({ ...sub, group: groupName.toLowerCase() });
    }
    return this;
  }

  cooldown(seconds: number, scope: CooldownConfig["scope"] = "user"): this {
    this.definition.cooldown = { seconds, scope };
    return this;
  }

  permissions(config: PermissionConfig): this {
    this.definition.permissions = config;
    return this;
  }

  guildOnly(): this {
    this.definition.guildOnly = true;
    return this;
  }

  use(middleware: MiddlewareFn<TDatabase>): this {
    this.definition.middleware!.push(middleware);
    return this;
  }

  build(): CommandDefinition<TDatabase> {
    return { ...this.definition };
  }

  get name(): string {
    return this.definition.name;
  }
}

class CommandSubGroupBuilder<TDatabase = unknown> {
  private readonly subcommands: SubcommandDefinition<TDatabase>[] = [];

  constructor(
    private readonly groupName: string,
    private readonly description: string,
  ) {}

  subcommand(
    name: string,
    description: string,
    configure: (builder: SubcommandBuilder<TDatabase>) => SubcommandBuilder<TDatabase>,
  ): this {
    const builder = new SubcommandBuilder<TDatabase>(name, description);
    this.subcommands.push(configure(builder).build());
    return this;
  }

  getSubcommands(): SubcommandDefinition<TDatabase>[] {
    return this.subcommands;
  }
}

export class SubcommandBuilder<TDatabase = unknown> {
  private readonly definition: SubcommandDefinition<TDatabase>;

  constructor(name: string, description: string) {
    this.definition = {
      name: name.toLowerCase(),
      description,
      options: [],
      middleware: [],
      execute: async () => {
        throw new Error(`Subcommand "${name}" has no execute handler.`);
      },
    };
  }

  addStringOption(
    name: string,
    description: string,
    opts?: { required?: boolean; choices?: Array<{ name: string; value: string }>; minLength?: number; maxLength?: number; autocomplete?: boolean },
  ): this {
    this.definition.options!.push({ name, description, type: "string", required: opts?.required ?? false, choices: opts?.choices, minLength: opts?.minLength, maxLength: opts?.maxLength, autocomplete: opts?.autocomplete });
    return this;
  }

  addIntegerOption(name: string, description: string, opts?: { required?: boolean; minValue?: number; maxValue?: number }): this {
    this.definition.options!.push({ name, description, type: "integer", required: opts?.required ?? false, minValue: opts?.minValue, maxValue: opts?.maxValue });
    return this;
  }

  addBooleanOption(name: string, description: string, opts?: { required?: boolean }): this {
    this.definition.options!.push({ name, description, type: "boolean", required: opts?.required ?? false });
    return this;
  }

  addUserOption(name: string, description: string, opts?: { required?: boolean }): this {
    this.definition.options!.push({ name, description, type: "user", required: opts?.required ?? false });
    return this;
  }

  addOption(option: CommandOptionDef): this {
    this.definition.options!.push(option);
    return this;
  }

  cooldown(seconds: number, scope: CooldownConfig["scope"] = "user"): this {
    this.definition.cooldown = { seconds, scope };
    return this;
  }

  permissions(config: PermissionConfig): this {
    this.definition.permissions = config;
    return this;
  }

  guildOnly(): this { this.definition.guildOnly = true; return this; }
  defer(ephemeral = false): this { this.definition.defer = true; this.definition.ephemeral = ephemeral; return this; }
  ephemeral(): this { this.definition.ephemeral = true; return this; }

  use(middleware: MiddlewareFn<TDatabase>): this {
    this.definition.middleware!.push(middleware);
    return this;
  }

  execute(handler: (ctx: CommandContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): SubcommandDefinition<TDatabase> {
    return { ...this.definition };
  }
}
