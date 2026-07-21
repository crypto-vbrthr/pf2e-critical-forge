import { diagnosePf2eCriticalInput } from "./critical-diagnostic-service.js";
import {
  compareDiagnosticEvaluations,
  createDiagnosticEvaluationReport,
  withDiagnosticReplay
} from "./diagnostic-report.js";

export function replayDiagnosticSnapshot(report, {
  diagnose = diagnosePf2eCriticalInput,
  createdAt = Date.now()
} = {}) {
  if (!report?.context) throw new TypeError("A diagnostic evaluation report is required.");
  const diagnostic = diagnose({}, {
    createContext: () => ({
      valid: Boolean(report.valid),
      context: report.context,
      metadata: report.metadata,
      snapshot: report.snapshot,
      diagnostics: report.phases?.context?.diagnostics ?? []
    })
  });
  const repeated = createDiagnosticEvaluationReport(diagnostic, {
    origin: "snapshot-replay",
    createdAt,
    sourceMessage: {
      id: report.source?.messageId,
      uuid: report.source?.messageUuid,
      speaker: { alias: report.source?.label }
    }
  });
  const comparison = compareDiagnosticEvaluations(report, repeated, { mode: "snapshot" });
  return {
    repeated: withDiagnosticReplay(repeated, comparison),
    comparison
  };
}
