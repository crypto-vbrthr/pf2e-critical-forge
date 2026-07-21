import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { replayDiagnosticSnapshot } = await import("../scripts/critical-forge/diagnostics/diagnostic-replay.js");

const report = {
  id: "original",
  valid: true,
  source: { messageId: "message", messageUuid: "ChatMessage.message", label: "Hero" },
  context: { category: "criticalHit", damageTypes: ["slashing"] },
  metadata: { outcome: "criticalSuccess" },
  snapshot: { schemaVersion: 1, provider: "test" },
  phases: {
    context: { diagnostics: [] },
    selection: {
      eligible: [{ id: "card-a" }],
      rejected: [],
      totalWeight: 2
    }
  }
};

test("snapshot replay reuses stored context instead of current documents", () => {
  let contextReport = null;
  const { repeated, comparison } = replayDiagnosticSnapshot(report, {
    createdAt: 500,
    diagnose: (_input, options) => {
      contextReport = options.createContext();
      return {
        valid: true,
        context: contextReport.context,
        metadata: contextReport.metadata,
        snapshot: contextReport.snapshot,
        diagnostics: [],
        eligible: [{
          card: { id: "card-a", packId: "test", category: "criticalHit", tone: "neutral", impact: "light" },
          localized: { title: "A", description: "A" },
          eligible: true,
          rejectedBy: [],
          matchedFilters: [],
          conditionEvaluation: null,
          specificity: 0,
          baseWeight: 2,
          effectiveWeight: 2,
          unprofiledWeight: 2,
          profileId: "balanced",
          profileMultiplier: 1
        }],
        rejected: [],
        totalWeight: 2,
        profile: { id: "balanced" },
        trigger: { matched: true },
        triggerPolicy: {}
      };
    }
  });

  assert.deepEqual(contextReport.snapshot, report.snapshot);
  assert.equal(comparison.matched, true);
  assert.equal(repeated.origin, "snapshot-replay");
  assert.equal(repeated.replay.mode, "snapshot");
});
