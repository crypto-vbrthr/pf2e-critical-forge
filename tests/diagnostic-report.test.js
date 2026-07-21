import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  CRITICAL_DIAGNOSTIC_REPORT_VERSION,
  createDiagnosticEvaluationReport,
  compareDiagnosticEvaluations,
  createDiagnosticReportExport,
  serializeDiagnosticEvaluationReport,
  withDiagnosticSelection,
  withDiagnosticSimulation
} = await import("../scripts/critical-forge/diagnostics/diagnostic-report.js");

function diagnostic({ eligible = [candidate("card-a")], rejected = [], valid = true } = {}) {
  return {
    valid,
    context: { category: "criticalHit", damageTypes: ["slashing"] },
    metadata: { outcome: "criticalSuccess" },
    snapshot: { schemaVersion: 1, provider: "test" },
    diagnostics: [],
    eligible,
    rejected,
    totalWeight: eligible.reduce((sum, entry) => sum + entry.effectiveWeight, 0),
    profile: { id: "balanced" },
    trigger: { matched: true, behavior: "automatic", scope: "all" },
    triggerPolicy: { behavior: "automatic", scope: "all" }
  };
}

function candidate(id) {
  return {
    card: { id, packId: "test", category: "criticalHit", tone: "dramatic", impact: "light", fallbackTitle: id },
    localized: { title: `Title ${id}`, description: `Description ${id}` },
    eligible: true,
    rejectedBy: [],
    conditionEvaluation: { configured: false, matched: true },
    matchedFilters: [{ filter: "damageTypes", values: ["slashing"] }],
    specificity: 1,
    baseWeight: 2,
    effectiveWeight: 2,
    unprofiledWeight: 2,
    profileId: "balanced",
    profileMultiplier: 1
  };
}

test("evaluation reports serialize the three diagnostic phases", () => {
  const report = createDiagnosticEvaluationReport(diagnostic(), {
    sourceMessage: { id: "message-1", uuid: "ChatMessage.message-1", speaker: { alias: "Hero" } },
    resolverDiagnostics: [{ severity: "info", code: "RESOLVED", data: {} }],
    createdAt: 123
  });

  assert.equal(report.reportVersion, CRITICAL_DIAGNOSTIC_REPORT_VERSION);
  assert.equal(report.source.label, "Hero");
  assert.equal(report.phases.context.status, "ready");
  assert.equal(report.phases.selection.eligible[0].title, "Title card-a");
  assert.equal(report.phases.application.status, "not-run");
  assert.deepEqual(JSON.parse(serializeDiagnosticEvaluationReport(report)), report);
  const exported = createDiagnosticReportExport(report);
  assert.match(exported.filename, /^pf2e-critical-forge-Hero-/);
  assert.equal(exported.mimeType, "application/json");
  assert.deepEqual(JSON.parse(exported.content), report);
  assertDeepFrozen(report);
});

test("selection and simulation enrich a report without mutating its original", () => {
  const original = createDiagnosticEvaluationReport(diagnostic(), { createdAt: 200 });
  const selected = withDiagnosticSelection(original, {
    selected: { id: "card-a", packId: "test", category: "criticalHit", fallbackTitle: "Card A" },
    selectedEntry: { effectiveWeight: 2 }
  }, { previewMessageUuid: "ChatMessage.preview" });
  const simulated = withDiagnosticSimulation(selected, {
    valid: true,
    status: "ready",
    cardId: "card-a",
    mutatedDocuments: false
  });

  assert.equal(original.phases.selection.selected, null);
  assert.equal(selected.phases.selection.selected.id, "card-a");
  assert.equal(simulated.phases.application.status, "simulated");
  assert.equal(simulated.phases.application.simulation.mutatedDocuments, false);
  assertDeepFrozen(simulated);
});

test("replay comparison reports changed candidate pools", () => {
  const original = createDiagnosticEvaluationReport(diagnostic({ eligible: [candidate("card-a")] }), { createdAt: 300 });
  const repeated = createDiagnosticEvaluationReport(diagnostic({ eligible: [candidate("card-b")] }), { createdAt: 301 });
  const comparison = compareDiagnosticEvaluations(original, repeated, { mode: "current" });

  assert.equal(comparison.matched, false);
  assert.equal(comparison.mode, "current");
  assert.equal(comparison.changes.some((entry) => entry.field === "eligible"), true);
});
