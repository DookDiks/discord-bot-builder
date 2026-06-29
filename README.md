# discord-bot-builder

Production-ready, type-safe OOP framework for building Discord bots with Node.js and discord.js v14.

## What you get

| Feature | Description |
|---------|-------------|
| **Fluent OOP API** | `BotBuilder`, `CommandBuilder`, `CommandGroupBuilder`, `EventBuilder` |
| **Slash commands** | Options, autocomplete, subcommands, subcommand groups |
| **Context menus** | User and message right-click commands |
| **Components** | Buttons, select menus, modals with prefix matching |
| **Prefix commands** | Message-based commands with aliases |
| **Database layer** | `MemoryAdapter`, `FileAdapter`, `createAdapter()` for Prisma/Drizzle |
| **Middleware** | Global and per-command chains with halt support |
| **Plugins** | `setup`, `onReady`, `onStart`, `onStop` lifecycle hooks |
| **Config validation** | Zod schema + `loadConfigFromEnv()` |
| **Structured logging** | `Logger` with levels, child loggers |
| **Production lifecycle** | Graceful shutdown, health checks, separate deploy |
| **Utilities** | Embeds, pagination, intent builder, cooldowns, permissions |

## Installation

```bash
npm install discord-bot-builder discord.js
```

Requires Node.js 18+.

## Quick start

```ts
import { BotBuilder, CommandBuilder, MemoryAdapter } from "discord-bot-builder";

const ping = new CommandBuilder("ping", "Health check")
  .execute(async (ctx) => {
    await ctx.reply({ content: "Pong!", ephemeral: true });
  });

const bot = await new BotBuilder()
  .token(process.env.DISCORD_TOKEN!)
  .clientId(process.env.CLIENT_ID!)
  .guildId(process.env.GUILD_ID)
  .database(new MemoryAdapter())
  .command(ping)
  .onReady((ctx) => ctx.services.logger.info(`Ready: ${ctx.client.user?.tag}`))
  .build();

await bot.start();
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/GETTING_STARTED.md) | First bot in 5 minutes |
| [Architecture](./docs/ARCHITECTURE.md) | System design and data flow |
| [Commands](./docs/COMMANDS.md) | Slash, subcommands, autocomplete, context menus |
| [Components](./docs/COMPONENTS.md) | Buttons, select menus, modals |
| [Database](./docs/DATABASE.md) | Adapters and persistence patterns |
| [Middleware & Plugins](./docs/MIDDLEWARE.md) | Middleware chains and plugin system |
| [Production Deployment](./docs/DEPLOYMENT.md) | Env config, CI/CD, graceful shutdown |
| [API Reference](./docs/API.md) | Complete API listing |

## Examples

| Example | Description |
|---------|-------------|
| [basic-bot](./examples/basic-bot/) | Ping, greet, middleware |
| [database-bot](./examples/database-bot/) | Custom typed store |
| [production-bot](./examples/production-bot/) | Full feature showcase |

## Environment variables

```env
DISCORD_TOKEN=           # Required
CLIENT_ID=               # Required
GUILD_ID=                # Optional — fast dev command registration
BOT_PREFIX=!             # Default: !
REGISTER_COMMANDS_GLOBALLY=false
DEPLOY_COMMANDS_ON_START=true
LOG_LEVEL=info           # debug | info | warn | error
GRACEFUL_SHUTDOWN=true
BOT_OWNER_IDS=           # Comma-separated user IDs
```

Or load validated config:

```ts
import { loadConfigFromEnv } from "discord-bot-builder";
const config = loadConfigFromEnv();
```

## Production checklist

- [ ] Use `loadConfigFromEnv()` or `validateConfig()` — never hardcode tokens
- [ ] Use `FileAdapter` or `createAdapter(prisma)` — not `MemoryAdapter`
- [ ] Add `errorHandlerMiddleware()` globally
- [ ] Set `ownerIds()` for admin commands
- [ ] Use `guildId` in dev, `registerCommandsGlobally(true)` in production
- [ ] Run `bot.deployCommands()` in CI before deploy
- [ ] Enable `gracefulShutdown(true)` (default)
- [ ] Monitor with `bot.getHealth()`

## Scripts

```bash
npm run build       # Compile TypeScript
npm run typecheck   # Type check without emit
npm test            # Run unit tests
npm run dev         # Watch mode
```

## License

MIT
