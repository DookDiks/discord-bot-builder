import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import type { ComponentRegistry } from "../components/ComponentRegistry.js";
import type { CommandRegistry } from "../commands/CommandRegistry.js";
import { CooldownManager } from "../utils/CooldownManager.js";
import { checkPermissions } from "../utils/permissions.js";
import { runMiddleware } from "../middleware/index.js";
import type { Logger } from "../logging/Logger.js";
import type {
  BotServices,
  CommandContext,
  CommandDefinition,
  MessageCommandDefinition,
  MessageContext,
  SubcommandDefinition,
} from "../types/index.js";

export interface InteractionRouterOptions<TDatabase> {
  client: Client;
  services: BotServices<TDatabase>;
  commandRegistry: CommandRegistry<TDatabase>;
  messageCommands: Map<string, MessageCommandDefinition<TDatabase>>;
  componentRegistry: ComponentRegistry<TDatabase>;
  globalMiddleware: import("../types/index.js").MiddlewareFn<TDatabase>[];
  ownerIds: string[];
  logger: Logger;
}

/**
 * Routes all Discord interactions to registered handlers.
 */
export class InteractionRouter<TDatabase = unknown> {
  private readonly cooldowns = new CooldownManager();

  constructor(private readonly options: InteractionRouterOptions<TDatabase>) {}

  wire(): void {
    const { client } = this.options;
    client.on("interactionCreate", (interaction) => void this.handleInteraction(interaction));
  }

  wireMessages(prefix: string): void {
    this.options.client.on("messageCreate", (message) => {
      if (message.author.bot || !message.content.startsWith(prefix)) return;
      void this.handleMessageCommand(message, prefix);
    });
  }

  clearCooldowns(): void {
    this.cooldowns.clear();
  }

  private async handleInteraction(interaction: import("discord.js").Interaction): Promise<void> {
    try {
      if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
      } else if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      } else if (interaction.isUserContextMenuCommand()) {
        await this.handleUserContextMenu(interaction);
      } else if (interaction.isMessageContextMenuCommand()) {
        await this.handleMessageContextMenu(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.handleSelectMenu(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModal(interaction);
      }
    } catch (err) {
      this.options.logger.error("Unhandled interaction error", {
        type: interaction.type,
        err: err instanceof Error ? err.message : String(err),
      });
      await this.safeErrorReply(interaction);
    }
  }

  private async safeErrorReply(interaction: import("discord.js").Interaction): Promise<void> {
    if (!this.isRepliable(interaction)) return;

    const content = "Something went wrong.";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    } catch {
      // Interaction may have expired or already been acknowledged.
    }
  }

  private isRepliable(
    interaction: import("discord.js").Interaction,
  ): interaction is import("discord.js").RepliableInteraction {
    return "reply" in interaction && typeof interaction.reply === "function";
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.options.commandRegistry.get(interaction.commandName);
    if (!command?.autocomplete) return;

    const focused = interaction.options.getFocused(true);
    await command.autocomplete({
      interaction,
      user: interaction.user,
      member: interaction.member as import("discord.js").GuildMember | null,
      focusedOption: focused.name,
      focusedValue: String(focused.value),
      services: this.options.services,
      respond: interaction.respond.bind(interaction),
    });
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const resolved = this.options.commandRegistry.resolveHandler(interaction);
    if (!resolved) return;

    const { command, subcommand, subcommandGroup } = resolved;
    const subName = interaction.options.getSubcommand(false);
    const ctx = this.createCommandContext(interaction, subcommandGroup);

    if (command.subcommands?.length) {
      if (!subName) {
        await this.safeReply(ctx, "Please specify a subcommand.", true);
        return;
      }
      if (!subcommand) {
        await this.safeReply(ctx, "Unknown subcommand.", true);
        return;
      }
    }

    const handler = subcommand ?? command;

    if (!(await this.checkLocation(interaction, handler, ctx))) return;
    if (!(await this.checkPermissions(interaction, handler, command.name, ctx))) return;
    if (!(await this.checkCooldown(interaction, handler, command.name, ctx))) return;

    const middleware = [
      ...this.options.globalMiddleware,
      ...(command.middleware ?? []),
      ...(subcommand?.middleware ?? []),
    ];

    const { halted, reason } = await runMiddleware(middleware, ctx);
    if (halted) {
      if (reason) await this.safeReply(ctx, reason, handler.ephemeral ?? true);
      return;
    }

    if (handler.defer && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: handler.ephemeral ?? false });
    }

    await handler.execute(ctx);
    this.applyCooldown(interaction, handler, command.name);
  }

  private async handleUserContextMenu(
    interaction: import("discord.js").UserContextMenuCommandInteraction,
  ): Promise<void> {
    const def = this.options.commandRegistry.getUserContextMenu(interaction.commandName);
    if (!def) return;

    const member = interaction.member as import("discord.js").GuildMember | null;
    if (def.permissions) {
      const check = checkPermissions(member, { ...def.permissions, ownerIds: [...(def.permissions.ownerIds ?? []), ...this.options.ownerIds] }, interaction.user.id);
      if (!check.allowed) {
        await interaction.reply({ content: check.reason ?? "Permission denied.", ephemeral: true });
        return;
      }
    }

    await def.execute({
      interaction,
      user: interaction.user,
      targetUser: interaction.targetUser,
      member,
      services: this.options.services,
      reply: interaction.reply.bind(interaction),
    });
  }

  private async handleMessageContextMenu(
    interaction: import("discord.js").MessageContextMenuCommandInteraction,
  ): Promise<void> {
    const def = this.options.commandRegistry.getMessageContextMenu(interaction.commandName);
    if (!def) return;

    const member = interaction.member as import("discord.js").GuildMember | null;
    if (def.permissions) {
      const check = checkPermissions(member, { ...def.permissions, ownerIds: [...(def.permissions.ownerIds ?? []), ...this.options.ownerIds] }, interaction.user.id);
      if (!check.allowed) {
        await interaction.reply({ content: check.reason ?? "Permission denied.", ephemeral: true });
        return;
      }
    }

    await def.execute({
      interaction,
      user: interaction.user,
      targetMessage: interaction.targetMessage,
      member,
      services: this.options.services,
      reply: interaction.reply.bind(interaction),
    });
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const def = this.options.componentRegistry.resolveButton(interaction.customId);
    if (!def) return;

    await def.execute({
      interaction,
      user: interaction.user,
      member: interaction.member as import("discord.js").GuildMember | null,
      customId: interaction.customId,
      services: this.options.services,
      reply: interaction.reply.bind(interaction),
      update: interaction.update.bind(interaction),
      deferUpdate: interaction.deferUpdate.bind(interaction),
    });
  }

  private async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const def = this.options.componentRegistry.resolveSelectMenu(interaction.customId);
    if (!def) return;

    await def.execute({
      interaction,
      user: interaction.user,
      member: interaction.member as import("discord.js").GuildMember | null,
      customId: interaction.customId,
      values: interaction.values,
      services: this.options.services,
      reply: interaction.reply.bind(interaction),
      update: interaction.update.bind(interaction),
      deferUpdate: interaction.deferUpdate.bind(interaction),
    });
  }

  private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const def = this.options.componentRegistry.resolveModal(interaction.customId);
    if (!def) return;

    const fields: Record<string, string> = {};
    for (const [customId, field] of interaction.fields.fields) {
      if ("value" in field && typeof field.value === "string") {
        fields[customId] = field.value;
      }
    }

    await def.execute({
      interaction,
      user: interaction.user,
      member: interaction.member as import("discord.js").GuildMember | null,
      customId: interaction.customId,
      fields,
      services: this.options.services,
      reply: interaction.reply.bind(interaction),
      deferReply: interaction.deferReply.bind(interaction),
    });
  }

  private async handleMessageCommand(message: Message, prefix: string): Promise<void> {
    try {
      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const name = args.shift()?.toLowerCase();
      if (!name) return;

      const def = this.options.messageCommands.get(name);
      if (!def) return;

      if (def.guildOnly && !message.guild) {
        await message.reply("This command can only be used in a server.");
        return;
      }

      const ctx: MessageContext<TDatabase> = {
        message,
        user: message.author,
        member: message.member,
        args,
        services: this.options.services,
        reply: message.reply.bind(message),
      };

      if (def.permissions) {
        const check = checkPermissions(ctx.member, { ...def.permissions, ownerIds: [...(def.permissions.ownerIds ?? []), ...this.options.ownerIds] }, ctx.user.id);
        if (!check.allowed) {
          await ctx.reply(check.reason ?? "Permission denied.");
          return;
        }
      }

      if (def.cooldown) {
        const scopeId = this.messageCooldownScopeId(message, def.cooldown.scope);
        const cd = this.cooldowns.isOnCooldown(def.name, scopeId, def.cooldown);
        if (cd.onCooldown) {
          await ctx.reply(`Please wait ${cd.remainingSeconds}s before using this command again.`);
          return;
        }
      }

      await def.execute(ctx);

      if (def.cooldown) {
        const scopeId = this.messageCooldownScopeId(message, def.cooldown.scope);
        this.cooldowns.setCooldown(def.name, scopeId, def.cooldown);
      }
    } catch (err) {
      this.options.logger.error("Message command error", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private messageCooldownScopeId(
    message: Message,
    scope: import("../types/index.js").CooldownConfig["scope"] = "user",
  ): string {
    switch (scope) {
      case "guild": return message.guildId ?? "dm";
      case "channel": return message.channelId;
      default: return message.author.id;
    }
  }

  private async checkLocation(
    interaction: ChatInputCommandInteraction,
    handler: CommandDefinition<TDatabase> | SubcommandDefinition<TDatabase>,
    ctx: CommandContext<TDatabase>,
  ): Promise<boolean> {
    if (handler.guildOnly && !interaction.guild) {
      await this.safeReply(ctx, "This command can only be used in a server.", true);
      return false;
    }
    if (handler.dmOnly && interaction.guild) {
      await this.safeReply(ctx, "This command can only be used in DMs.", true);
      return false;
    }
    return true;
  }

  private async checkPermissions(
    interaction: ChatInputCommandInteraction,
    handler: CommandDefinition<TDatabase> | SubcommandDefinition<TDatabase>,
    commandName: string,
    ctx: CommandContext<TDatabase>,
  ): Promise<boolean> {
    if (!handler.permissions) return true;
    const perms = {
      ...handler.permissions,
      ownerIds: [...(handler.permissions.ownerIds ?? []), ...this.options.ownerIds],
    };
    const check = checkPermissions(ctx.member, perms, ctx.user.id);
    if (!check.allowed) {
      await this.safeReply(ctx, check.reason ?? "Permission denied.", true);
      return false;
    }
    return true;
  }

  private async checkCooldown(
    interaction: ChatInputCommandInteraction,
    handler: CommandDefinition<TDatabase> | SubcommandDefinition<TDatabase>,
    commandName: string,
    ctx: CommandContext<TDatabase>,
  ): Promise<boolean> {
    if (!handler.cooldown) return true;
    const scopeId = this.cooldownScopeId(interaction, handler.cooldown.scope);
    const cd = this.cooldowns.isOnCooldown(commandName, scopeId, handler.cooldown);
    if (cd.onCooldown) {
      await this.safeReply(ctx, `Please wait ${cd.remainingSeconds}s before using this command again.`, true);
      return false;
    }
    return true;
  }

  private applyCooldown(
    interaction: ChatInputCommandInteraction,
    handler: CommandDefinition<TDatabase> | SubcommandDefinition<TDatabase>,
    commandName: string,
  ): void {
    if (!handler.cooldown) return;
    const scopeId = this.cooldownScopeId(interaction, handler.cooldown.scope);
    this.cooldowns.setCooldown(commandName, scopeId, handler.cooldown);
  }

  private createCommandContext(
    interaction: ChatInputCommandInteraction,
    subcommandGroup: string | null,
  ): CommandContext<TDatabase> {
    const subName = interaction.options.getSubcommand(false);
    return {
      interaction,
      user: interaction.user,
      member: interaction.member as import("discord.js").GuildMember | null,
      options: this.options.commandRegistry.extractOptions(interaction),
      subcommand: subName,
      subcommandGroup,
      services: this.options.services,
      reply: interaction.reply.bind(interaction),
      deferReply: interaction.deferReply.bind(interaction),
      editReply: interaction.editReply.bind(interaction),
      followUp: interaction.followUp.bind(interaction),
    };
  }

  private async safeReply(ctx: CommandContext<TDatabase>, content: string, ephemeral: boolean): Promise<void> {
    if (ctx.interaction.replied || ctx.interaction.deferred) {
      await ctx.editReply({ content });
    } else {
      await ctx.reply({ content, ephemeral });
    }
  }

  private cooldownScopeId(
    interaction: ChatInputCommandInteraction,
    scope: import("../types/index.js").CooldownConfig["scope"] = "user",
  ): string {
    switch (scope) {
      case "guild": return interaction.guildId ?? "dm";
      case "channel": return interaction.channelId;
      default: return interaction.user.id;
    }
  }
}
