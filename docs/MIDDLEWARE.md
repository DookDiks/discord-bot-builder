# Middleware & Plugins

## Middleware

Middleware runs before command handlers in order. Return `{ halt: true, reason: "..." }` to stop execution.

### Built-in middleware

```ts
import {
  loggerMiddleware,
  errorHandlerMiddleware,
  ownerOnlyMiddleware,
  deferMiddleware,
} from "@svacmai/discord-bot-builder";

builder
  .use(loggerMiddleware())           // Log every command
  .use(errorHandlerMiddleware())     // Catch unhandled errors
  .use(ownerOnlyMiddleware(["id"]))  // Restrict to owners
  .use(deferMiddleware(true));        // Auto-defer all commands
```

### Custom middleware

```ts
import type { MiddlewareFn } from "@svacmai/discord-bot-builder";

const maintenanceMode: MiddlewareFn = async (ctx, next) => {
  const isMaintenance = ctx.services.db.get<boolean>("maintenance");
  if (isMaintenance) {
    return { halt: true, reason: "Bot is under maintenance." };
  }
  await next();
};

builder.use(maintenanceMode);
```

### Per-command middleware

```ts
const adminCmd = new CommandBuilder("admin", "Admin panel")
  .use(async (ctx, next) => {
    if (!ctx.member?.permissions.has("Administrator")) {
      return { halt: true, reason: "Admins only." };
    }
    await next();
  })
  .execute(async (ctx) => { /* ... */ });
```

### Middleware execution order

```
Global middleware (builder.use)
  → Command middleware (command.use)
    → Subcommand middleware (subcommand.use)
      → Handler (command.execute)
```

## Plugins

Plugins bundle commands, events, and lifecycle logic.

```ts
import type { BotPlugin } from "@svacmai/discord-bot-builder";

const statsPlugin: BotPlugin = {
  name: "stats",

  setup(builder) {
    builder.command(
      new CommandBuilder("stats", "Server stats").execute(async (ctx) => {
        const count = ctx.interaction.guild?.memberCount ?? 0;
        await ctx.reply({ content: `Members: ${count}` });
      }),
    );
    builder.event(
      new EventBuilder("guildMemberAdd").execute(async (ctx) => {
        ctx.services.logger.info("Member joined");
      }),
    );
  },

  async onStart(services) {
    services.logger.info("Stats plugin started");
  },

  async onReady(services) {
    services.logger.info("Stats plugin ready");
  },

  async onStop(services) {
    await services.db.set("lastShutdown", new Date().toISOString());
  },
};

builder.plugin(statsPlugin);
```

### Plugin lifecycle

| Hook | When |
|------|------|
| `setup(builder)` | During `build()` — register commands/events |
| `onStart(services)` | After login |
| `onReady(services)` | On `clientReady` event |
| `onStop(services)` | During `stop()` |

## Events

```ts
import { EventBuilder } from "@svacmai/discord-bot-builder";

builder
  .event(new EventBuilder("guildMemberAdd").execute(async (ctx) => {
    const [member] = ctx.args as [GuildMember];
    ctx.services.logger.info(`${member.user.tag} joined`);
  }))
  .event(new EventBuilder("messageDelete").execute(async (ctx) => {
    const [message] = ctx.args as [Message];
    // log deletion
  }))
  .onReady(async (ctx) => {
    ctx.services.logger.info(`Logged in as ${ctx.client.user?.tag}`);
  });
```

Use `.once()` on EventBuilder for one-time events:

```ts
new EventBuilder("clientReady").once().execute(async () => {});
```

## Intents

```ts
import { IntentBuilder } from "@svacmai/discord-bot-builder";

builder.intents(
  IntentBuilder.default()
    .members()       // GuildMembers — privileged
    .moderation()    // GuildModeration
    .presences()     // GuildPresences — privileged
    .dms(),
);
```

Enable privileged intents in the [Discord Developer Portal](https://discord.com/developers/applications).
