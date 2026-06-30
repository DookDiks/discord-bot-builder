import type { CooldownConfig } from "../types/index.js";

interface CooldownEntry {
  expiresAt: number;
}

const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

/**
 * Tracks per-command cooldowns in memory.
 */
export class CooldownManager {
  private readonly store = new Map<string, CooldownEntry>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS) {
    this.sweepTimer = setInterval(() => this.sweep(), sweepIntervalMs);
    this.sweepTimer.unref?.();
  }

  private key(commandName: string, scopeId: string, scope: CooldownConfig["scope"]): string {
    return `${commandName}:${scope ?? "user"}:${scopeId}`;
  }

  isOnCooldown(
    commandName: string,
    scopeId: string,
    config: CooldownConfig,
  ): { onCooldown: true; remainingSeconds: number } | { onCooldown: false } {
    const k = this.key(commandName, scopeId, config.scope);
    const entry = this.store.get(k);
    if (!entry) return { onCooldown: false };

    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    if (remaining <= 0) {
      this.store.delete(k);
      return { onCooldown: false };
    }
    return { onCooldown: true, remainingSeconds: remaining };
  }

  setCooldown(commandName: string, scopeId: string, config: CooldownConfig): void {
    const k = this.key(commandName, scopeId, config.scope);
    this.store.set(k, { expiresAt: Date.now() + config.seconds * 1000 });
  }

  clear(): void {
    this.store.clear();
  }

  /** Stop the periodic sweep timer and clear all entries. */
  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [k, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(k);
      }
    }
  }
}
