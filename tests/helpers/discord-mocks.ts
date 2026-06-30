import { PermissionFlagsBits, type GuildMember, type PermissionResolvable } from "discord.js";

export function mockPermissions(has: PermissionResolvable[] = []): {
  has: (perm: PermissionResolvable) => boolean;
} {
  const set = new Set(
    has.map((p) => (typeof p === "bigint" ? p : PermissionFlagsBits[p as keyof typeof PermissionFlagsBits])),
  );
  return {
    has: (perm: PermissionResolvable) => {
      const bit = typeof perm === "bigint" ? perm : PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
      return set.has(bit);
    },
  };
}

export function mockGuildMember(options: {
  userId?: string;
  roleIds?: string[];
  memberPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
} = {}): GuildMember {
  const {
    userId = "user-1",
    roleIds = [],
    memberPermissions = [],
    botPermissions = [],
  } = options;

  const rolesCache = new Map(roleIds.map((id) => [id, { id }]));

  const botMember = {
    permissions: mockPermissions(botPermissions),
  };

  return {
    id: userId,
    roles: {
      cache: {
        has: (id: string) => rolesCache.has(id),
      },
    },
    permissions: mockPermissions(memberPermissions),
    guild: {
      members: {
        me: botMember,
      },
    },
  } as unknown as GuildMember;
}
