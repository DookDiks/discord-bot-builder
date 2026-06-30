import { describe, it, expect } from "vitest";
import { ComponentRegistry } from "../src/components/ComponentRegistry.js";
import {
  ButtonRowBuilder,
  SelectMenuRowBuilder,
  ModalFormBuilder,
  ButtonStyle,
  TextInputStyle,
} from "../src/components/builders.js";
import { ComponentType } from "discord.js";

describe("ComponentRegistry", () => {
  it("resolves exact and prefix buttons", () => {
    const registry = new ComponentRegistry();
    registry.button({ customId: "confirm", execute: async () => {} });
    registry.button({ customId: "page", prefix: true, execute: async () => {} });

    expect(registry.resolveButton("confirm")).toBeDefined();
    expect(registry.resolveButton("page:2")).toBeDefined();
    expect(registry.resolveButton("unknown")).toBeUndefined();
  });

  it("prefers exact button match over prefix", () => {
    const registry = new ComponentRegistry();
    const exact = { customId: "action", execute: async () => {} };
    registry.button(exact);
    registry.button({ customId: "act", prefix: true, execute: async () => {} });

    expect(registry.resolveButton("action")).toBe(exact);
  });

  it("resolves exact and prefix select menus", () => {
    const registry = new ComponentRegistry();
    registry.selectMenu({ customId: "pick", execute: async () => {} });
    registry.selectMenu({ customId: "filter", prefix: true, execute: async () => {} });

    expect(registry.resolveSelectMenu("pick")).toBeDefined();
    expect(registry.resolveSelectMenu("filter:color")).toBeDefined();
    expect(registry.resolveSelectMenu("missing")).toBeUndefined();
  });

  it("resolves exact and prefix modals", () => {
    const registry = new ComponentRegistry();
    registry.modal({ customId: "signup", execute: async () => {} });
    registry.modal({ customId: "edit", prefix: true, execute: async () => {} });

    expect(registry.resolveModal("signup")).toBeDefined();
    expect(registry.resolveModal("edit:profile")).toBeDefined();
  });

  it("tracks component counts", () => {
    const registry = new ComponentRegistry();
    registry.button({ customId: "a", execute: async () => {} });
    registry.button({ customId: "b", prefix: true, execute: async () => {} });
    registry.selectMenu({ customId: "s", execute: async () => {} });
    registry.modal({ customId: "m", execute: async () => {} });

    expect(registry.buttonCount).toBe(2);
    expect(registry.selectMenuCount).toBe(1);
    expect(registry.modalCount).toBe(1);
  });
});

describe("ButtonRowBuilder", () => {
  it("builds rows with all button styles", () => {
    const row = new ButtonRowBuilder()
      .primary("p", "Primary")
      .secondary("s", "Secondary")
      .danger("d", "Danger")
      .success("ok", "Success")
      .link("https://example.com", "Link")
      .build();

    const components = row.toJSON().components;
    expect(components).toHaveLength(5);
    expect(components[0]).toMatchObject({ custom_id: "p", style: ButtonStyle.Primary });
    expect(components[4]).toMatchObject({ style: ButtonStyle.Link, url: "https://example.com" });
  });
});

describe("SelectMenuRowBuilder", () => {
  it("builds string select menu with options and min/max", () => {
    const row = new SelectMenuRowBuilder("choices")
      .setPlaceholder("Pick one")
      .addOption("Red", "red", "Warm")
      .addOption("Blue", "blue")
      .setMinMax(1, 2)
      .build();

    const menu = row.toJSON().components[0];
    expect(menu?.type).toBe(ComponentType.StringSelect);
    expect(menu).toMatchObject({
      custom_id: "choices",
      placeholder: "Pick one",
      min_values: 1,
      max_values: 2,
    });
  });
});

describe("ModalFormBuilder", () => {
  it("builds modal with text inputs", () => {
    const modal = new ModalFormBuilder("form", "My Form")
      .textInput("name", "Name", { placeholder: "Enter name", maxLength: 50 })
      .textInput("bio", "Bio", { style: TextInputStyle.Paragraph, required: false, value: "hello" })
      .build();

    const json = modal.toJSON();
    expect(json.custom_id).toBe("form");
    expect(json.title).toBe("My Form");
    expect(json.components).toHaveLength(2);
  });
});
