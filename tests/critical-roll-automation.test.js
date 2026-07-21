import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  isAttackCriticalReport,
  isPrimaryAutomationUser,
  processCriticalChatMessage
} = await import("../scripts/critical-forge/automation/critical-roll-automation.js");

function report({ action = "automatic", rollType = "attack-roll", category = "criticalHit" } = {}) {
  return {
    valid: true,
    context: { category, damageTypes: ["slashing"], weaponGroups: ["sword"] },
    metadata: {
      degreeOfSuccess: { index: ["criticalHit", "spellCriticalHit", "savingThrowCriticalSuccess"].includes(category) ? 3 : 0 },
      roll: { type: rollType, family: rollType.includes("saving") ? "savingThrow" : rollType.includes("spell") ? "spellAttack" : rollType.includes("attack") ? "attack" : "unknown", action: "strike", identifier: "strike", dieResult: 20 },
      source: { name: "Valeros", uuid: "Actor.source" },
      target: { name: "Goblin", uuid: "Actor.target" },
      attack: { name: "Longsword", isMelee: true, isRanged: false },
      rollOptions: []
    },
    trigger: { matched: true, action, reason: "matched" }
  };
}

function baseOptions(overrides = {}) {
  const activeGM = { id: "gm", isGM: true, active: true };
  return {
    user: activeGM,
    users: { activeGM },
    resolveMessageInput: async (message) => ({
      input: { message, item: { type: "weapon" } },
      diagnostics: []
    }),
    diagnose: () => report(),
    selector: {
      select: () => ({ selected: { id: "core.slashing.deep-cut" } })
    },
    publishPreview: async () => ({ message: { uuid: "ChatMessage.preview" } }),
    promptForCard: async () => true,
    random: () => 0,
    profile: { id: "balanced", toneWeights: {}, impactWeights: {} },
    recentHistory: [],
    recordHistory: async () => [],
    updateSourceMessage: async () => null,
    notify: null,
    ...overrides
  };
}

test("automatic critical attack publishes exactly one card", async () => {
  const published = [];
  const updated = [];
  const message = { id: "automatic-1", flags: {}, author: { targets: new Set() } };
  const result = await processCriticalChatMessage(message, baseOptions({
    publishPreview: async (card, options) => {
      published.push({ card, options });
      return { message: { uuid: "ChatMessage.preview" } };
    },
    updateSourceMessage: async (_message, data) => updated.push(data)
  }));

  assert.equal(result.valid, true);
  assert.equal(published.length, 1);
  assert.equal(published[0].card.id, "core.slashing.deep-cut");
  assert.equal(published[0].options.sourceMessage, message);
  assert.equal(updated.at(-1).status, "published");
});

test("prompt mode can be declined without publishing a card", async () => {
  let published = false;
  let state = null;
  const result = await processCriticalChatMessage(
    { id: "prompt-decline", flags: {} },
    baseOptions({
      diagnose: () => report({ action: "prompt" }),
      promptForCard: async () => false,
      publishPreview: async () => { published = true; },
      updateSourceMessage: async (_message, data) => { state = data; }
    })
  );

  assert.equal(result.valid, false);
  assert.equal(result.code, "CRITICAL_AUTOMATION_DECLINED");
  assert.equal(published, false);
  assert.equal(state.status, "dismissed");
});

test("non-attack critical checks are ignored", async () => {
  const result = await processCriticalChatMessage(
    { id: "skill-critical", flags: {} },
    baseOptions({
      resolveMessageInput: async (message) => ({ input: { message, item: null }, diagnostics: [] }),
      diagnose: () => {
        const value = report({ rollType: "skill-check" });
        value.metadata.roll.action = "recall-knowledge";
        value.metadata.roll.identifier = "arcana";
        value.metadata.attack.isMelee = null;
        return value;
      }
    })
  );
  assert.equal(result.valid, false);
  assert.equal(result.code, "CRITICAL_AUTOMATION_UNSUPPORTED_ROLL");
});

test("only the primary active GM handles document hooks", () => {
  const primary = { id: "a", isGM: true, active: true };
  const secondary = { id: "b", isGM: true, active: true };
  assert.equal(isPrimaryAutomationUser(primary, { activeGM: primary }), true);
  assert.equal(isPrimaryAutomationUser(secondary, { activeGM: primary }), false);
  assert.equal(isPrimaryAutomationUser({ id: "p", isGM: false, active: true }, { activeGM: primary }), false);
});

test("attack report guard rejects damage messages and accepts attack messages", () => {
  const attack = report({ rollType: "attack-roll" });
  const damage = report({ rollType: "damage-roll" });
  damage.metadata.roll.action = "strike";
  damage.metadata.roll.identifier = "longsword";
  damage.metadata.attack.isMelee = null;
  assert.equal(isAttackCriticalReport(attack, { item: { type: "spell" }, message: { flags: { pf2e: { context: { type: "attack-roll" } } } } }), true);
  assert.equal(isAttackCriticalReport(damage, { item: { type: "weapon" }, message: { flags: { pf2e: { context: { type: "damage-roll" } } } } }), false);
});

test("spell attack criticals are handled by the automatic pipeline", async () => {
  const published = [];
  const result = await processCriticalChatMessage(
    { id: "spell-critical", flags: {} },
    baseOptions({
      resolveMessageInput: async (message) => ({ input: { message, item: { type: "spell" } }, diagnostics: [] }),
      diagnose: () => {
        const value = report({ category: "spellCriticalHit", rollType: "spell-attack-roll" });
        value.metadata.attack.isSpell = true;
        value.metadata.roll.action = "spell-attack";
        return value;
      },
      publishPreview: async (card, options) => {
        published.push({ card, options });
        return { message: { uuid: "ChatMessage.spell-preview" } };
      }
    })
  );
  assert.equal(result.valid, true);
  assert.equal(published.length, 1);
  assert.equal(published[0].options.context.category, "spellCriticalHit");
});

test("critical saving throws are handled by the automatic pipeline", async () => {
  const published = [];
  const result = await processCriticalChatMessage(
    { id: "save-critical", flags: {} },
    baseOptions({
      resolveMessageInput: async (message) => ({ input: { message, item: null }, diagnostics: [] }),
      diagnose: () => {
        const value = report({ category: "savingThrowCriticalFailure", rollType: "saving-throw" });
        value.context.saveTypes = ["reflex"];
        value.metadata.roll.family = "savingThrow";
        value.metadata.roll.identifier = "reflex";
        value.metadata.roll.dieResult = 1;
        value.metadata.attack.isMelee = null;
        return value;
      },
      publishPreview: async (card, options) => {
        published.push({ card, options });
        return { message: { uuid: "ChatMessage.save-preview" } };
      }
    })
  );
  assert.equal(result.valid, true);
  assert.equal(published.length, 1);
  assert.equal(published[0].options.context.category, "savingThrowCriticalFailure");
});


test("automatic selection and preview receive the diagnostic runtime snapshot", async () => {
  const snapshot = { schemaVersion: 1, participants: { source: { hp: { ratio: 0.4 } } } };
  let selectorOptions = null;
  let previewOptions = null;
  const result = await processCriticalChatMessage(
    { id: "snapshot-critical", flags: {} },
    baseOptions({
      diagnose: () => ({ ...report(), snapshot }),
      selector: {
        select: (_context, options) => {
          selectorOptions = options;
          return { selected: { id: "core.slashing.deep-cut" } };
        }
      },
      publishPreview: async (_card, options) => {
        previewOptions = options;
        return { message: { uuid: "ChatMessage.snapshot-preview" } };
      }
    })
  );
  assert.equal(result.valid, true);
  assert.equal(selectorOptions.snapshot, snapshot);
  assert.equal(previewOptions.runtimeSnapshot, snapshot);
});
