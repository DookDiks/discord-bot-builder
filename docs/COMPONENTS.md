# Components Guide

Buttons, select menus, and modals extend your bot beyond slash commands.

## Buttons

### Sending buttons

```ts
import { ButtonRowBuilder } from "@svacmai/discord-bot-builder";

const row = new ButtonRowBuilder()
  .primary("vote:yes", "Yes")
  .secondary("vote:no", "No")
  .danger("vote:cancel", "Cancel")
  .link("https://discord.com", "Discord")
  .build();

await ctx.reply({ content: "Vote?", components: [row] });
```

### Handling button clicks

```ts
// Exact match
builder.button({
  customId: "confirm-delete",
  execute: async (ctx) => {
    await ctx.update({ content: "Deleted!", components: [] });
  },
});

// Prefix match — handles "page:1", "page:2", etc.
builder.button({
  customId: "page",
  prefix: true,
  execute: async (ctx) => {
    const page = ctx.customId.split(":")[1];
    await ctx.update({ content: `Page ${page}` });
  },
});
```

### ButtonContext

```ts
ctx.interaction  // ButtonInteraction
ctx.customId     // Full custom ID string
ctx.user         // Clicker
ctx.reply()      // Reply (if not yet responded)
ctx.update()     // Update the message
ctx.deferUpdate() // Acknowledge without visual change
```

## Select menus

### Sending a select menu

```ts
import { SelectMenuRowBuilder } from "@svacmai/discord-bot-builder";

const row = new SelectMenuRowBuilder("game-select")
  .setPlaceholder("Choose a game")
  .addOption("Minecraft", "minecraft", "Sandbox game")
  .addOption("Valorant", "valorant", "FPS game")
  .setMinMax(1, 3)
  .build();

await ctx.reply({ content: "Pick games:", components: [row] });
```

### Handling selection

```ts
builder.selectMenu({
  customId: "game-select",
  execute: async (ctx) => {
    await ctx.reply({
      content: `You selected: ${ctx.values.join(", ")}`,
      ephemeral: true,
    });
  },
});
```

## Modals

### Showing a modal

```ts
import { ModalFormBuilder, TextInputStyle } from "@svacmai/discord-bot-builder";

// In a button handler:
const modal = new ModalFormBuilder("feedback-form", "Send Feedback")
  .textInput("subject", "Subject", { maxLength: 100 })
  .textInput("body", "Message", { style: TextInputStyle.Paragraph, minLength: 10, maxLength: 1000 })
  .build();

await ctx.interaction.showModal(modal);
```

### Handling modal submit

```ts
builder.modal({
  customId: "feedback-form",
  execute: async (ctx) => {
    const subject = ctx.fields.subject;
    const body = ctx.fields.body;
    await ctx.reply({ content: `Received: ${subject}`, ephemeral: true });
  },
});
```

## Pagination

```ts
import { sendPaginator } from "@svacmai/discord-bot-builder";

await sendPaginator(ctx.interaction.message!, {
  pages: [
    { embeds: [EmbedBuilder.info("Page 1", "Content").build()] },
    { embeds: [EmbedBuilder.info("Page 2", "More content").build()] },
  ],
  userId: ctx.user.id,
  timeout: 60_000,
});
```

## Component limits

- Max 5 action rows per message
- Max 5 buttons per row
- Max 1 select menu per row
- customId max 100 characters
- Use prefix matching for dynamic IDs instead of registering hundreds of handlers
