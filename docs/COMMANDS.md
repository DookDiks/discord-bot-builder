# Commands Guide

## Slash commands

```ts
import { CommandBuilder, PermissionFlagsBits } from "@svacmai/discord-bot-builder";

const ban = new CommandBuilder("ban", "Ban a member")
  .addUserOption("user", "Member to ban", { required: true })
  .addStringOption("reason", "Reason", { maxLength: 200 })
  .addIntegerOption("days", "Delete message days", { minValue: 0, maxValue: 7 })
  .cooldown(5, "guild")
  .guildOnly()
  .permissions({ memberPermissions: [PermissionFlagsBits.BanMembers] })
  .defer(true)
  .execute(async (ctx) => {
    const user = ctx.options.user as { id: string };
    await ctx.editReply({ content: `Banned <@${user.id}>` });
  });
```

### All option types

| Method | Type |
|--------|------|
| `.addStringOption()` | STRING |
| `.addIntegerOption()` | INTEGER |
| `.addNumberOption()` | NUMBER |
| `.addBooleanOption()` | BOOLEAN |
| `.addUserOption()` | USER |
| `.addChannelOption()` | CHANNEL |
| `.addRoleOption()` | ROLE |
| `.addAttachmentOption()` | ATTACHMENT |

### Location guards

```ts
.guildOnly()  // Reject in DMs
.dmOnly()     // Reject in servers
```

### Auto-defer for long commands

```ts
.defer(true)   // Defer + ephemeral
.defer(false)  // Defer publicly
```

## Subcommands

```ts
import { CommandGroupBuilder } from "@svacmai/discord-bot-builder";

const economy = new CommandGroupBuilder("eco", "Economy system")
  .subcommand("balance", "Check balance", (b) =>
    b.addUserOption("user", "Target", { required: false })
     .execute(async (ctx) => {
       const store = ctx.services.db as MyStore;
       const id = (ctx.options.user as { id: string } | undefined)?.id ?? ctx.user.id;
       await ctx.reply({ content: `Balance: ${store.getBalance(id)}` });
     }),
  )
  .subcommand("pay", "Send coins", (b) =>
    b.addUserOption("to", "Recipient", { required: true })
     .addIntegerOption("amount", "Amount", { required: true, minValue: 1 })
     .execute(async (ctx) => { /* ... */ }),
  );
```

### Nested subcommand groups

```ts
const admin = new CommandGroupBuilder("admin", "Admin tools")
  .group("roles", "Role management", (g) =>
    g.subcommand("add", "Add role", (b) => b.execute(async () => {}))
     .subcommand("remove", "Remove role", (b) => b.execute(async () => {})),
  );
// Produces: /admin roles add, /admin roles remove
```

Access subcommand in handler via `ctx.subcommand` and `ctx.subcommandGroup`.

## Autocomplete

```ts
const play = new CommandBuilder("play", "Play a track")
  .addStringOption("track", "Track name", { required: true, autocomplete: true })
  .autocomplete(async (ctx) => {
    const tracks = await searchTracks(ctx.focusedValue);
    await ctx.respond(tracks.map((t) => ({ name: t.title, value: t.id })));
  })
  .execute(async (ctx) => {
    await ctx.reply({ content: `Playing: ${ctx.options.track}` });
  });
```

## Context menus

### User context menu (right-click user)

```ts
import { UserContextMenuBuilder } from "@svacmai/discord-bot-builder";

const avatar = new UserContextMenuBuilder("Show Avatar")
  .execute(async (ctx) => {
    await ctx.reply({
      content: ctx.targetUser.displayAvatarURL({ size: 512 }),
    });
  });

builder.userContextMenu(avatar);
```

### Message context menu (right-click message)

```ts
import { MessageContextMenuBuilder } from "@svacmai/discord-bot-builder";

const pin = new MessageContextMenuBuilder("Quick Pin")
  .permissions({ memberPermissions: [PermissionFlagsBits.ManageMessages] })
  .execute(async (ctx) => {
    await ctx.targetMessage.pin();
    await ctx.reply({ content: "Pinned!", ephemeral: true });
  });
```

## Prefix commands

```ts
import { MessageCommandBuilder } from "@svacmai/discord-bot-builder";

const help = new MessageCommandBuilder("help", "Show commands")
  .aliases("h", "commands")
  .guildOnly()
  .execute(async (ctx) => {
    await ctx.reply("!ping, !help, !stats");
  });

builder.messageCommand(help).prefix("!");
```

## Deploying commands

Commands deploy automatically on `bot.start()` by default. Disable with:

```ts
.deployCommandsOnStart(false)
```

Deploy manually (CI/CD):

```ts
const bot = await builder.build();
await bot.deployCommands();
// or
await CommandRegistry.deployCommands(registry, token, clientId, { guildId });
```

### Dev vs production

| Environment | Config |
|-------------|--------|
| Development | `.guildId("your_test_server_id")` — instant registration |
| Production | `.registerCommandsGlobally(true)` — up to 1 hour propagation |

## CommandContext reference

```ts
ctx.interaction     // ChatInputCommandInteraction
ctx.user            // User who ran the command
ctx.member          // GuildMember | null
ctx.options         // Parsed option values
ctx.subcommand      // Subcommand name | null
ctx.subcommandGroup // Subcommand group name | null
ctx.services.db     // DatabaseAdapter
ctx.services.client // discord.js Client
ctx.services.logger // Logger
ctx.reply()         // Reply to interaction
ctx.deferReply()    // Defer reply
ctx.editReply()     // Edit deferred reply
ctx.followUp()      // Follow-up message
```
