import type { MiddlewareFn } from "../types/index.js";
import {
  deferMiddleware,
  errorHandlerMiddleware,
  loggerMiddleware,
  ownerOnlyMiddleware,
} from "./index.js";

/**
 * Fluent builder for global middleware chains.
 *
 * @example
 * ```ts
 * MiddlewareBuilder.create()
 *   .log()
 *   .handleErrors()
 *   .owners("123")
 *   .build()
 * ```
 */
export class MiddlewareBuilder<TDatabase = unknown> {
  private readonly chain: MiddlewareFn<TDatabase>[] = [];

  static create<TDatabase = unknown>(): MiddlewareBuilder<TDatabase> {
    return new MiddlewareBuilder<TDatabase>();
  }

  static defaults<TDatabase = unknown>(): MiddlewareBuilder<TDatabase> {
    return new MiddlewareBuilder<TDatabase>().log().handleErrors();
  }

  use(middleware: MiddlewareFn<TDatabase>): this {
    this.chain.push(middleware);
    return this;
  }

  log(): this {
    this.chain.push(loggerMiddleware<TDatabase>());
    return this;
  }

  handleErrors(): this {
    this.chain.push(errorHandlerMiddleware<TDatabase>());
    return this;
  }

  owners(...ownerIds: string[]): this {
    this.chain.push(ownerOnlyMiddleware<TDatabase>(ownerIds));
    return this;
  }

  defer(ephemeral = false): this {
    this.chain.push(deferMiddleware<TDatabase>(ephemeral));
    return this;
  }

  build(): MiddlewareFn<TDatabase>[] {
    return [...this.chain];
  }
}
