import { describe, it, expect } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import { checkPermissions } from "../src/utils/permissions.js";
import { mockGuildMember } from "./helpers/discord-mocks.js";

describe("checkPermissions", () => {
  it("allows owner bypass regardless of other checks", () => {
    const result = checkPermissions(null, { ownerIds: ["owner1"], roleIds: ["admin"] }, "owner1");
    expect(result).toEqual({ allowed: true });
  });

  it("allows commands without guild permissions in DMs", () => {
    expect(checkPermissions(null, {}, "user1")).toEqual({ allowed: true });
  });

  it("denies role-gated commands in DMs", () => {
    const result = checkPermissions(null, { roleIds: ["admin"] }, "user1");
    expect(result).toEqual({
      allowed: false,
      reason: "This command can only be used in a server.",
    });
  });

  it("denies when member lacks required role", () => {
    const member = mockGuildMember({ roleIds: ["member"] });
    const result = checkPermissions(member, { roleIds: ["admin"] }, "user1");
    expect(result).toEqual({ allowed: false, reason: "You don't have the required role." });
  });

  it("allows when member has one of required roles", () => {
    const member = mockGuildMember({ roleIds: ["mod", "member"] });
    const result = checkPermissions(member, { roleIds: ["admin", "mod"] }, "user1");
    expect(result).toEqual({ allowed: true });
  });

  it("denies when member lacks member permission", () => {
    const member = mockGuildMember({ memberPermissions: [] });
    const result = checkPermissions(member, { memberPermissions: ["BanMembers"] }, "user1");
    expect(result).toEqual({ allowed: false, reason: "You don't have the required permissions." });
  });

  it("allows when member has required permission", () => {
    const member = mockGuildMember({ memberPermissions: [PermissionFlagsBits.BanMembers] });
    const result = checkPermissions(member, { memberPermissions: ["BanMembers"] }, "user1");
    expect(result).toEqual({ allowed: true });
  });

  it("denies when bot lacks required permission", () => {
    const member = mockGuildMember({ botPermissions: [] });
    const result = checkPermissions(member, { botPermissions: ["ManageMessages"] }, "user1");
    expect(result).toEqual({
      allowed: false,
      reason: "I don't have the required permissions to run this command.",
    });
  });

  it("allows when bot has required permission", () => {
    const member = mockGuildMember({ botPermissions: [PermissionFlagsBits.ManageMessages] });
    const result = checkPermissions(member, { botPermissions: ["ManageMessages"] }, "user1");
    expect(result).toEqual({ allowed: true });
  });
});
