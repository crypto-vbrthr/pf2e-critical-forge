import test from "node:test";
import assert from "node:assert/strict";
import { prepareRuntimeContextView } from "../scripts/critical-forge/diagnostics/diagnostic-runtime-view.js";

test("runtime diagnostic view formats snapshot participants and health", () => {
  const view = prepareRuntimeContextView({
    schemaVersion: 1,
    provider: "core-pf2e",
    providerVersion: "1.0.0",
    roles: { roller: "source", opponent: "target" },
    roll: { family: "savingThrow", saveType: "reflex" },
    participants: {
      source: { name: "Hero", level: 8, hp: { current: 21, max: 50, temp: 4, ratio: 0.42 } },
      target: { name: "Dragon", level: 12, hp: { current: 100, max: 100, temp: 0, ratio: 1 } }
    },
    battlefield: { hostileThreatCount: 3, threatEvaluation: "explicit" }
  });

  assert.equal(view.hasSnapshot, true);
  assert.equal(view.snapshotProvider, "core-pf2e 1.0.0");
  assert.equal(view.rollerName, "Hero");
  assert.equal(view.rollerHp, "21 / 50 (+4)");
  assert.equal(view.rollerHpRatio, "42 %");
  assert.equal(view.opponentName, "Dragon");
  assert.equal(view.hostileThreatCount, "3");
});

test("runtime diagnostic view has stable placeholders without a snapshot", () => {
  const view = prepareRuntimeContextView(null);
  assert.equal(view.hasSnapshot, false);
  assert.equal(view.snapshotVersion, "—");
  assert.equal(view.rollerName, "—");
  assert.equal(view.rollerHp, "—");
  assert.equal(view.hostileThreatCount, "—");
});

test("runtime diagnostic view prepares per-token battlefield threat evidence", () => {
  const view = prepareRuntimeContextView({
    roles: { roller: "source" },
    participants: { source: { name: "Hero" } },
    battlefield: {
      hostileThreatCount: 1,
      threatEvaluation: "scene-analysis",
      threatSummary: { candidateCount: 2, countedCount: 1, rejectedCount: 1 },
      hostileThreats: [
        {
          actorId: "goblin",
          name: "Goblin",
          sourceAlliance: "party",
          alliance: "opposition",
          enemy: true,
          dead: false,
          canAttack: true,
          perception: { state: "concealed", source: "actor-status", knownPosition: true },
          distance: { value: 5, units: "ft" },
          lineOfSight: { clear: true, blocked: false, method: "token-sight-collision" },
          selectedAttack: { name: "Dogslicer", reach: 5 },
          counted: true,
          rejectedBy: []
        },
        {
          actorId: "archer",
          name: "Archer",
          sourceAlliance: "party",
          alliance: "opposition",
          enemy: true,
          dead: false,
          canAttack: true,
          perception: { state: "hidden", source: "explicit", knownPosition: true },
          distance: { value: 15, units: "ft" },
          lineOfSight: { clear: true, blocked: false, method: "token-sight-collision" },
          selectedAttack: null,
          counted: false,
          rejectedBy: ["out-of-reach"]
        }
      ]
    }
  });

  assert.equal(view.hasHostileThreatDetails, true);
  assert.equal(view.threatCandidateCount, "2");
  assert.equal(view.hostileThreats[0].statusClass, "valid");
  assert.equal(view.hostileThreats[0].distance, "5 ft");
  assert.equal(view.hostileThreats[0].attackName, "Dogslicer");
  assert.equal(view.hostileThreats[1].rejectionKeys[0], "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonOutOfReach");
});
