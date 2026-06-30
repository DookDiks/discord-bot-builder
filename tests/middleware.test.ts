import { describe, it, expect, vi } from "vitest";
import {
  runMiddleware,
  HaltError,
  loggerMiddleware,
  errorHandlerMiddleware,
  ownerOnlyMiddleware,
  deferMiddleware,
} from "../src/middleware/index.js";
import type { CommandContext } from "../src/types/index.js";

function mockCommandContext(overrides: Partial<CommandContext> = {}): CommandContext {
  const reply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const deferReply = vi.fn().mockResolvedValue(undefined);

  return {
    interaction: {
      commandName: "test",
      guild: { name: "Test Guild" },
      deferred: false,
      replied: false,
    },
    user: { id: "user-1", tag: "user#0001" },
    member: null,
    options: {},
    subcommand: null,
    subcommandGroup: null,
    services: {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
    },
    reply,
    deferReply,
    editReply,
    followUp: vi.fn(),
    ...overrides,
  } as unknown as CommandContext;
}

describe("runMiddleware", () => {
  it("runs middleware in order", async () => {
    const order: number[] = [];
    const ctx = mockCommandContext();
    const result = await runMiddleware(
      [
        async (_ctx, next) => { order.push(1); await next(); },
        async (_ctx, next) => { order.push(2); await next(); },
        async () => { order.push(3); },
      ],
      ctx,
    );

    expect(result).toEqual({ halted: false });
    expect(order).toEqual([1, 2, 3]);
  });

  it("returns halted when middleware returns halt", async () => {
    const ctx = mockCommandContext();
    const result = await runMiddleware(
      [
        async () => ({ halt: true, reason: "blocked" }),
        async (_ctx, next) => { await next(); },
      ],
      ctx,
    );

    expect(result).toEqual({ halted: true, reason: "blocked" });
  });

  it("rethrows non-HaltError exceptions", async () => {
    const ctx = mockCommandContext();
    await expect(
      runMiddleware([async () => { throw new Error("boom"); }], ctx),
    ).rejects.toThrow("boom");
  });

  it("handles HaltError thrown from next chain", async () => {
    const ctx = mockCommandContext();
    const result = await runMiddleware(
      [
        async (_ctx, next) => {
          try {
            await next();
          } catch (err) {
            if (err instanceof HaltError) throw err;
          }
        },
        async () => ({ halt: true, reason: "stop" }),
      ],
      ctx,
    );
    expect(result).toEqual({ halted: true, reason: "stop" });
  });
});

describe("HaltError", () => {
  it("uses default message when reason omitted", () => {
    const err = new HaltError();
    expect(err.message).toBe("Middleware halted execution");
    expect(err.reason).toBeUndefined();
  });
});

describe("loggerMiddleware", () => {
  it("logs command invocation and calls next", async () => {
    const ctx = mockCommandContext({ subcommand: "ban" });
    const next = vi.fn().mockResolvedValue(undefined);
    await loggerMiddleware()(ctx, next);

    expect(ctx.services.logger.info).toHaveBeenCalledWith("/test ban", {
      user: "user#0001",
      guild: "Test Guild",
    });
    expect(next).toHaveBeenCalled();
  });

  it("logs DM when guild missing", async () => {
    const ctx = mockCommandContext();
    ctx.interaction.guild = undefined;
    const next = vi.fn().mockResolvedValue(undefined);
    await loggerMiddleware()(ctx, next);
    expect(ctx.services.logger.info).toHaveBeenCalledWith("/test", expect.objectContaining({ guild: "DM" }));
  });
});

describe("errorHandlerMiddleware", () => {
  it("logs error and replies when not yet replied", async () => {
    const ctx = mockCommandContext();
    const next = vi.fn().mockRejectedValue(new Error("fail"));
    await errorHandlerMiddleware()(ctx, next);

    expect(ctx.services.logger.error).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "Something went wrong while running this command.",
      ephemeral: true,
    });
  });

  it("editReply when already replied", async () => {
    const ctx = mockCommandContext();
    ctx.interaction.replied = true;
    const next = vi.fn().mockRejectedValue("bad");
    await errorHandlerMiddleware()(ctx, next);
    expect(ctx.editReply).toHaveBeenCalledWith({
      content: "Something went wrong while running this command.",
    });
  });
});

describe("ownerOnlyMiddleware", () => {
  it("halts non-owners", async () => {
    const ctx = mockCommandContext();
    const result = await ownerOnlyMiddleware(["owner-1"])(ctx, vi.fn());
    expect(result).toEqual({ halt: true, reason: "This command is restricted to bot owners." });
  });

  it("allows owners through", async () => {
    const ctx = mockCommandContext();
    ctx.user.id = "owner-1";
    const next = vi.fn().mockResolvedValue(undefined);
    const result = await ownerOnlyMiddleware(["owner-1"])(ctx, next);
    expect(result).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

describe("deferMiddleware", () => {
  it("defers reply when not deferred or replied", async () => {
    const ctx = mockCommandContext();
    const next = vi.fn().mockResolvedValue(undefined);
    await deferMiddleware(true)(ctx, next);
    expect(ctx.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(next).toHaveBeenCalled();
  });

  it("skips defer when already deferred", async () => {
    const ctx = mockCommandContext();
    ctx.interaction.deferred = true;
    const next = vi.fn().mockResolvedValue(undefined);
    await deferMiddleware()(ctx, next);
    expect(ctx.deferReply).not.toHaveBeenCalled();
  });
});
