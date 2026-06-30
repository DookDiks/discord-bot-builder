# discord-bot-builder

Production-ready, type-safe **builder-first** framework for Discord bots on Node.js and discord.js v14. Every part of the stack — config, logging, database, commands, components, middleware, and plugins — has a fluent builder API designed to be simpler than wiring discord.js directly.

**Repository:** [github.com/DookDiks/discord-bot-builder](https://github.com/DookDiks/discord-bot-builder)

## Installation

```bash
npm install @dookdiks/discord-bot-builder discord.js
```

Requires Node.js 18+.

## Quick start

```ts
import {
  BotBuilder,
  CommandBuilder,
  ConfigBuilder,
  DatabaseBuilder,
  LoggerBuilder,
  MiddlewareBuilder,
} from "@dookdiks/discord-bot-builder";

const ping = new CommandBuilder("ping", "Health check")
  .execute(async (ctx) => {
    await ctx.reply({ content: "Pong!", ephemeral: true });
  });

const bot = await BotBuilder.create()
  .configure(ConfigBuilder.fromEnv())
  .withLogger(LoggerBuilder.production("my-bot"))
  .database(DatabaseBuilder.memory())
  .middleware(MiddlewareBuilder.defaults())
  .command(ping)
  .onReady((ctx) => ctx.services.logger.info(`Ready: ${ctx.client.user?.tag}`))
  .build();

await bot.start();
```

## Builder catalog

Every major feature exposes a `.create()` / fluent builder. Pass any builder to `BotBuilder` — it resolves via `.build()` automatically.

| Builder | Purpose |
|---------|---------|
| `BotBuilder` | Main entry — wires everything and produces `BuiltBot` |
| `ConfigBuilder` | Token, client ID, prefix, owners, deploy flags |
| `LoggerBuilder` | Log level, prefix, timestamps |
| `DatabaseBuilder` | Memory, file, or custom adapter (Prisma, Drizzle, …) |
| `MiddlewareBuilder` | Global middleware chain (`.defaults()` = log + errors) |
| `PluginBuilder` | Plugin lifecycle (`setup`, `onReady`, `onStart`, `onStop`) |
| `CommandBuilder` | Slash commands with options, cooldowns, permissions |
| `CommandGroupBuilder` | Subcommands and nested subcommand groups |
| `SubcommandBuilder` | Individual subcommand inside a group |
| `MessageCommandBuilder` | Prefix commands with aliases |
| `UserContextMenuBuilder` | Right-click user commands |
| `MessageContextMenuBuilder` | Right-click message commands |
| `EventBuilder` | Discord client events |
| `ButtonHandlerBuilder` | Button interaction handlers |
| `SelectMenuHandlerBuilder` | Select menu handlers |
| `ModalHandlerBuilder` | Modal submit handlers |
| `ButtonRowBuilder` | Discord button UI rows |
| `SelectMenuRowBuilder` | String select menu UI rows |
| `ModalFormBuilder` | Modal form UI |
| `EmbedBuilder` | Rich embed messages |
| `IntentBuilder` | Gateway intents |
| `PermissionBuilder` | Role, owner, member, and bot permissions |
| `CooldownBuilder` | Per-user / guild / channel cooldowns |
| `PaginatorBuilder` | Paginated messages with prev/next/stop |

### Supporting utilities

| Export | Purpose |
|--------|---------|
| `CommandRegistry` | Register and deploy slash + context menu commands |
| `ComponentRegistry` | Register button, select, and modal handlers |
| `EventRegistry` | Register client events |
| `loadConfigFromEnv` / `validateConfig` | Env-based or object config validation (Zod) |
| `createAdapter` | Wrap Prisma, Drizzle, or any client as `DatabaseAdapter` |
| `checkPermissions` | Permission check helper used by the router |
| `sendPaginator` | Low-level paginator (prefer `PaginatorBuilder`) |
| `resolveBuildable` | Resolve `T \| { build(): T }` in custom code |

## Full bot example

```ts
import {
  BotBuilder,
  CommandBuilder,
  CommandGroupBuilder,
  ButtonHandlerBuilder,
  ButtonRowBuilder,
  EmbedBuilder,
  ConfigBuilder,
  DatabaseBuilder,
  LoggerBuilder,
  MiddlewareBuilder,
  IntentBuilder,
  PermissionBuilder,
  CooldownBuilder,
} from "@dookdiks/discord-bot-builder";

const mod = new CommandGroupBuilder("mod", "Moderation")
  .guildOnly()
  .subcommand("ban", "Ban a user", (b) =>
    b.addUserOption("user", "Target", { required: true })
      .permissions(PermissionBuilder.role("mod").member("BanMembers"))
      .cooldownConfig(CooldownBuilder.ofSeconds(5).perGuild())
      .execute(async (ctx) => {
        await ctx.reply({ content: `Banned <@${(ctx.options.user as { id: string }).id}>` });
      }),
  );

const panel = new CommandBuilder("panel", "Open settings panel")
  .execute(async (ctx) => {
    const row = new ButtonRowBuilder()
      .danger("confirm:delete", "Delete")
      .secondary("confirm:cancel", "Cancel")
      .build();
    await ctx.reply({ content: "Choose:", components: [row] });
  });

const confirm = ButtonHandlerBuilder.create("confirm")
  .prefix()
  .execute(async (ctx) => {
    const action = ctx.customId.split(":")[1];
    await ctx.update({
      content: action === "delete" ? "Deleted!" : "Cancelled.",
      components: [],
    });
  });

const bot = await BotBuilder.create()
  .configure(ConfigBuilder.fromEnv())
  .withLogger(LoggerBuilder.production("my-bot"))
  .database(DatabaseBuilder.create().file("./data/store.json"))
  .intents(IntentBuilder.default().members().moderation())
  .middleware(MiddlewareBuilder.defaults())
  .commands([mod, panel])
  .button(confirm)
  .onReady((ctx) => {
    ctx.services.logger.info(`Logged in as ${ctx.client.user?.tag}`);
  })
  .build();

await bot.start();
```

## Commands

### Slash commands

```ts
new CommandBuilder("greet", "Greet someone")
  .addUserOption("user", "Who to greet")
  .addStringOption("message", "Custom text", { autocomplete: true })
  .cooldown(3)
  .guildOnly()
  .defer(true)
  .ephemeral()
  .permissions(PermissionBuilder.role("member"))
  .autocomplete(async (ctx) => {
    await ctx.respond([{ name: "Hello", value: "hello" }]);
  })
  .execute(async (ctx) => { ... });
```

Supported options: `string`, `integer`, `number`, `boolean`, `user`, `channel`, `role`, `mentionable`, `attachment`.

### Subcommands

```ts
new CommandGroupBuilder("economy", "Economy")
  .group("wallet", "Wallet", (g) =>
    g.subcommand("balance", "Check balance", (b) => b.execute(async () => {}))
      .subcommand("deposit", "Deposit coins", (b) => b.execute(async () => {})),
  );
```

### Prefix commands

```ts
new MessageCommandBuilder("help", "Show help")
  .aliases("h", "?")
  .cooldown(5, "channel")
  .guildOnly()
  .permissions(PermissionBuilder.owner("YOUR_USER_ID"))
  .execute(async (ctx) => { ... });
```

### Context menus

```ts
new UserContextMenuBuilder("View Profile").execute(async (ctx) => { ... });
new MessageContextMenuBuilder("Quote Message").execute(async (ctx) => { ... });
```

## Components

**UI builders** create discord.js components to send in replies:

```ts
new ButtonRowBuilder().primary("ok", "OK").danger("no", "Cancel").build();
new SelectMenuRowBuilder("pick").addOption("A", "a").addOption("B", "b").build();
new ModalFormBuilder("form", "Title").textInput("name", "Name").build();
```

**Handler builders** register interaction callbacks on the bot:

```ts
ButtonHandlerBuilder.create("page").prefix().execute(async (ctx) => { ... });
SelectMenuHandlerBuilder.create("role").execute(async (ctx) => { ... });
ModalHandlerBuilder.create("signup").execute(async (ctx) => { ... });
```

Prefix matching (`"page"` matches `"page:2"`) is enabled with `.prefix()`.

## Database

```ts
// In-memory (dev / tests)
DatabaseBuilder.memory()

// JSON file persistence
DatabaseBuilder.create().file("./data/bot.json").build()

// Prisma / Drizzle / custom
DatabaseBuilder.create().custom(prisma, {
  connect: () => prisma.$connect(),
  disconnect: () => prisma.$disconnect(),
}).build()
```

Extend `MemoryAdapter` or `FileAdapter` for typed helpers (see `examples/database-bot/`).

## Config

```ts
// From environment (validates with Zod)
ConfigBuilder.fromEnv().build()

// Explicit values
ConfigBuilder.create()
  .token("...")
  .clientId("...")
  .guildId("...")           // optional — fast dev deploy
  .prefix("!")
  .ownerIds("123", "456")
  .registerCommandsGlobally(false)
  .deployCommandsOnStart(true)
  .logLevel("info")
  .build()
```

### Environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `DISCORD_TOKEN` or `BOT_TOKEN` | Yes | — |
| `CLIENT_ID` or `DISCORD_CLIENT_ID` | Yes | — |
| `GUILD_ID` | No | — |
| `BOT_PREFIX` | No | `!` |
| `REGISTER_COMMANDS_GLOBALLY` | No | `false` |
| `DEPLOY_COMMANDS_ON_START` | No | `true` |
| `LOG_LEVEL` | No | `info` |
| `GRACEFUL_SHUTDOWN` | No | `true` |
| `BOT_OWNER_IDS` | No | — |

## Middleware

```ts
MiddlewareBuilder.create()
  .log()              // log each command
  .handleErrors()     // catch and reply on failure
  .owners("123")     // restrict following middleware / halt
  .defer(true)        // auto-defer replies
  .use(myCustomMw)    // custom middleware
  .build()

// Shorthand
MiddlewareBuilder.defaults()  // .log().handleErrors()
```

Per-command middleware: `.use(mw)` on `CommandBuilder` or `CommandGroupBuilder`.

## Plugins

```ts
PluginBuilder.create("analytics")
  .setup((builder) => builder.command(statsCmd))
  .onReady(async (services) => { ... })
  .onStart(async (services) => { ... })
  .onStop(async (services) => { ... })
  .build()
```

## Embeds & pagination

```ts
EmbedBuilder.success("Done", "All good").build()
EmbedBuilder.error("Failed").field("Reason", "timeout").build()

await PaginatorBuilder.create()
  .page("Page 1")
  .page("Page 2")
  .timeout(60_000)
  .forUser(userId)
  .send(message);
```

## Production lifecycle

```ts
const bot = await BotBuilder.create()...build();

await bot.start();          // connect DB, deploy commands, login
await bot.deployCommands(); // deploy without starting (CI/CD)
const health = bot.getHealth();  // uptime, guilds, status, …
await bot.stop();           // graceful shutdown (SIGINT/SIGTERM handled by default)
```

## Examples

| Example | Description |
|---------|-------------|
| [basic-bot](./examples/basic-bot/) | Ping, greet, builder defaults |
| [database-bot](./examples/database-bot/) | Custom typed `MemoryAdapter` store |
| [production-bot](./examples/production-bot/) | Full builder showcase |

## Scripts

```bash
npm run build       # Compile ESM + CJS + types
npm run typecheck   # Typecheck src + examples
npm test            # Run 152 unit tests
npm run dev         # Watch mode
```

## Production checklist

- [ ] Use `ConfigBuilder.fromEnv()` — never hardcode tokens
- [ ] Use `DatabaseBuilder.create().file()` or `.custom(prisma)` — not memory in prod
- [ ] Add `MiddlewareBuilder.defaults()` globally
- [ ] Set `.ownerIds()` for admin commands
- [ ] Use `guildId` in dev, `registerCommandsGlobally(true)` in production
- [ ] Run `bot.deployCommands()` in CI before deploy
- [ ] Enable `gracefulShutdown(true)` (default)
- [ ] Monitor with `bot.getHealth()`

## License

MIT
