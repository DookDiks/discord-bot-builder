import { PermissionFlagsBits, type GuildMember, type PermissionResolvable } from "discord.js";
import type { PermissionConfig } from "../types/index.js";

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Fluent builder for command permission requirements.
 */
export class PermissionBuilder {
  private config: PermissionConfig = {};

  static create(): PermissionBuilder {
    return new PermissionBuilder();
  }

  static owner(...ownerIds: string[]): PermissionBuilder {
    return new PermissionBuilder().owners(...ownerIds);
  }

  static role(...roleIds: string[]): PermissionBuilder {
    return new PermissionBuilder().roles(...roleIds);
  }

  roles(...roleIds: string[]): this {
    this.config.roleIds = [...(this.config.roleIds ?? []), ...roleIds];
    return this;
  }

  owners(...ownerIds: string[]): this {
    this.config.ownerIds = [...(this.config.ownerIds ?? []), ...ownerIds];
    return this;
  }

  member(...permissions: PermissionResolvable[]): this {
    const bits = permissions.map((p) => toPermissionBit(p));
    this.config.memberPermissions = [...(this.config.memberPermissions ?? []), ...bits];
    return this;
  }

  bot(...permissions: PermissionResolvable[]): this {
    const bits = permissions.map((p) => toPermissionBit(p));
    this.config.botPermissions = [...(this.config.botPermissions ?? []), ...bits];
    return this;
  }

  build(): PermissionConfig {
    return { ...this.config };
  }
}

export function checkPermissions(
  member: GuildMember | null,
  config: PermissionConfig,
  userId: string,
): PermissionCheckResult {
  if (config.ownerIds?.includes(userId)) {
    return { allowed: true };
  }

  const needsGuildMember =
    (config.roleIds?.length ?? 0) > 0 ||
    (config.memberPermissions?.length ?? 0) > 0 ||
    (config.botPermissions?.length ?? 0) > 0;

  if (!member && needsGuildMember) {
    return { allowed: false, reason: "This command can only be used in a server." };
  }

  if (!member) {
    return { allowed: true };
  }

  if (config.roleIds?.length) {
    const hasRole = config.roleIds.some((id) => member.roles.cache.has(id));
    if (!hasRole) {
      return { allowed: false, reason: "You don't have the required role." };
    }
  }

  if (config.memberPermissions?.length) {
    for (const perm of config.memberPermissions) {
      if (!member.permissions.has(perm as PermissionResolvable)) {
        return { allowed: false, reason: "You don't have the required permissions." };
      }
    }
  }

  if (config.botPermissions?.length && member.guild) {
    const botMember = member.guild.members.me;
    if (botMember) {
      for (const perm of config.botPermissions) {
        if (!botMember.permissions.has(perm as PermissionResolvable)) {
          return { allowed: false, reason: "I don't have the required permissions to run this command." };
        }
      }
    }
  }

  return { allowed: true };
}

function toPermissionBit(permission: PermissionResolvable): bigint {
  if (typeof permission === "bigint") return permission;
  if (typeof permission === "string") {
    return PermissionFlagsBits[permission as keyof typeof PermissionFlagsBits];
  }
  if (typeof permission === "number") return BigInt(permission);
  return BigInt(String(permission));
}
