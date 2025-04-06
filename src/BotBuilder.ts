import {
  Client,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  ClientOptions,
  GatewayIntentBits,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { CreateInteractionEvent } from "./events";
import { BaseEventHandler } from "@/events";

export interface BotBuilderOptions extends Omit<ClientOptions, "intents"> {
  token: string;
  clientId: string;
  guildId?: string;
  intents?: (keyof typeof GatewayIntentBits)[];
}

export class BotBuilder {
  private readonly token: string;
  private readonly clientId: string;
  private readonly guildId?: string;
  private readonly rest: REST;
  private readonly client: Client;
  private readonly slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];

  constructor({
    token,
    clientId,
    guildId,
    intents = [],
    ...clientOptions
  }: BotBuilderOptions) {
    this.token = token;
    this.clientId = clientId;
    this.guildId = guildId;

    this.rest = new REST({ version: "10" }).setToken(this.token);
    this.client = new Client({
      intents: BotBuilder.resolveIntents(intents),
      ...clientOptions,
    });
  }

  /** Utility to convert string intent keys to actual bitfield values */
  private static resolveIntents(
    keys: (keyof typeof GatewayIntentBits)[]
  ): number[] {
    return keys.map((key) => GatewayIntentBits[key]);
  }

  /** Dynamically determine correct API route for slash commands */
  private getCommandsRoute() {
    return this.guildId
      ? Routes.applicationGuildCommands(this.clientId, this.guildId)
      : Routes.applicationCommands(this.clientId);
  }

  /** Register all slash commands via Discord REST API */
  private async registerSlashCommands(): Promise<void> {
    try {
      const route = this.getCommandsRoute();
      await this.rest.put(route, { body: this.slashCommands });
      console.log(
        `📡 Slash commands registered (${this.slashCommands.length})`
      );
    } catch (error) {
      console.error("❌ Failed to register slash commands:", error);
    }
  }

  /** Clear all slash commands (useful for cleanup/testing) */
  public async deleteSlashCommands(): Promise<void> {
    try {
      const route = this.getCommandsRoute();
      await this.rest.delete(route);
      console.log("🧹 Slash commands deleted");
    } catch (error) {
      console.error("❌ Failed to delete slash commands:", error);
    }
  }

  /** Start the Discord bot and register commands on ready */
  public login(): Promise<string> {
    this.client.once(Events.ClientReady, () => {
      console.log(`✅ Logged in as ${this.client.user?.tag}`);
      this.registerSlashCommands().then()
    });

    console.log("🚀 Logging in...");
    return this.client.login(this.token);
  }

  /**
   * Attach an event handler.
   * If it's a slash command handler, queue its command for registration.
   */
  public use(handler: BaseEventHandler): this {
    handler.setClient(this.client);
    handler.register();

    if (handler instanceof CreateInteractionEvent) {
      this.slashCommands.push(handler.getSlashCommand().toJSON());
    }

    return this;
  }
}
