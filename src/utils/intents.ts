import { GatewayIntentBits, type BitFieldResolvable, type GatewayIntentsString } from "discord.js";

/**
 * Fluent builder for Discord gateway intents.
 */
export class IntentBuilder {
  private intents: GatewayIntentBits[] = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ];

  static default(): IntentBuilder {
    return new IntentBuilder();
  }

  static all(): IntentBuilder {
    return new IntentBuilder().allNonPrivileged().members().moderation();
  }

  allNonPrivileged(): this {
    this.intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
    ];
    return this;
  }

  guilds(): this { this.add(GatewayIntentBits.Guilds); return this; }
  members(): this { this.add(GatewayIntentBits.GuildMembers); return this; }
  moderation(): this { this.add(GatewayIntentBits.GuildModeration); return this; }
  messages(): this { this.add(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent); return this; }
  reactions(): this { this.add(GatewayIntentBits.GuildMessageReactions); return this; }
  voice(): this { this.add(GatewayIntentBits.GuildVoiceStates); return this; }
  presences(): this { this.add(GatewayIntentBits.GuildPresences); return this; }
  dms(): this { this.add(GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions); return this; }

  add(...bits: GatewayIntentBits[]): this {
    for (const bit of bits) {
      if (!this.intents.includes(bit)) this.intents.push(bit);
    }
    return this;
  }

  remove(...bits: GatewayIntentBits[]): this {
    this.intents = this.intents.filter((i) => !bits.includes(i));
    return this;
  }

  build(): BitFieldResolvable<GatewayIntentsString, number> {
    return this.intents;
  }
}
