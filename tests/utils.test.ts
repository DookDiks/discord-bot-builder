import { describe, it, expect } from "vitest";
import { GatewayIntentBits } from "discord.js";
import { EmbedBuilder } from "../src/utils/embeds.js";
import { IntentBuilder } from "../src/utils/intents.js";

describe("EmbedBuilder", () => {
  it("creates success embed with preset color", () => {
    const embed = EmbedBuilder.success("Done", "All good").build();
    expect(embed.data.title).toBe("Done");
    expect(embed.data.description).toBe("All good");
    expect(embed.data.color).toBe(0x57f287);
  });

  it("creates error, info, and warning presets", () => {
    expect(EmbedBuilder.error("Err").build().data.color).toBe(0xed4245);
    expect(EmbedBuilder.info("Info").build().data.color).toBe(0x5865f2);
    expect(EmbedBuilder.warning("Warn").build().data.color).toBe(0xfee75c);
  });

  it("supports constructor options and fluent chaining", () => {
    const embed = new EmbedBuilder({
      title: "T",
      description: "D",
      color: 0xffffff,
      url: "https://example.com",
      thumbnail: "https://example.com/t.png",
      image: "https://example.com/i.png",
      footer: { text: "footer" },
      fields: [{ name: "F", value: "V", inline: true }],
      timestamp: true,
    })
      .title("Updated")
      .description("New desc")
      .color(0x000000)
      .field("Extra", "Value")
      .footer("Foot", "https://example.com/icon.png")
      .timestamp(new Date("2020-01-01"))
      .build();

    expect(embed.data.title).toBe("Updated");
    expect(embed.data.description).toBe("New desc");
    expect(embed.data.color).toBe(0);
    expect(embed.data.fields?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("IntentBuilder", () => {
  it("default includes guilds, messages, and message content", () => {
    const intents = IntentBuilder.default().build() as GatewayIntentBits[];
    expect(intents).toContain(GatewayIntentBits.Guilds);
    expect(intents).toContain(GatewayIntentBits.GuildMessages);
    expect(intents).toContain(GatewayIntentBits.MessageContent);
  });

  it("all() adds members and moderation intents", () => {
    const intents = IntentBuilder.all().build() as GatewayIntentBits[];
    expect(intents).toContain(GatewayIntentBits.GuildMembers);
    expect(intents).toContain(GatewayIntentBits.GuildModeration);
  });

  it("allNonPrivileged sets broad non-privileged set", () => {
    const intents = IntentBuilder.default().allNonPrivileged().build() as GatewayIntentBits[];
    expect(intents).toContain(GatewayIntentBits.GuildPresences);
    expect(intents).toContain(GatewayIntentBits.DirectMessages);
  });

  it("add deduplicates intent bits", () => {
    const intents = IntentBuilder.default()
      .add(GatewayIntentBits.Guilds, GatewayIntentBits.Guilds)
      .build() as GatewayIntentBits[];
    expect(intents.filter((i) => i === GatewayIntentBits.Guilds)).toHaveLength(1);
  });

  it("remove drops specified intents", () => {
    const intents = IntentBuilder.default()
      .remove(GatewayIntentBits.MessageContent)
      .build() as GatewayIntentBits[];
    expect(intents).not.toContain(GatewayIntentBits.MessageContent);
  });

  it("fluent helpers add expected bits", () => {
    const intents = IntentBuilder.default()
      .members()
      .moderation()
      .reactions()
      .voice()
      .presences()
      .dms()
      .build() as GatewayIntentBits[];

    expect(intents).toContain(GatewayIntentBits.GuildMembers);
    expect(intents).toContain(GatewayIntentBits.GuildModeration);
    expect(intents).toContain(GatewayIntentBits.GuildMessageReactions);
    expect(intents).toContain(GatewayIntentBits.GuildVoiceStates);
    expect(intents).toContain(GatewayIntentBits.GuildPresences);
    expect(intents).toContain(GatewayIntentBits.DirectMessageReactions);
  });
});
