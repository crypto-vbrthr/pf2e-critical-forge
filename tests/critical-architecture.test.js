import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();
const {
  initializeCriticalForge,
  criticalCardRegistry,
  criticalCardSelector,
  criticalPackRegistry
} = await import("../scripts/critical-forge/critical-forge.js");
const { materializeCardEffect } = await import(
  "../scripts/critical-forge/localization/card-localizer.js"
);

initializeCriticalForge();

test("bundled core pack initializes without Foundry UI integration", () => {
  assert.equal(criticalPackRegistry.has("core"), true);
  assert.equal(criticalCardRegistry.list({ packId: "core" }).length, 96);
});

test("core cards can be selected and materialized as Effect Definitions", () => {
  const selection = criticalCardSelector.select({
    category: "criticalHit",
    damageTypes: ["slashing"],
    targetTraits: ["humanoid"]
  }, { random: () => 0.99 });

  assert.ok(selection.selected);
  const result = materializeCardEffect(selection.selected, { localize: () => null });
  assert.ok(result?.definition);
  assert.equal(result.target, "target");
});
