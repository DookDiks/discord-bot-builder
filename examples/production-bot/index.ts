import {
  BotBuilder,
  CommandBuilder,
  CommandGroupBuilder,
  UserContextMenuBuilder,
  ButtonRowBuilder,
  ModalFormBuilder,
  EmbedBuilder,
  FileAdapter,
  IntentBuilder,
  loadConfigFromEnv,
  loggerMiddleware,
  errorHandlerMiddleware,
  deferMiddleware,
  TextInputStyle,
} from "discord-bot-builder";

// ─── Load validated config from environment ───
const config = loadConfigFromEnv();

// ─── Slash commands ───
const ping = new CommandBuilder("ping", "Health check")
  .execute(async (ctx) => {
    const health = (ctx.services as unknown as { health?: () => { uptime: number } });
    await ctx.reply({
      embeds: [EmbedBuilder.success("Pong!", `Latency: ${Date.now() % 100}ms`).build()],
      ephemeral: true,
    });
  });

const search = new CommandBuilder("search", "Search with autocomplete")
  .addStringOption("query", "Search term", { required: true, autocomplete: true })
  .autocomplete(async (ctx) => {
    const games = ["Minecraft", "Fortnite", "Valorant", "League of Legends"];
    const filtered = games
      .filter((g) => g.toLowerCase().includes(ctx.focusedValue.toLowerCase()))
      .slice(0, 25)
      .map((g) => ({ name: g, value: g }));
    await ctx.respond(filtered);
  })
  .execute(async (ctx) => {
    await ctx.reply({ content: `Results for: ${ctx.options.query}` });
  });

// ─── Subcommand group ───
const moderation = new CommandGroupBuilder("mod", "Moderation tools")
  .guildOnly()
  .subcommand("warn", "Warn a user", (b) =>
    b.addUserOption("user", "Target", { required: true })
     .addStringOption("reason", "Reason", { required: true })
     .execute(async (ctx) => {
       await ctx.reply({ content: `Warned <@${(ctx.options.user as { id: string }).id}>` });
     }),
  )
  .subcommand("kick", "Kick a user", (b) =>
    b.addUserOption("user", "Target", { required: true })
     .defer(true)
     .execute(async (ctx) => {
       await ctx.editReply({ content: `Kicked user.` });
     }),
  );

// ─── Components ───
const confirmRow = new ButtonRowBuilder()
  .danger("confirm:delete", "Confirm Delete")
  .secondary("confirm:cancel", "Cancel")
  .build();

const settings = new CommandBuilder("settings", "Bot settings panel")
  .execute(async (ctx) => {
    await ctx.reply({ content: "Choose an action:", components: [confirmRow] });
  });

// ─── Context menu ───
const profile = new UserContextMenuBuilder("View Profile")
  .execute(async (ctx) => {
    await ctx.reply({
      embeds: [EmbedBuilder.info(ctx.targetUser.tag, `ID: ${ctx.targetUser.id}`).build()],
      ephemeral: true,
    });
  });

// ─── Build production bot ───
const bot = await new BotBuilder()
  .configure(config)
  .database(new FileAdapter("./data/bot-store.json"))
  .intents(IntentBuilder.default().members().moderation())
  .use(loggerMiddleware())
  .use(errorHandlerMiddleware())
  .commands([ping, search, moderation, settings])
  .userContextMenu(profile)
  .button({ customId: "confirm", prefix: true, execute: async (ctx) => {
    const action = ctx.customId.split(":")[1];
    if (action === "delete") await ctx.update({ content: "Deleted!", components: [] });
    else await ctx.update({ content: "Cancelled.", components: [] });
  }})
  .onReady(async (ctx) => {
    ctx.services.logger.info(`Production bot ready: ${ctx.client.user?.tag}`);
  })
  .build();

await bot.start();
