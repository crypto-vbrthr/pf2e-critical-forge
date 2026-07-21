import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = readFileSync(new URL("../templates/critical-forge/critical-diagnostic-app.hbs", import.meta.url), "utf8");

test("Diagnostics 2.0 template exposes history, replay, simulation, and pipeline phases", () => {
  assert.match(template, /data-action="replaySnapshot"/);
  assert.match(template, /data-action="replayCurrent"/);
  assert.match(template, /data-action="simulateCard"/);
  assert.match(template, /data-action="loadHistory"/);
  assert.match(template, /data-action="exportReport"/);
  assert.match(template, /CriticalDiagnostic\.Pipeline/);
  assert.match(template, /CriticalDiagnostic\.ApplicationAudit/);
  assert.match(template, /CriticalDiagnostic\.DiagnosticsPhase/);
});
