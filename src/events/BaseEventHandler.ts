import type { Client } from "discord.js";

export abstract class BaseEventHandler {
    protected client?: Client;

    public setClient(client: Client) {
        this.client = client;
        return this;
    }

    abstract register(): void;
}