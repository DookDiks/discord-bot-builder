import {
  BotBuilder,
  CommandBuilder,
  MemoryAdapter,
  createAdapter,
  errorHandlerMiddleware,
  loggerMiddleware,
} from "discord-bot-builder";

const ping = new CommandBuilder("ping", "Check if the bot is alive")
  .cooldown(3)
  .execute(async (ctx) => {
    await ctx.reply({ content: "Pong! 🏓", ephemeral: true });
  });

const greet = new CommandBuilder("greet", "Greet a user")
  .addUserOption("target", "Who to greet", { required: false })
  .addStringOption("message", "Custom greeting", { required: false })
  .execute(async (ctx) => {
    const target = ctx.options.target as { id: string } | undefined;
    const customMessage = ctx.options.message as string | undefined;
    const mention = target ? `<@${target.id}>` : ctx.user.toString();
    const text = customMessage ?? `Hello, ${mention}!`;
    await ctx.reply({ content: text });
  });

const bot = await new BotBuilder()
  .token(process.env.DISCORD_TOKEN!)
  .clientId(process.env.CLIENT_ID!)
  .guildId(process.env.GUILD_ID)
  .database(new MemoryAdapter())
  .use(loggerMiddleware())
  .use(errorHandlerMiddleware())
  .commands([ping, greet])
  .onReady(async (ctx) => {
    ctx.services.logger.info(`Logged in as ${ctx.client.user?.tag}`);
  })
  .build();

await bot.start();
