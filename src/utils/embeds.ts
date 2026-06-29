import { EmbedBuilder as DiscordEmbedBuilder, type ColorResolvable } from "discord.js";

export interface EmbedOptions {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  url?: string;
  thumbnail?: string;
  image?: string;
  footer?: { text: string; iconURL?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: boolean;
}

/**
 * Fluent embed builder wrapping discord.js EmbedBuilder.
 */
export class EmbedBuilder {
  private readonly embed: DiscordEmbedBuilder;

  constructor(options: EmbedOptions = {}) {
    this.embed = new DiscordEmbedBuilder();
    if (options.title) this.embed.setTitle(options.title);
    if (options.description) this.embed.setDescription(options.description);
    if (options.color !== undefined) this.embed.setColor(options.color);
    if (options.url) this.embed.setURL(options.url);
    if (options.thumbnail) this.embed.setThumbnail(options.thumbnail);
    if (options.image) this.embed.setImage(options.image);
    if (options.footer) this.embed.setFooter(options.footer);
    if (options.timestamp) this.embed.setTimestamp();
    if (options.fields) {
      for (const field of options.fields) {
        this.embed.addFields(field);
      }
    }
  }

  static success(title: string, description?: string): EmbedBuilder {
    return new EmbedBuilder({ title, description, color: 0x57f287 });
  }

  static error(title: string, description?: string): EmbedBuilder {
    return new EmbedBuilder({ title, description, color: 0xed4245 });
  }

  static info(title: string, description?: string): EmbedBuilder {
    return new EmbedBuilder({ title, description, color: 0x5865f2 });
  }

  static warning(title: string, description?: string): EmbedBuilder {
    return new EmbedBuilder({ title, description, color: 0xfee75c });
  }

  title(value: string): this {
    this.embed.setTitle(value);
    return this;
  }

  description(value: string): this {
    this.embed.setDescription(value);
    return this;
  }

  color(value: ColorResolvable): this {
    this.embed.setColor(value);
    return this;
  }

  field(name: string, value: string, inline = false): this {
    this.embed.addFields({ name, value, inline });
    return this;
  }

  footer(text: string, iconURL?: string): this {
    this.embed.setFooter({ text, iconURL });
    return this;
  }

  timestamp(value?: Date): this {
    this.embed.setTimestamp(value);
    return this;
  }

  build(): DiscordEmbedBuilder {
    return this.embed;
  }
}
