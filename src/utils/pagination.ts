import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ButtonInteraction,
  type Message,
  type MessageComponentInteraction,
  type MessageEditOptions,
} from "discord.js";

export interface PaginatorPage {
  content?: string;
  embeds?: MessageEditOptions["embeds"];
}

export interface PaginatorOptions {
  pages: PaginatorPage[];
  timeout?: number;
  userId?: string;
}

const PREV_ID = "paginator:prev";
const NEXT_ID = "paginator:next";
const STOP_ID = "paginator:stop";

function row(page: number, total: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(PREV_ID).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(NEXT_ID).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1),
    new ButtonBuilder().setCustomId(STOP_ID).setLabel("✕").setStyle(ButtonStyle.Danger),
  );
}

/**
 * Send a paginated message with prev/next/stop buttons.
 */
export async function sendPaginator(
  message: Message,
  options: PaginatorOptions,
): Promise<void> {
  const { pages, timeout = 120_000, userId } = options;
  if (pages.length === 0) return;

  let current = 0;
  const sent = await message.reply({
    ...pages[current],
    components: [row(current, pages.length)],
  });

  const collector = sent.createMessageComponentCollector({
    time: timeout,
    componentType: ComponentType.Button,
    filter: (i: MessageComponentInteraction) => {
      if (userId && i.user.id !== userId) {
        void i.reply({ content: "This paginator isn't for you.", ephemeral: true });
        return false;
      }
      return [PREV_ID, NEXT_ID, STOP_ID].includes(i.customId);
    },
  });

  collector.on("collect", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === STOP_ID) {
      collector.stop("stopped");
      await interaction.update({ components: [] });
      return;
    }
    if (interaction.customId === PREV_ID && current > 0) current--;
    if (interaction.customId === NEXT_ID && current < pages.length - 1) current++;
    await interaction.update({ ...pages[current], components: [row(current, pages.length)] });
  });

  collector.on("end", async () => {
    try {
      await sent.edit({ components: [] });
    } catch {
      // message may have been deleted
    }
  });
}
