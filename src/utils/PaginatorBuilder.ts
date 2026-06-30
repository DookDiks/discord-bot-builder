import type { Message, MessageEditOptions } from "discord.js";
import { sendPaginator, type PaginatorOptions, type PaginatorPage } from "./pagination.js";

/**
 * Fluent builder for paginated Discord messages.
 */
export class PaginatorBuilder {
  private pageList: PaginatorPage[] = [];
  private timeoutMs = 120_000;
  private userId?: string;

  static create(): PaginatorBuilder {
    return new PaginatorBuilder();
  }

  page(content: string): this;
  page(page: PaginatorPage): this;
  page(contentOrPage: string | PaginatorPage): this {
    if (typeof contentOrPage === "string") {
      this.pageList.push({ content: contentOrPage });
    } else {
      this.pageList.push(contentOrPage);
    }
    return this;
  }

  embedPage(embeds: MessageEditOptions["embeds"]): this {
    this.pageList.push({ embeds });
    return this;
  }

  addPages(list: PaginatorPage[]): this {
    this.pageList.push(...list);
    return this;
  }

  timeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  forUser(userId: string): this {
    this.userId = userId;
    return this;
  }

  buildOptions(): PaginatorOptions {
    return {
      pages: [...this.pageList],
      timeout: this.timeoutMs,
      userId: this.userId,
    };
  }

  async send(message: Message): Promise<void> {
    await sendPaginator(message, this.buildOptions());
  }
}
