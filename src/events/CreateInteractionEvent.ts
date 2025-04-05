import { SlashCommandBuilder, ChatInputCommandInteraction, type CacheType, Events } from "discord.js";
import { BaseEventHandler } from "./BaseEventHandler";

export class CreateInteractionEvent extends BaseEventHandler {
    private slashCommand: SlashCommandBuilder = new SlashCommandBuilder();
    private handler?: (interaction: ChatInputCommandInteraction<CacheType>) => void;

    public command(builder: (builder: SlashCommandBuilder) => SlashCommandBuilder) {
        this.slashCommand = builder(this.slashCommand)
        return this
    }

    public on(handler: (interaction: ChatInputCommandInteraction<CacheType>) => void) {
        this.handler = handler;
        return this;
    }

    public getSlashCommand() {
        return this.slashCommand;
    }

    public getHandler() {
        return this.handler;
    }

    public register() {
        if (!this.client || !this.handler) return;

        this.client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;
            if (interaction.commandName === this.slashCommand.name) {
                await this.handler?.(interaction);
            }
        });
    }
}