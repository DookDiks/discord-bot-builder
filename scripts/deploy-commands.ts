import { BotBuilder, CommandBuilder } from "../src/index.js";

const ping = new CommandBuilder("ping", "Health check").execute(async () => {});

const bot = await new BotBuilder()
  .token(process.env.DISCORD_TOKEN!)
  .clientId(process.env.CLIENT_ID!)
  .registerCommandsGlobally(process.env.REGISTER_COMMANDS_GLOBALLY === "true")
  .deployCommandsOnStart(false)
  .command(ping)
  .build();

await bot.deployCommands();
console.log("Commands deployed successfully");
