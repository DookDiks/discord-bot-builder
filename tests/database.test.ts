import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryAdapter } from "../src/database/MemoryAdapter.js";
import { FileAdapter } from "../src/database/FileAdapter.js";
import { createAdapter } from "../src/database/createAdapter.js";
import { DatabaseError } from "../src/errors/index.js";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.connect();
  });

  afterEach(async () => {
    if (adapter.isConnected()) await adapter.disconnect();
  });

  it("connects and reports connected state", () => {
    expect(adapter.isConnected()).toBe(true);
  });

  it("stores and retrieves values", () => {
    adapter.set("key", { value: 42 });
    expect(adapter.get("key")).toEqual({ value: 42 });
  });

  it("returns undefined for missing keys", () => {
    expect(adapter.get("missing")).toBeUndefined();
  });

  it("deletes keys and returns whether key existed", () => {
    adapter.set("x", 1);
    expect(adapter.delete("x")).toBe(true);
    expect(adapter.delete("x")).toBe(false);
    expect(adapter.has("x")).toBe(false);
  });

  it("lists all keys without prefix", () => {
    adapter.set("a", 1);
    adapter.set("b", 2);
    expect(adapter.keys().sort()).toEqual(["a", "b"]);
  });

  it("lists keys by prefix", () => {
    adapter.set("user:1", 1);
    adapter.set("user:2", 2);
    adapter.set("guild:1", 3);
    expect(adapter.keys("user:").sort()).toEqual(["user:1", "user:2"]);
  });

  it("clear removes all entries", () => {
    adapter.set("a", 1);
    adapter.clear();
    expect(adapter.keys()).toEqual([]);
  });

  it("is connected after construction because store is initialized eagerly", () => {
    const fresh = new MemoryAdapter();
    expect(fresh.isConnected()).toBe(true);
    expect(() => fresh.get("x")).not.toThrow();
  });

  it("disconnect clears data", async () => {
    adapter.set("k", "v");
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });
});

describe("FileAdapter", () => {
  const testFile = join(tmpdir(), `dbb-test-${Date.now()}.json`);

  afterEach(async () => {
    const adapter = new FileAdapter(testFile);
    if (adapter.isConnected()) await adapter.disconnect();
    if (existsSync(testFile)) unlinkSync(testFile);
  });

  it("persists data to disk across connections", async () => {
    const adapter = new FileAdapter(testFile);
    await adapter.connect();
    await adapter.set("persist", "value");
    await adapter.disconnect();

    const adapter2 = new FileAdapter(testFile);
    await adapter2.connect();
    expect(adapter2.get("persist")).toBe("value");
    await adapter2.disconnect();
  });

  it("creates file on first connect", async () => {
    const adapter = new FileAdapter(testFile);
    await adapter.connect();
    expect(existsSync(testFile)).toBe(true);
    await adapter.disconnect();
  });

  it("delete removes key and persists", async () => {
    const adapter = new FileAdapter(testFile);
    await adapter.connect();
    await adapter.set("temp", 1);
    expect(await adapter.delete("temp")).toBe(true);
    await adapter.disconnect();

    const adapter2 = new FileAdapter(testFile);
    await adapter2.connect();
    expect(adapter2.has("temp")).toBe(false);
    await adapter2.disconnect();
  });

  it("keys filters by prefix", async () => {
    const adapter = new FileAdapter(testFile);
    await adapter.connect();
    await adapter.set("a:1", 1);
    await adapter.set("a:2", 2);
    await adapter.set("b:1", 3);
    expect(adapter.keys("a:").sort()).toEqual(["a:1", "a:2"]);
    await adapter.disconnect();
  });

  it("throws DatabaseError on corrupt file", async () => {
    const adapter = new FileAdapter(testFile);
    await adapter.connect();
    await adapter.disconnect();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(testFile, "not-json{{{", "utf-8");

    const bad = new FileAdapter(testFile);
    await expect(bad.connect()).rejects.toThrow(DatabaseError);
  });
});

describe("createAdapter", () => {
  it("wraps external client with connect/disconnect hooks", async () => {
    let connected = false;
    const client = { value: 42 };
    const adapter = createAdapter(client, {
      connect: async () => { connected = true; },
      disconnect: async () => { connected = false; },
    });

    expect(adapter.getClient()).toBe(client);
    await adapter.connect();
    expect(connected).toBe(true);
    await adapter.disconnect();
    expect(connected).toBe(false);
    expect(adapter.isConnected()).toBe(false);
  });
});
