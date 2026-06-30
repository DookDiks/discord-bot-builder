import { describe, it, expect, vi } from "vitest";
import { EventBuilder } from "../src/events/EventBuilder.js";
import { EventRegistry } from "../src/events/EventRegistry.js";

describe("EventBuilder", () => {
  it("builds event with once flag", () => {
    const evt = new EventBuilder("clientReady")
      .once()
      .execute(async () => {})
      .build();

    expect(evt.name).toBe("clientReady");
    expect(evt.once).toBe(true);
  });

  it("defaults once to false", () => {
    const evt = new EventBuilder("messageCreate").execute(async () => {}).build();
    expect(evt.once).toBe(false);
  });

  it("returns shallow copy on build", () => {
    const builder = new EventBuilder("ping").execute(async () => {});
    expect(builder.build()).not.toBe(builder.build());
  });
});

describe("EventRegistry", () => {
  it("registers and retrieves events", () => {
    const registry = new EventRegistry();
    const evt = new EventBuilder("clientReady").execute(async () => {}).build();
    registry.register(evt);

    expect(registry.get("clientReady")).toBe(evt);
    expect(registry.getAll()).toHaveLength(1);
  });

  it("registerMany adds multiple events", () => {
    const registry = new EventRegistry();
    registry.registerMany([
      new EventBuilder("a").execute(async () => {}).build(),
      new EventBuilder("b").execute(async () => {}).build(),
    ]);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("overwrites event with same name on re-register", () => {
    const registry = new EventRegistry();
    const first = new EventBuilder("x").execute(async () => {}).build();
    const second = new EventBuilder("x").once().execute(async () => {}).build();
    registry.register(first);
    registry.register(second);
    expect(registry.get("x")).toBe(second);
    expect(registry.getAll()).toHaveLength(1);
  });
});
