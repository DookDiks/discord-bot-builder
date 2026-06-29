# API Reference

## BotBuilder

| Method | Returns | Description |
|--------|---------|-------------|
| `token(string)` | `this` | Bot token |
| `clientId(string)` | `this` | Application ID |
| `guildId(string)` | `this` | Dev guild for command registration |
| `prefix(string)` | `this` | Message command prefix (default `!`) |
| `ownerIds(...ids)` | `this` | Bot owner user IDs |
| `registerCommandsGlobally(bool)` | `this` | Deploy commands globally |
| `deployCommandsOnStart(bool)` | `this` | Auto-deploy on start (default true) |
| `logLevel(level)` | `this` | Logger level |
| `gracefulShutdown(bool)` | `this` | SIGINT/SIGTERM handling |
| `intents(IntentBuilder)` | `this` | Gateway intents |
| `loggerInstance(Logger)` | `this` | Custom logger |
| `database(adapter)` | `this` | Database adapter |
| `command(builder\|def)` | `this` | Register slash command |
| `commands(array)` | `this` | Register multiple commands |
| `messageCommand(builder\|def)` | `this` | Register prefix command |
| `userContextMenu(builder\|def)` | `this` | Register user context menu |
| `messageContextMenu(builder\|def)` | `this` | Register message context menu |
| `button(def)` | `this` | Register button handler |
| `selectMenu(def)` | `this` | Register select menu handler |
| `modal(def)` | `this` | Register modal handler |
| `event(builder\|def)` | `this` | Register Discord event |
| `onReady(handler)` | `this` | `clientReady` shorthand |
| `use(middleware)` | `this` | Global middleware |
| `plugin(plugin)` | `this` | Register plugin |
| `configure(BotConfig)` | `this` | Apply config object |
| `getCommandRegistry()` | `CommandRegistry` | Access registry |
| `build()` | `Promise<BuiltBot>` | Build bot instance |

## BuiltBot

| Method / Property | Description |
|-------------------|-------------|
| `start()` | Connect DB, deploy commands, login |
| `stop()` | Graceful shutdown |
| `deployCommands()` | Deploy without starting |
| `getHealth()` | Health status snapshot |
| `discord` | discord.js `Client` |
| `serviceContainer` | `{ db, client, logger }` |
| `commandRegistry` | `CommandRegistry` |

## CommandBuilder

| Method | Description |
|--------|-------------|
| `addStringOption(name, desc, opts?)` | String option |
| `addIntegerOption(name, desc, opts?)` | Integer option |
| `addNumberOption(name, desc, opts?)` | Number option |
| `addBooleanOption(name, desc, opts?)` | Boolean option |
| `addUserOption(name, desc, opts?)` | User option |
| `addChannelOption(name, desc, opts?)` | Channel option |
| `addRoleOption(name, desc, opts?)` | Role option |
| `addAttachmentOption(name, desc, opts?)` | Attachment option |
| `addOption(def)` | Custom option |
| `cooldown(seconds, scope?)` | Cooldown |
| `permissions(config)` | Permission requirements |
| `guildOnly()` | Server only |
| `dmOnly()` | DMs only |
| `defer(ephemeral?)` | Auto-defer |
| `ephemeral()` | Ephemeral replies |
| `autocomplete(handler)` | Autocomplete handler |
| `use(middleware)` | Per-command middleware |
| `execute(handler)` | Command handler |
| `build()` | `CommandDefinition` |

## CommandGroupBuilder

| Method | Description |
|--------|-------------|
| `subcommand(name, desc, configure)` | Add subcommand |
| `group(name, desc, configure)` | Add subcommand group |
| `cooldown(seconds, scope?)` | Group-wide cooldown |
| `permissions(config)` | Group-wide permissions |
| `guildOnly()` | Server only |
| `use(middleware)` | Group-wide middleware |
| `build()` | `CommandDefinition` |

## DatabaseAdapter

| Method | Description |
|--------|-------------|
| `connect()` | Connect (abstract) |
| `disconnect()` | Disconnect (abstract) |
| `getClient()` | Underlying client |
| `isConnected()` | Connection status |

## MemoryAdapter / FileAdapter

| Method | Description |
|--------|-------------|
| `get<T>(key)` | Get value |
| `set<T>(key, value)` | Set value |
| `delete(key)` | Delete key |
| `has(key)` | Check existence |
| `keys(prefix?)` | List keys |
| `clear()` | Clear all (Memory only) |
| `flush()` | Write to disk (File only) |

## Config

| Export | Description |
|--------|-------------|
| `loadConfigFromEnv(overrides?)` | Load from env vars |
| `validateConfig(obj)` | Validate config object |
| `botConfigSchema` | Zod schema |

## Errors

| Class | Code |
|-------|------|
| `BotError` | Base error |
| `ConfigurationError` | `CONFIGURATION_ERROR` |
| `CommandExecutionError` | `COMMAND_EXECUTION_ERROR` |
| `PermissionDeniedError` | `PERMISSION_DENIED` |
| `DatabaseError` | `DATABASE_ERROR` |
| `InteractionError` | `INTERACTION_ERROR` |

## Middleware

| Export | Description |
|--------|-------------|
| `loggerMiddleware()` | Log commands |
| `errorHandlerMiddleware()` | Catch errors |
| `ownerOnlyMiddleware(ids)` | Owner restriction |
| `deferMiddleware(ephemeral?)` | Auto-defer |
| `runMiddleware(chain, ctx)` | Run chain manually |

## Utilities

| Export | Description |
|--------|-------------|
| `IntentBuilder` | Gateway intent builder |
| `EmbedBuilder` | Embed helper |
| `sendPaginator(message, opts)` | Paginated messages |
| `ButtonRowBuilder` | Button action rows |
| `SelectMenuRowBuilder` | Select menu rows |
| `ModalFormBuilder` | Modal forms |
| `CooldownManager` | Cooldown tracking |
| `checkPermissions(member, config, userId)` | Permission check |
| `createAdapter(client, hooks)` | Wrap external DB |
