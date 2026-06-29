import type {
  ButtonDefinition,
  ModalDefinition,
  SelectMenuDefinition,
} from "../types/index.js";

/**
 * Registry for button, select menu, and modal interaction handlers.
 */
export class ComponentRegistry<TDatabase = unknown> {
  private readonly buttons = new Map<string, ButtonDefinition<TDatabase>>();
  private readonly buttonPrefixes: ButtonDefinition<TDatabase>[] = [];
  private readonly selects = new Map<string, SelectMenuDefinition<TDatabase>>();
  private readonly selectPrefixes: SelectMenuDefinition<TDatabase>[] = [];
  private readonly modals = new Map<string, ModalDefinition<TDatabase>>();
  private readonly modalPrefixes: ModalDefinition<TDatabase>[] = [];

  button(def: ButtonDefinition<TDatabase>): this {
    if (def.prefix) {
      this.buttonPrefixes.push(def);
    } else {
      this.buttons.set(def.customId, def);
    }
    return this;
  }

  selectMenu(def: SelectMenuDefinition<TDatabase>): this {
    if (def.prefix) {
      this.selectPrefixes.push(def);
    } else {
      this.selects.set(def.customId, def);
    }
    return this;
  }

  modal(def: ModalDefinition<TDatabase>): this {
    if (def.prefix) {
      this.modalPrefixes.push(def);
    } else {
      this.modals.set(def.customId, def);
    }
    return this;
  }

  resolveButton(customId: string): ButtonDefinition<TDatabase> | undefined {
    const exact = this.buttons.get(customId);
    if (exact) return exact;
    return this.buttonPrefixes.find((b) => customId.startsWith(`${b.customId}:`));
  }

  resolveSelectMenu(customId: string): SelectMenuDefinition<TDatabase> | undefined {
    const exact = this.selects.get(customId);
    if (exact) return exact;
    return this.selectPrefixes.find((s) => customId.startsWith(`${s.customId}:`));
  }

  resolveModal(customId: string): ModalDefinition<TDatabase> | undefined {
    const exact = this.modals.get(customId);
    if (exact) return exact;
    return this.modalPrefixes.find((m) => customId.startsWith(`${m.customId}:`));
  }

  get buttonCount(): number {
    return this.buttons.size + this.buttonPrefixes.length;
  }

  get selectMenuCount(): number {
    return this.selects.size + this.selectPrefixes.length;
  }

  get modalCount(): number {
    return this.modals.size + this.modalPrefixes.length;
  }
}
