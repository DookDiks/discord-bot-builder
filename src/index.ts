import { Client, SlashCommandBuilder, REST, Routes, Events } from "discord.js";
import type { BaseEventHandler } from "./events/BaseEventHandler";
import { CreateInteractionEvent } from "./events/CreateInteractionEvent";

export class BotBuilder {
    private client: Client;
    private TOKEN: string;
    private CLIENT_ID: string;
    private GUILD_ID?: string;
    private slashCommands: SlashCommandBuilder[] = [];
    private rest: REST = new REST({ version: '10' });

    constructor({
        client,
        token,
        clientId,
        guildId,
    }: {
        client: Client;
        token: string;
        clientId: string;
        guildId?: string;
    }) {
        this.client = client;
        this.TOKEN = token;
        this.CLIENT_ID = clientId;
        this.GUILD_ID = guildId;
        this.rest.setToken(this.TOKEN);
    }

    private async registerSlashCommands() {
        try {
            const route = this.GUILD_ID
                ? Routes.applicationGuildCommands(this.CLIENT_ID, this.GUILD_ID)
                : Routes.applicationCommands(this.CLIENT_ID);

            await this.rest.put(route, {
                body: this.slashCommands,
            });
        } catch (error) {
            console.error("Failed to register slash commands:", error);
        }
    }

    public async deleteSlashCommands() {
        try {
            const route = this.GUILD_ID
                ? Routes.applicationGuildCommands(this.CLIENT_ID, this.GUILD_ID)
                : Routes.applicationCommands(this.CLIENT_ID);

            await this.rest.delete(route);
        } catch (error) {
            console.error("Failed to delete slash commands:", error);
        }
    }

    public login() {
        this.client.once(Events.ClientReady, () => {
            console.log(`✅ Logged in as ${this.client.user?.tag}`);
            this.registerSlashCommands();
        });

        console.log("🚀 Starting bot...");
        return this.client.login(this.TOKEN);
    }

    public use(handler: BaseEventHandler) {
        handler.setClient(this.client);
        handler.register();

        if (handler instanceof CreateInteractionEvent) {
            this.slashCommands.push(handler.getSlashCommand());
        }

        return this;
    }
}