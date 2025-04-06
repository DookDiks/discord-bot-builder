import { Message, Events } from "discord.js";
import { BaseEventHandler } from "./BaseEventHandler";

export class CreateMessageEvent extends BaseEventHandler {
  private handler?: (message: Message) => void;

  public on(handler: (message: Message) => void) {
    this.handler = handler;
    return this;
  }

  public register() {
    if (!this.client || !this.handler) return;

    this.client.on(Events.MessageCreate, async (message) => {
      await this.handler?.(message);
    });
  }
}
