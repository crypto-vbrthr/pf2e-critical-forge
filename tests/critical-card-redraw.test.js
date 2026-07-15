import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
game.user = { id: "gm-1", name: "GM", isGM: true };
game.settings = { get: (_module, key) => key === "criticalCardHistorySize" ? 10 : true };

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();
const { initializeCriticalForge } = await import("../scripts/critical-forge/critical-forge.js");
initializeCriticalForge();
const { redrawCriticalCard } = await import("../scripts/critical-forge/presentation/critical-card-redraw.js");

function message() {
  return {
    id: "message-1",
    uuid: "ChatMessage.message-1",
    flags: {
      "pf2e-critical-forge": {
        criticalCardPreview: {
          previewVersion: 3,
          cardId: "core.generic.off-balance",
          packId: "core",
          category: "criticalHit",
          sourceMessageUuid: "ChatMessage.roll-1",
          sourceMessageLabel: "Valeros",
          visibilityMode: "blind",
          context: { category: "criticalHit", damageTypes: ["slashing"], targetTraits: ["humanoid"] },
          metadata: { source: { name: "Valeros" }, target: { name: "Goblin" } },
          draw: { profileId: "balanced", history: ["core.generic.off-balance"] },
          effect: null,
          application: { status: "pending" }
        }
      }
    }
  };
}

test("redraw selects another eligible card and preserves draw history", async () => {
  const source = message();
  let update = null;
  const result = await redrawCriticalCard(source, {
    random: () => 0.99,
    renderTemplateFn: async (_path, data) => `<article>${data.cardId}</article>`,
    updateMessageFn: async (_message, data) => { update = data; }
  });
  assert.equal(result.valid, true);
  assert.notEqual(result.selected.id, "core.generic.off-balance");
  assert.deepEqual(result.history, ["core.generic.off-balance", result.selected.id]);
  assert.match(update.content, new RegExp(result.selected.id.replaceAll(".", "\\.")));
  assert.equal(update.previewData.application.status, "pending");
});

test("redraw is blocked after application", async () => {
  const source = message();
  source.flags["pf2e-critical-forge"].criticalCardPreview.application.status = "applied";
  const result = await redrawCriticalCard(source);
  assert.equal(result.valid, false);
  assert.equal(result.code, "CRITICAL_CARD_ALREADY_APPLIED");
});
