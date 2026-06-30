import type { ApplicationCommandOptionChoiceData } from "discord.js";
import type {
  CommandDefinition,
  CommandOptionDef,
  CooldownConfig,
  MiddlewareFn,
  PermissionConfig,
} from "../types/index.js";
import type { AutocompleteContext, CommandContext } from "../types/index.js";
import type { Buildable } from "../utils/buildable.js";
import { resolveBuildable } from "../utils/buildable.js";

/**
 * Fluent builder for slash commands.
 */
export class CommandBuilder<TDatabase = unknown> {
  private readonly definition: CommandDefinition<TDatabase>;

  constructor(name: string, description: string) {
    this.definition = {
      name: name.toLowerCase(),
      description,
      options: [],
      middleware: [],
      execute: async () => {
        throw new Error(`Command "${name}" has no execute handler.`);
      },
    };
  }

  addStringOption(
    name: string,
    description: string,
    opts?: { required?: boolean; choices?: Array<{ name: string; value: string }>; minLength?: number; maxLength?: number; autocomplete?: boolean },
  ): this {
    this.definition.options!.push({
      name, description, type: "string",
      required: opts?.required ?? false,
      choices: opts?.choices,
      minLength: opts?.minLength,
      maxLength: opts?.maxLength,
      autocomplete: opts?.autocomplete,
    });
    return this;
  }

  addIntegerOption(name: string, description: string, opts?: { required?: boolean; minValue?: number; maxValue?: number }): this {
    this.definition.options!.push({ name, description, type: "integer", required: opts?.required ?? false, minValue: opts?.minValue, maxValue: opts?.maxValue });
    return this;
  }

  addNumberOption(name: string, description: string, opts?: { required?: boolean; minValue?: number; maxValue?: number }): this {
    this.definition.options!.push({ name, description, type: "number", required: opts?.required ?? false, minValue: opts?.minValue, maxValue: opts?.maxValue });
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

  addChannelOption(name: string, description: string, opts?: { required?: boolean }): this {
    this.definition.options!.push({ name, description, type: "channel", required: opts?.required ?? false });
    return this;
  }

  addRoleOption(name: string, description: string, opts?: { required?: boolean }): this {
    this.definition.options!.push({ name, description, type: "role", required: opts?.required ?? false });
    return this;
  }

  addMentionableOption(name: string, description: string, opts?: { required?: boolean }): this {
    this.definition.options!.push({ name, description, type: "mentionable", required: opts?.required ?? false });
    return this;
  }

  addAttachmentOption(name: string, description: string, opts?: { required?: boolean }): this {
    this.definition.options!.push({ name, description, type: "attachment", required: opts?.required ?? false });
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

  cooldownConfig(config: Buildable<CooldownConfig>): this {
    this.definition.cooldown = resolveBuildable(config);
    return this;
  }

  permissions(config: Buildable<PermissionConfig>): this {
    this.definition.permissions = resolveBuildable(config);
    return this;
  }

  guildOnly(): this { this.definition.guildOnly = true; return this; }
  dmOnly(): this { this.definition.dmOnly = true; return this; }
  defer(ephemeral = false): this { this.definition.defer = true; this.definition.ephemeral = ephemeral; return this; }
  ephemeral(): this { this.definition.ephemeral = true; return this; }

  autocomplete(handler: (ctx: AutocompleteContext<TDatabase>) => Promise<ApplicationCommandOptionChoiceData[] | void>): this {
    this.definition.autocomplete = handler;
    return this;
  }

  use(middleware: MiddlewareFn<TDatabase>): this {
    this.definition.middleware!.push(middleware);
    return this;
  }

  execute(handler: (ctx: CommandContext<TDatabase>) => Promise<void>): this {
    this.definition.execute = handler;
    return this;
  }

  build(): CommandDefinition<TDatabase> {
    return { ...this.definition };
  }

  get name(): string {
    return this.definition.name;
  }
}
