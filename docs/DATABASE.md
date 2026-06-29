# Database Guide

## Adapter pattern

All database access goes through `DatabaseAdapter<TClient>`. Handlers access it via `ctx.services.db`.

## Built-in adapters

### MemoryAdapter (development)

```ts
import { MemoryAdapter } from "discord-bot-builder";

const db = new MemoryAdapter();
await db.connect();

db.set("user:123", { points: 100 });
db.get("user:123");        // { points: 100 }
db.keys("user:");          // ["user:123"]
db.has("user:123");        // true
db.delete("user:123");     // true
```

Data is lost on restart. Use for tests and prototyping only.

### FileAdapter (small production bots)

```ts
import { FileAdapter } from "discord-bot-builder";

const db = new FileAdapter("./data/store.json");
// Same API as MemoryAdapter — auto-persists to JSON on every write
```

Suitable for bots with low write volume. For high traffic, use a real database.

## Wrapping external databases

### Prisma

```ts
import { PrismaClient } from "@prisma/client";
import { createAdapter } from "discord-bot-builder";

const prisma = new PrismaClient();

const db = createAdapter(prisma, {
  connect: () => prisma.$connect(),
  disconnect: () => prisma.$disconnect(),
});

// In commands:
const client = ctx.services.db.getClient(); // PrismaClient
const count = await client.user.count();
```

### Drizzle

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { createAdapter } from "discord-bot-builder";

const orm = drizzle(pool);
const db = createAdapter(orm, {
  connect: () => pool.connect(),
  disconnect: () => pool.end(),
});
```

## Typed custom stores

Extend an adapter for domain-specific methods:

```ts
import { MemoryAdapter } from "discord-bot-builder";

interface UserData {
  points: number;
  level: number;
}

class EconomyStore extends MemoryAdapter {
  private key(id: string) { return `economy:${id}`; }

  getUser(id: string): UserData {
    return this.get<UserData>(this.key(id)) ?? { points: 0, level: 1 };
  }

  addPoints(id: string, amount: number): UserData {
    const user = this.getUser(id);
    user.points += amount;
    this.set(this.key(id), user);
    return user;
  }
}

const bot = await new BotBuilder<EconomyStore>()
  .database(new EconomyStore())
  .build();
```

## Lifecycle

```
bot.start()  → adapter.connect()
bot.stop()   → adapter.disconnect()
```

The adapter is connected before command deployment and login.

## Error handling

Database errors throw `DatabaseError`:

```ts
import { DatabaseError } from "discord-bot-builder";

try {
  await ctx.services.db.connect();
} catch (err) {
  if (err instanceof DatabaseError) {
    ctx.services.logger.error("DB failed", { err: err.message });
  }
}
```

## Choosing an adapter

| Adapter | Use case | Persistence | Scale |
|---------|----------|-------------|-------|
| MemoryAdapter | Tests, prototypes | No | Single process |
| FileAdapter | Small bots, self-hosted | Yes (JSON) | Low writes |
| createAdapter(Prisma) | Production | Yes (SQL/NoSQL) | High |
| createAdapter(Redis) | Caching, sessions | Yes (in-memory/disk) | High reads |
