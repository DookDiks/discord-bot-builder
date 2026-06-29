import type { CooldownConfig } from "../types/index.js";

interface CooldownEntry {
  expiresAt: number;
}

/**
 * Tracks per-command cooldowns in memory.
 */
export class CooldownManager {
  private readonly store = new Map<string, CooldownEntry>();

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
}
