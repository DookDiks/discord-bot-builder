import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type APIButtonComponent,
  type APISelectMenuComponent,
  type APITextInputComponent,
} from "discord.js";

export { ButtonStyle, TextInputStyle };

/** Fluent helper for creating action row buttons. */
export class ButtonRowBuilder {
  private readonly row = new ActionRowBuilder<ButtonBuilder>();

  primary(customId: string, label: string): this {
    this.row.addComponents(new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Primary));
    return this;
  }

  secondary(customId: string, label: string): this {
    this.row.addComponents(new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary));
    return this;
  }

  danger(customId: string, label: string): this {
    this.row.addComponents(new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Danger));
    return this;
  }

  success(customId: string, label: string): this {
    this.row.addComponents(new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Success));
    return this;
  }

  link(url: string, label: string): this {
    this.row.addComponents(new ButtonBuilder().setURL(url).setLabel(label).setStyle(ButtonStyle.Link));
    return this;
  }

  build(): ActionRowBuilder<ButtonBuilder> {
    return this.row;
  }
}

/** Fluent helper for string select menus. */
export class SelectMenuRowBuilder {
  private readonly customId: string;
  private placeholder = "Select an option";
  private options: Array<{ label: string; value: string; description?: string; emoji?: string }> = [];
  private minValues = 1;
  private maxValues = 1;

  constructor(customId: string) {
    this.customId = customId;
  }

  setPlaceholder(text: string): this {
    this.placeholder = text;
    return this;
  }

  addOption(label: string, value: string, description?: string): this {
    this.options.push({ label, value, description });
    return this;
  }

  setMinMax(min: number, max: number): this {
    this.minValues = min;
    this.maxValues = max;
    return this;
  }

  build(): ActionRowBuilder<StringSelectMenuBuilder> {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(this.customId)
      .setPlaceholder(this.placeholder)
      .setMinValues(this.minValues)
      .setMaxValues(this.maxValues)
      .addOptions(this.options.map((o) => ({ label: o.label, value: o.value, description: o.description })));
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }
}

/** Fluent helper for modals. */
export class ModalFormBuilder {
  private readonly modal: ModalBuilder;
  private currentRow = new ActionRowBuilder<TextInputBuilder>();

  constructor(customId: string, title: string) {
    this.modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  }

  textInput(
    customId: string,
    label: string,
    opts?: { style?: TextInputStyle; placeholder?: string; required?: boolean; minLength?: number; maxLength?: number; value?: string },
  ): this {
    const input = new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(opts?.style ?? TextInputStyle.Short)
      .setRequired(opts?.required ?? true);
    if (opts?.placeholder) input.setPlaceholder(opts.placeholder);
    if (opts?.minLength !== undefined) input.setMinLength(opts.minLength);
    if (opts?.maxLength !== undefined) input.setMaxLength(opts.maxLength);
    if (opts?.value) input.setValue(opts.value);
    this.currentRow.addComponents(input);
    this.modal.addComponents(this.currentRow);
    this.currentRow = new ActionRowBuilder<TextInputBuilder>();
    return this;
  }

  build(): ModalBuilder {
    return this.modal;
  }
}

export type { APIButtonComponent, APISelectMenuComponent, APITextInputComponent };
