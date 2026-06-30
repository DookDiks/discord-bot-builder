import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CooldownManager } from "../src/utils/CooldownManager.js";

describe("CooldownManager", () => {
  let manager: CooldownManager;

  beforeEach(() => {
    manager = new CooldownManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  it("returns not on cooldown when no entry exists", () => {
    expect(manager.isOnCooldown("ping", "user1", { seconds: 5 })).toEqual({ onCooldown: false });
  });

  it("returns on cooldown after setCooldown", () => {
    manager.setCooldown("ping", "user1", { seconds: 60 });
    const result = manager.isOnCooldown("ping", "user1", { seconds: 60 });
    expect(result.onCooldown).toBe(true);
    if (result.onCooldown) {
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("scopes cooldowns by user by default", () => {
    manager.setCooldown("ping", "user1", { seconds: 60 });
    expect(manager.isOnCooldown("ping", "user2", { seconds: 60 })).toEqual({ onCooldown: false });
  });

  it("scopes cooldowns by explicit scope in key", () => {
    manager.setCooldown("ping", "guild1", { seconds: 60, scope: "guild" });
    expect(manager.isOnCooldown("ping", "guild1", { seconds: 60, scope: "guild" }).onCooldown).toBe(true);
    expect(manager.isOnCooldown("ping", "guild1", { seconds: 60, scope: "user" }).onCooldown).toBe(false);
  });

  it("scopes cooldowns separately per command name", () => {
    manager.setCooldown("ping", "user1", { seconds: 60 });
    expect(manager.isOnCooldown("pong", "user1", { seconds: 60 })).toEqual({ onCooldown: false });
  });

  it("expires cooldown after duration elapses", () => {
    manager.setCooldown("ping", "user1", { seconds: 5 });
    vi.advanceTimersByTime(5001);
    expect(manager.isOnCooldown("ping", "user1", { seconds: 5 })).toEqual({ onCooldown: false });
  });

  it("clears expired entry from store on check", () => {
    manager.setCooldown("ping", "user1", { seconds: 1 });
    vi.advanceTimersByTime(2000);
    manager.isOnCooldown("ping", "user1", { seconds: 1 });
    manager.clear();
    expect(manager.isOnCooldown("ping", "user1", { seconds: 1 })).toEqual({ onCooldown: false });
  });

  it("clear removes all cooldowns", () => {
    manager.setCooldown("a", "u1", { seconds: 60 });
    manager.setCooldown("b", "u2", { seconds: 60 });
    manager.clear();
    expect(manager.isOnCooldown("a", "u1", { seconds: 60 })).toEqual({ onCooldown: false });
    expect(manager.isOnCooldown("b", "u2", { seconds: 60 })).toEqual({ onCooldown: false });
  });

  it("overwrites cooldown when set again", () => {
    manager.setCooldown("ping", "user1", { seconds: 1 });
    vi.advanceTimersByTime(500);
    manager.setCooldown("ping", "user1", { seconds: 60 });
    expect(manager.isOnCooldown("ping", "user1", { seconds: 60 }).onCooldown).toBe(true);
  });

  it("purges expired entries on periodic sweep without re-query", () => {
    const sweeping = new CooldownManager(1_000);
    sweeping.setCooldown("once", "user1", { seconds: 1 });
    vi.advanceTimersByTime(2_500);
    expect(sweeping.isOnCooldown("once", "user1", { seconds: 1 })).toEqual({ onCooldown: false });
    sweeping.destroy();
  });
});
