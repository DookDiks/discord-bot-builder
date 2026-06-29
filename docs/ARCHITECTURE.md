# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                      BotBuilder                         │
│  token · clientId · database · commands · events · ...  │
└────────────────────────┬────────────────────────────────┘
                         │ .build()
                         ▼
┌─────────────────────────────────────────────────────────┐
│                       BuiltBot                          │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │   Client    │  │ InteractionRouter │  │  Logger   │  │
│  │ (discord.js)│  │  slash · button  │  │           │  │
│  └─────────────┘  │  select · modal    │  └───────────┘  │
│                   │  context · prefix  │                 │
│  ┌─────────────┐  └──────────────────┘  ┌───────────┐  │
│  │  EventRegistry│                       │ Database  │  │
│  └─────────────┘                          │  Adapter  │  │
│                                           └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Request flow (slash command)

1. Discord sends `interactionCreate`
2. `InteractionRouter` identifies interaction type
3. For slash commands:
   - Resolve command + subcommand from `CommandRegistry`
   - Check location (guildOnly/dmOnly)
   - Check permissions (roles, member perms, owners)
   - Check cooldown
   - Auto-defer if configured
   - Run global middleware → command middleware → subcommand middleware
   - Execute handler with typed `CommandContext`
   - Apply cooldown

## Service injection

Every handler receives `ctx.services`:

```ts
interface BotServices<TDatabase> {
  db: DatabaseAdapter<TDatabase>;  // Your database
  client: Client;                   // discord.js client
  logger: Logger;                   // Structured logger
}
```

## Registries

| Registry | Purpose |
|----------|---------|
| `CommandRegistry` | Slash commands, context menus, deploy to Discord API |
| `EventRegistry` | Discord gateway events |
| `ComponentRegistry` | Button, select menu, modal handlers |

## Database adapters

All adapters extend `DatabaseAdapter<TClient>`:

```
DatabaseAdapter (abstract)
├── MemoryAdapter      — in-memory Map (dev/test)
├── FileAdapter        — JSON file persistence (small bots)
└── createAdapter()    — wrap Prisma, Drizzle, Mongo, etc.
```

## Plugin lifecycle

```
setup(builder)     → during BotBuilder.build()
onStart(services)  → after login, before ready
onReady(services)  → on clientReady event
onStop(services)   → during graceful shutdown
```

## Type generics

Use `BotBuilder<MyStore>` to get typed `ctx.services.db`:

```ts
class GameStore extends MemoryAdapter {
  getScore(id: string): number { return this.get(`score:${id}`) ?? 0; }
}

const bot = await new BotBuilder<GameStore>()
  .database(new GameStore())
  .build();
```
