import type { MiddlewareFn } from "../types/index.js";
import type { CommandContext } from "../types/index.js";

export async function runMiddleware<TDatabase>(
  middleware: MiddlewareFn<TDatabase>[],
  ctx: CommandContext<TDatabase>,
): Promise<{ halted: boolean; reason?: string }> {
  let index = 0;

  const next = async (): Promise<void> => {
    if (index >= middleware.length) return;
    const fn = middleware[index++]!;
    const result = await fn(ctx, next);
    if (result && "halt" in result && result.halt) {
      throw new HaltError(result.reason);
    }
  };

  try {
    await next();
    return { halted: false };
  } catch (err) {
    if (err instanceof HaltError) {
      return { halted: true, reason: err.reason };
    }
    throw err;
  }
}

export class HaltError extends Error {
  constructor(public readonly reason?: string) {
    super(reason ?? "Middleware halted execution");
    this.name = "HaltError";
  }
}

export function loggerMiddleware<TDatabase>(): MiddlewareFn<TDatabase> {
  return async (ctx, next) => {
    const sub = ctx.subcommand ? ` ${ctx.subcommand}` : "";
    ctx.services.logger.info(`/${ctx.interaction.commandName}${sub}`, {
      user: ctx.user.tag,
      guild: ctx.interaction.guild?.name ?? "DM",
    });
    await next();
  };
}

export function errorHandlerMiddleware<TDatabase>(): MiddlewareFn<TDatabase> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.services.logger.error(`Error in /${ctx.interaction.commandName}`, {
        err: err instanceof Error ? err.message : String(err),
      });
      const content = "Something went wrong while running this command.";
      if (ctx.interaction.replied || ctx.interaction.deferred) {
        await ctx.editReply({ content });
      } else {
        await ctx.reply({ content, ephemeral: true });
      }
    }
  };
}

/** Restrict command to bot owners configured via BotBuilder.ownerIds(). */
export function ownerOnlyMiddleware<TDatabase>(ownerIds: string[]): MiddlewareFn<TDatabase> {
  return async (ctx, next) => {
    if (!ownerIds.includes(ctx.user.id)) {
      return { halt: true, reason: "This command is restricted to bot owners." };
    }
    await next();
  };
}

/** Auto-defer replies for long-running commands. */
export function deferMiddleware<TDatabase>(ephemeral = false): MiddlewareFn<TDatabase> {
  return async (ctx, next) => {
    if (!ctx.interaction.deferred && !ctx.interaction.replied) {
      await ctx.deferReply({ ephemeral });
    }
    await next();
  };
}
