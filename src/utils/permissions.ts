import type { GuildMember, PermissionResolvable } from "discord.js";
import type { PermissionConfig } from "../types/index.js";

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkPermissions(
  member: GuildMember | null,
  config: PermissionConfig,
  userId: string,
): PermissionCheckResult {
  if (config.ownerIds?.includes(userId)) {
    return { allowed: true };
  }

  if (!member) {
    return { allowed: false, reason: "This command can only be used in a server." };
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
