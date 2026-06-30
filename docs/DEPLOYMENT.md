# Production Deployment

## Environment configuration

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=                      # Dev only
REGISTER_COMMANDS_GLOBALLY=true # Production
DEPLOY_COMMANDS_ON_START=true
LOG_LEVEL=info
GRACEFUL_SHUTDOWN=true
BOT_OWNER_IDS=123456789,987654321
```

```ts
import { loadConfigFromEnv } from "@svacmai/discord-bot-builder";

const config = loadConfigFromEnv();
const bot = await new BotBuilder().configure(config).build();
```

## CI/CD command deployment

Deploy commands in CI before starting the bot process:

```yaml
# .github/workflows/deploy.yml
- name: Deploy Discord commands
  env:
    DISCORD_TOKEN: ${{ secrets.DISCORD_TOKEN }}
    CLIENT_ID: ${{ secrets.CLIENT_ID }}
  run: npx tsx scripts/deploy-commands.ts
```

```ts
// scripts/deploy-commands.ts
import { BotBuilder, CommandBuilder } from "@svacmai/discord-bot-builder";

const ping = new CommandBuilder("ping", "Pong").execute(async () => {});
const bot = await new BotBuilder()
  .token(process.env.DISCORD_TOKEN!)
  .clientId(process.env.CLIENT_ID!)
  .registerCommandsGlobally(true)
  .deployCommandsOnStart(false)
  .command(ping)
  .build();

await bot.deployCommands();
console.log("Commands deployed");
process.exit(0);
```

## Graceful shutdown

Enabled by default. Handles `SIGINT` and `SIGTERM`:

```ts
builder.gracefulShutdown(true); // default

// Manual shutdown
process.on("SIGINT", async () => {
  await bot.stop();
  process.exit(0);
});
```

Shutdown sequence:
1. Plugin `onStop` hooks
2. Remove signal handlers
3. Clear cooldowns
4. Database disconnect
5. Client destroy

## Health monitoring

```ts
const health = bot.getHealth();
// {
//   status: "ready",
//   uptime: 3600000,
//   guilds: 150,
//   users: 50000,
//   commands: 25,
//   databaseConnected: true,
//   startedAt: Date
// }
```

Expose via HTTP for load balancers:

```ts
import { createServer } from "node:http";

createServer((req, res) => {
  if (req.url === "/health") {
    const h = bot.getHealth();
    res.writeHead(h.status === "ready" ? 200 : 503);
    res.end(JSON.stringify(h));
  }
}).listen(3000);
```

## Logging

```ts
import { Logger } from "@svacmai/discord-bot-builder";

const logger = new Logger({ level: "info", prefix: "my-bot" });
builder.loggerInstance(logger);

// In handlers:
ctx.services.logger.info("Command ran", { user: ctx.user.id });
ctx.services.logger.error("Failed", { err: error.message });
```

## Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
services:
  bot:
    build: .
    env_file: .env
    restart: unless-stopped
    volumes:
      - ./data:/app/data  # For FileAdapter
```

## Process manager (PM2)

```json
{
  "apps": [{
    "name": "discord-bot",
    "script": "dist/index.js",
    "instances": 1,
    "autorestart": true,
    "max_memory_restart": "300M"
  }]
}
```

> Run only **one instance** per bot token. Discord does not support horizontal scaling of gateway connections.

## Security checklist

- [ ] Never commit `.env` or tokens
- [ ] Use `ownerIds()` for destructive admin commands
- [ ] Validate user input in handlers (use Zod in your app layer)
- [ ] Set `guildOnly()` on server-specific commands
- [ ] Use `permissions()` with least-privilege Discord flags
- [ ] Enable `errorHandlerMiddleware()` to prevent stack trace leaks
- [ ] Restrict bot token permissions in Developer Portal

## Dev vs production

| Setting | Development | Production |
|---------|-------------|------------|
| `guildId` | Your test server | Omit |
| `registerCommandsGlobally` | `false` | `true` |
| Database | `MemoryAdapter` | `FileAdapter` or Prisma |
| `logLevel` | `debug` | `info` or `warn` |
| Command deploy | On start | CI pipeline + on start |
