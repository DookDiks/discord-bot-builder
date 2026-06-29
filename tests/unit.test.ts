import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CooldownManager } from "../src/utils/CooldownManager.js";
import { MemoryAdapter } from "../src/database/MemoryAdapter.js";
import { FileAdapter } from "../src/database/FileAdapter.js";
import { CommandBuilder } from "../src/commands/CommandBuilder.js";
import { CommandGroupBuilder } from "../src/commands/CommandGroupBuilder.js";
import { CommandRegistry } from "../src/commands/CommandRegistry.js";
import { ComponentRegistry } from "../src/components/ComponentRegistry.js";
import { loadConfigFromEnv, validateConfig } from "../src/config/schema.js";
import { ConfigurationError } from "../src/errors/index.js";
import { checkPermissions } from "../src/utils/permissions.js";
import { EmbedBuilder } from "../src/utils/embeds.js";
import { unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("CooldownManager", () => {
  const manager = new CooldownManager();

  it("returns not on cooldown initially", () => {
    const result = manager.isOnCooldown("ping", "user1", { seconds: 5 });
    expect(result.onCooldown).toBe(false);
  });

  it("returns on cooldown after set", () => {
    manager.setCooldown("ping", "user1", { seconds: 60 });
    const result = manager.isOnCooldown("ping", "user1", { seconds: 60 });
    expect(result.onCooldown).toBe(true);
    if (result.onCooldown) expect(result.remainingSeconds).toBeGreaterThan(0);
  });
});

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.connect();
  });

  it("stores and retrieves values", () => {
    adapter.set("key", { value: 42 });
    expect(adapter.get("key")).toEqual({ value: 42 });
  });

  it("lists keys by prefix", () => {
    adapter.set("user:1", 1);
    adapter.set("user:2", 2);
    adapter.set("guild:1", 3);
    expect(adapter.keys("user:")).toEqual(["user:1", "user:2"]);
  });
});

describe("FileAdapter", () => {
  const testFile = join(tmpdir(), `dbb-test-${Date.now()}.json`);

  afterEach(async () => {
    const adapter = new FileAdapter(testFile);
    if (adapter.isConnected()) await adapter.disconnect();
    if (existsSync(testFile)) unlinkSync(testFile);
  });

  it("persists data to disk", async () => {
    const adapter = new FileAdapter(testFile);
    await adapter.connect();
    adapter.set("persist", "value");
    await adapter.disconnect();

    const adapter2 = new FileAdapter(testFile);
    await adapter2.connect();
    expect(adapter2.get("persist")).toBe("value");
    await adapter2.disconnect();
  });
});

describe("CommandBuilder", () => {
  it("builds a valid command definition", () => {
    const cmd = new CommandBuilder("ping", "Pong")
      .cooldown(3)
      .guildOnly()
      .execute(async () => {})
      .build();

    expect(cmd.name).toBe("ping");
    expect(cmd.cooldown?.seconds).toBe(3);
    expect(cmd.guildOnly).toBe(true);
  });
});

describe("CommandGroupBuilder", () => {
  it("builds subcommands", () => {
    const group = new CommandGroupBuilder("mod", "Moderation")
      .subcommand("ban", "Ban user", (b) =>
        b.addUserOption("user", "Target", { required: true }).execute(async () => {}),
      )
      .build();

    expect(group.subcommands).toHaveLength(1);
    expect(group.subcommands![0]!.name).toBe("ban");
  });
});

describe("CommandRegistry", () => {
  it("deploy body includes slash commands", () => {
    const registry = new CommandRegistry();
    registry.register(
      new CommandBuilder("ping", "Pong").execute(async () => {}).build(),
    );
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.has("ping")).toBe(true);
  });
});

describe("ComponentRegistry", () => {
  it("resolves exact and prefix buttons", () => {
    const registry = new ComponentRegistry();
    registry.button({ customId: "confirm", execute: async () => {} });
    registry.button({ customId: "page", prefix: true, execute: async () => {} });

    expect(registry.resolveButton("confirm")).toBeDefined();
    expect(registry.resolveButton("page:2")).toBeDefined();
    expect(registry.resolveButton("unknown")).toBeUndefined();
  });
});

describe("Config", () => {
  it("validates config object", () => {
    const config = validateConfig({
      token: "test-token",
      clientId: "123456",
    });
    expect(config.token).toBe("test-token");
    expect(config.prefix).toBe("!");
  });

  it("throws on missing token", () => {
    expect(() => validateConfig({ clientId: "123" })).toThrow(ConfigurationError);
  });

  it("loads from env", () => {
    process.env.DISCORD_TOKEN = "env-token";
    process.env.CLIENT_ID = "env-client";
    const config = loadConfigFromEnv();
    expect(config.token).toBe("env-token");
    delete process.env.DISCORD_TOKEN;
    delete process.env.CLIENT_ID;
  });
});

describe("checkPermissions", () => {
  it("allows owner bypass", () => {
    const result = checkPermissions(null, { ownerIds: ["owner1"] }, "owner1");
    expect(result.allowed).toBe(true);
  });
});

describe("EmbedBuilder", () => {
  it("creates success embed", () => {
    const embed = EmbedBuilder.success("Done", "All good").build();
    expect(embed.data.title).toBe("Done");
    expect(embed.data.color).toBe(0x57f287);
  });
});
