# Getting Started

This guide walks you through creating your first bot with `discord-bot-builder`.

## 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Open **Bot** → **Reset Token** → copy the token
4. Copy the **Application ID** from General Information
5. Enable **Message Content Intent** under Bot → Privileged Gateway Intents
6. Invite the bot: OAuth2 → URL Generator → scopes: `bot`, `applications.commands`

## 2. Project Setup

```bash
mkdir my-discord-bot && cd my-discord-bot
npm init -y
npm install @svacmai/discord-bot-builder discord.js
npm install -D typescript @types/node tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Create `.env`:

```env
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_app_id_here
GUILD_ID=your_test_server_id
```

## 3. Your First Bot

Create `src/index.ts`:

```ts
import {
  BotBuilder,
  CommandBuilder,
  MemoryAdapter,
  errorHandlerMiddleware,
} from "@svacmai/discord-bot-builder";

const ping = new CommandBuilder("ping", "Health check")
  .execute(async (ctx) => {
    await ctx.reply({ content: "Pong!", ephemeral: true });
  });

const bot = await new BotBuilder()
  .token(process.env.DISCORD_TOKEN!)
  .clientId(process.env.CLIENT_ID!)
  .guildId(process.env.GUILD_ID)
  .database(new MemoryAdapter())
  .use(errorHandlerMiddleware())
  .command(ping)
  .onReady((ctx) => console.log(`Ready: ${ctx.client.user?.tag}`))
  .build();

await bot.start();
```

Run:

```bash
npx tsx src/index.ts
```

## 4. Add More Commands

```ts
const echo = new CommandBuilder("echo", "Repeat a message")
  .addStringOption("text", "Text to echo", { required: true })
  .execute(async (ctx) => {
    await ctx.reply({ content: ctx.options.text as string });
  });

const userinfo = new CommandBuilder("userinfo", "Show user info")
  .addUserOption("user", "Target user", { required: false })
  .execute(async (ctx) => {
    const user = (ctx.options.user as User | undefined) ?? ctx.user;
    await ctx.reply({
      embeds: [{
        title: user.tag,
        fields: [
          { name: "ID", value: user.id, inline: true },
          { name: "Created", value: user.createdAt.toDateString(), inline: true },
        ],
      }],
    });
  });
```

## 5. Connect a Real Database

### With Prisma

```bash
npm install @prisma/client
npx prisma init
```

```ts
import { PrismaClient } from "@prisma/client";
import { createAdapter } from "@svacmai/discord-bot-builder";

const prisma = new PrismaClient();
const db = createAdapter(prisma, {
  connect: () => prisma.$connect(),
  disconnect: () => prisma.$disconnect(),
});

// In a command:
.execute(async (ctx) => {
  const client = ctx.services.db.getClient(); // PrismaClient
  const users = await client.user.count();
  await ctx.reply({ content: `Total users: ${users}` });
})
```

## 6. Production Checklist

- [ ] Remove `guildId` and use `registerCommandsGlobally(true)` for production
- [ ] Use a persistent database adapter (not `MemoryAdapter`)
- [ ] Add `errorHandlerMiddleware()` globally
- [ ] Handle `SIGINT` / `SIGTERM` with `bot.stop()`
- [ ] Store secrets in environment variables, never in code

## Next Steps

- Read the full [README](./README.md) API reference
- Explore [examples/basic-bot](../examples/basic-bot/)
- Explore [examples/database-bot](../examples/database-bot/)
