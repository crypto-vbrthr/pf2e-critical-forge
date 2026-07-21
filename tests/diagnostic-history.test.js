import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { CriticalDiagnosticHistory } = await import("../scripts/critical-forge/diagnostics/diagnostic-history.js");

test("diagnostic history is session-local, newest-first, and bounded", () => {
  const history = new CriticalDiagnosticHistory({ limit: 2 });
  history.record({ id: "one", source: { messageUuid: "ChatMessage.one" } });
  history.record({ id: "two", source: { messageUuid: "ChatMessage.two" } });
  history.record({ id: "three", source: { messageUuid: "ChatMessage.three" } });

  assert.deepEqual(history.list().map((entry) => entry.id), ["three", "two"]);
  assert.equal(history.get("one"), null);
  assert.equal(history.findBySourceMessageUuid("ChatMessage.two").id, "two");
  assert.equal(history.size, 2);
});

test("diagnostic history updates reports without leaking mutable state", () => {
  const history = new CriticalDiagnosticHistory();
  history.record({ id: "one", phases: { application: { status: "not-run" } } });
  const updated = history.update("one", (report) => {
    report.phases.application.status = "simulated";
    return report;
  });

  assert.equal(updated.phases.application.status, "simulated");
  assert.equal(Object.isFrozen(updated), true);
  assert.equal(history.clear(), 1);
  assert.equal(history.size, 0);
});
