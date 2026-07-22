import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = readFileSync(new URL("../templates/critical-forge/critical-diagnostic-app.hbs", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../styles/critical-forge.css", import.meta.url), "utf8");

test("Diagnostics 2.0 template exposes history, replay, simulation, and pipeline phases", () => {
  assert.match(template, /data-action="replaySnapshot"/);
  assert.match(template, /data-action="replayCurrent"/);
  assert.match(template, /data-action="simulateCard"/);
  assert.match(template, /data-action="loadHistory"/);
  assert.match(template, /data-action="exportReport"/);
  assert.match(template, /CriticalDiagnostic\.Pipeline/);
  assert.match(template, /CriticalDiagnostic\.ApplicationAudit/);
  assert.match(template, /CriticalDiagnostic\.DiagnosticsPhase/);
  assert.match(template, /CriticalDiagnostic\.ExtensionDiagnostics/);
  assert.match(template, /report\.extensionDiagnostics/);
});

test("Diagnostics template renders per-token battlefield threat evidence", () => {
  assert.match(template, /report\.hostileThreats/);
  assert.match(template, /CriticalDiagnostic\.ThreatDetails/);
  assert.match(template, /CriticalDiagnostic\.ThreatPerception/);
  assert.match(template, /CriticalDiagnostic\.ThreatLineOfSight/);
  assert.match(template, /rejectionKeys/);
});


test("battlefield threat diagnostics use the high-contrast Forge palette", () => {
  const start = stylesheet.indexOf("/* Phase 7: battlefield threat diagnostics */");
  assert.notEqual(start, -1);
  const threatCss = stylesheet.slice(start);

  assert.doesNotMatch(threatCss, /--color-bg-option/u);
  assert.match(threatCss, /\.critical-diagnostic-threat-entry \{[\s\S]*background:[^;]*var\(--ef-field\)/u);
  assert.match(threatCss, /\.critical-diagnostic-threat-facts span \{[\s\S]*color: var\(--ef-muted\)/u);
  assert.match(threatCss, /\.critical-diagnostic-threat-facts strong \{[\s\S]*color: var\(--ef-text\)/u);
});
