import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock({
  damageTypes: {
    bleed: { label: "PF2E.Damage.RollFlavor.bleed" },
    slashing: { label: "PF2E.Damage.RollFlavor.slashing" }
  },
  conditionTypes: {
    stunned: "PF2E.ConditionTypeStunned",
    "off-guard": "PF2E.ConditionTypeOffGuard"
  }
});

const translations = new Map([
  ["PF2E.Damage.RollFlavor.bleed", "Blutung"],
  ["PF2E.Damage.RollFlavor.slashing", "Hieb"],
  ["PF2E.ConditionTypeStunned", "Benommen"],
  ["PF2E.ConditionTypeOffGuard", "Auf dem falschen Fuß"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.Categories.criticalHit", "Kritischer Treffer"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.Categories.criticalFumble", "Kritischer Fehlschlag"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.EffectTargets.target", "Ziel"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.EffectTargets.source", "Angreifer"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.PreviewNotice", "Nur Vorschau"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.Duration.Unlimited", "Unbegrenzt"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.Duration.RoundOne", "Runde"],
  ["PF2E_CRITICAL_FORGE.CriticalPreview.ChatFlavor", "Critical Forge · Vorschau"]
]);
game.i18n.localize = (key) => translations.get(key) ?? key;
game.i18n.format = (key, data = {}) => {
  const templates = {
    "PF2E_CRITICAL_FORGE.CriticalPreview.EffectTargetNamed": "{target}: {name}",
    "PF2E_CRITICAL_FORGE.CriticalPreview.Duration.Value": "{value} {unit}",
    "PF2E_CRITICAL_FORGE.CriticalPreview.Components.PersistentDamage": "{formula} anhaltender {damageType}-Schaden",
    "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Condition": "Zustand: {condition}"
  };
  return Object.entries(data).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    templates[key] ?? key
  );
};

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();
const { initializeCriticalForge } = await import("../scripts/critical-forge/critical-forge.js");
initializeCriticalForge();
const {
  prepareCriticalCardPreview,
  publishCriticalCardPreview,
  summarizeCriticalEffectDefinition
} = await import("../scripts/critical-forge/presentation/critical-card-preview.js");

test("card preview materializes localized narrative and mechanical data", () => {
  const preview = prepareCriticalCardPreview("core.slashing.deep-cut", {
    context: { category: "criticalHit", damageTypes: ["slashing"] },
    metadata: {
      source: { name: "Valeros" },
      target: { name: "Goblin" }
    },
    sourceMessage: {
      id: "message-1",
      uuid: "ChatMessage.message-1",
      speaker: { alias: "Valeros" }
    }
  });

  assert.equal(preview.cardId, "core.slashing.deep-cut");
  assert.equal(preview.categoryLabel, "Kritischer Treffer");
  assert.equal(preview.hasEffect, true);
  assert.equal(preview.effect.target, "target");
  assert.equal(preview.effect.targetDisplay, "Ziel: Goblin");
  assert.equal(preview.effect.duration, "Unbegrenzt");
  assert.match(preview.effect.components[0].summary, /1d6/);
  assert.match(preview.effect.components[0].summary, /Blutung/);
  assert.equal(preview.previewNotice, "Nur Vorschau");
  assertDeepFrozen(preview);
});

test("effect summarizer supports valued conditions and finite durations", () => {
  const summary = summarizeCriticalEffectDefinition({
    duration: { value: 1, unit: "rounds", expiry: "turn-end" },
    components: [{ type: "condition", slug: "stunned", value: 1 }]
  });

  assert.equal(summary.duration, "1 Runde");
  assert.equal(summary.components[0].summary, "Zustand: Benommen 1");
  assertDeepFrozen(summary);
});

test("publishing a preview renders one chat card without applying an effect", async () => {
  const calls = { render: null, create: null };
  const result = await publishCriticalCardPreview("core.generic.off-balance", {
    context: { category: "criticalHit" },
    metadata: { source: { name: "Valeros" }, target: { name: "Goblin" } },
    sourceMessage: {
      id: "message-2",
      uuid: "ChatMessage.message-2",
      speaker: { alias: "Valeros", actor: "actor-1" }
    },
    chatStyle: 7,
    visibilityMode: "blind",
    applyChatModeFn: (data, mode) => ({
      ...data,
      whisper: mode === "blind" ? ["gm-1"] : [],
      blind: mode === "blind"
    }),
    renderTemplateFn: async (path, data) => {
      calls.render = { path, data };
      return `<article data-card-id="${data.cardId}">${data.title}</article>`;
    },
    createMessageFn: async (data) => {
      calls.create = data;
      return { id: "preview-message" };
    }
  });

  assert.match(calls.render.path, /critical-card-preview\.hbs$/);
  assert.equal(calls.render.data.cardId, "core.generic.off-balance");
  assert.equal(calls.create.style, 7);
  assert.deepEqual(calls.create.whisper, ["gm-1"]);
  assert.equal(calls.create.blind, true);
  assert.equal(calls.create.speaker.alias, "Valeros");
  assert.match(calls.create.content, /core\.generic\.off-balance/);
  assert.equal(calls.create.flags["pf2e-critical-forge"].criticalCardPreview.cardId, "core.generic.off-balance");
  assert.equal(calls.create.flags["pf2e-critical-forge"].criticalCardPreview.effect.target, "target");
  assert.equal(calls.create.flags["pf2e-critical-forge"].criticalCardPreview.effect.definition.name.length > 0, true);
  assert.equal(calls.create.flags["pf2e-critical-forge"].criticalCardPreview.visibilityMode, "blind");
  assert.equal(calls.create.flags["pf2e-critical-forge"].criticalCardPreview.application.status, "pending");
  assert.equal(result.visibilityMode, "blind");
  assert.equal(result.message.id, "preview-message");
});
