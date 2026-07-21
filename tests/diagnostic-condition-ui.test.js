import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
game.i18n.localize = (key) => key.endsWith(".lte") ? "≤" : key;

const { prepareDiagnosticConditionEvaluation } = await import(
  "../scripts/critical-forge/diagnostics/diagnostic-condition-view.js"
);

test("diagnostic condition view exposes actual, expected, status, and operator", () => {
  const view = prepareDiagnosticConditionEvaluation({
    configured: true,
    matched: false,
    available: false,
    counts: { groups: 1, conditions: 2, matched: 1, failed: 1, unavailable: 1 },
    root: {
      type: "group",
      mode: "all",
      conditions: [
        {
          type: "condition",
          field: "participants.source.hp.ratio",
          operator: "lte",
          expected: 0.5,
          actual: 0.4,
          matched: true,
          available: true
        },
        {
          type: "condition",
          field: "danger.score",
          operator: "gte",
          expected: 2,
          actual: null,
          matched: false,
          available: false
        }
      ]
    }
  }, { localize: (key) => key.endsWith(".lte") ? "≤" : key });
  assert.equal(view.rows[0].operatorLabel, "≤");
  assert.equal(view.rows[0].actual, "0.4");
  assert.equal(view.rows[0].statusClass, "matched");
  assert.equal(view.rows[1].actual, "—");
  assert.equal(view.rows[1].statusClass, "unavailable");
});

test("diagnostic template renders condition evidence for eligible and rejected cards", () => {
  const template = readFileSync(new URL("../templates/critical-forge/critical-diagnostic-app.hbs", import.meta.url), "utf8");
  assert.match(template, /critical-diagnostic-condition-evaluation/g);
  assert.match(template, /conditionEvaluation\.rows/g);
  assert.match(template, /CriticalDiagnostic\.ActualValue/g);
  assert.match(template, /CriticalDiagnostic\.DiagnosticsPhase/g);
});
