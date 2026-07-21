import { MODULE_VERSION } from "../../constants.js";
import { deepClone, deepFreeze } from "../utils.js";

export const CRITICAL_DIAGNOSTIC_REPORT_VERSION = 1;

let reportSequence = 0;

export function createDiagnosticEvaluationReport(diagnostic, {
  sourceMessage = null,
  resolverDiagnostics = [],
  origin = "manual",
  createdAt = Date.now(),
  id = null
} = {}) {
  if (!diagnostic || typeof diagnostic !== "object") {
    throw new TypeError("A Critical Forge diagnostic result is required.");
  }

  const source = sourceDescriptor(sourceMessage);
  const combinedDiagnostics = [...resolverDiagnostics, ...(diagnostic.diagnostics ?? [])]
    .map((entry) => serializableDiagnostic(entry));
  const eligible = (diagnostic.eligible ?? []).map(serializeCandidate);
  const rejected = (diagnostic.rejected ?? []).map(serializeCandidate);

  return deepFreeze({
    reportVersion: CRITICAL_DIAGNOSTIC_REPORT_VERSION,
    id: id ?? createReportId(createdAt),
    createdAt,
    moduleVersion: MODULE_VERSION,
    origin,
    source,
    valid: Boolean(diagnostic.valid),
    context: deepClone(diagnostic.context ?? {}),
    metadata: deepClone(diagnostic.metadata ?? {}),
    snapshot: deepClone(diagnostic.snapshot ?? null),
    phases: {
      context: {
        status: diagnostic.valid ? "ready" : "invalid",
        diagnostics: combinedDiagnostics,
        provider: diagnostic.snapshot?.provider ?? null,
        snapshotVersion: diagnostic.snapshot?.schemaVersion ?? null
      },
      selection: {
        status: !diagnostic.valid
          ? "blocked"
          : eligible.length > 0
            ? "ready"
            : "empty",
        trigger: deepClone(diagnostic.trigger ?? null),
        triggerPolicy: deepClone(diagnostic.triggerPolicy ?? null),
        profile: deepClone(diagnostic.profile ?? null),
        counts: {
          eligible: eligible.length,
          rejected: rejected.length,
          diagnostics: combinedDiagnostics.length
        },
        totalWeight: Number(diagnostic.totalWeight ?? 0),
        eligible,
        rejected,
        method: "analysis",
        selected: null,
        previewMessageUuid: null
      },
      application: {
        status: "not-run",
        simulation: null,
        actual: null
      }
    },
    replay: null
  });
}

export function withDiagnosticSelection(report, selection, {
  method = "weighted-random",
  previewMessageUuid = null
} = {}) {
  const selected = selection?.selected
    ? {
        id: selection.selected.id,
        packId: selection.selected.packId,
        category: selection.selected.category,
        title: selection.selected.fallbackTitle ?? selection.selected.id,
        effectiveWeight: Number(selection.eligible?.find?.((entry) => entry.card?.id === selection.selected.id)?.effectiveWeight ?? 0)
      }
    : null;

  return replaceReport(report, {
    phases: {
      ...report.phases,
      selection: {
        ...report.phases.selection,
        status: selected ? "selected" : report.phases.selection.status,
        method,
        selected,
        previewMessageUuid
      }
    }
  });
}

export function withDiagnosticSimulation(report, simulation) {
  return replaceReport(report, {
    phases: {
      ...report.phases,
      application: {
        ...report.phases.application,
        status: simulation?.valid ? "simulated" : "simulation-failed",
        simulation: deepClone(simulation ?? null)
      }
    }
  });
}

export function withDiagnosticApplication(report, actual) {
  return replaceReport(report, {
    phases: {
      ...report.phases,
      application: {
        ...report.phases.application,
        status: actual?.valid ? "applied" : "failed",
        actual: deepClone(actual ?? null)
      }
    }
  });
}

export function withDiagnosticReplay(report, replay) {
  return replaceReport(report, { replay: deepClone(replay ?? null) });
}

export function compareDiagnosticEvaluations(original, repeated, { mode = "snapshot" } = {}) {
  const originalEligible = ids(original?.phases?.selection?.eligible);
  const repeatedEligible = ids(repeated?.phases?.selection?.eligible);
  const originalRejected = ids(original?.phases?.selection?.rejected);
  const repeatedRejected = ids(repeated?.phases?.selection?.rejected);
  const changes = [];

  compareSet("eligible", originalEligible, repeatedEligible, changes);
  compareSet("rejected", originalRejected, repeatedRejected, changes);
  if (original?.valid !== repeated?.valid) {
    changes.push({ field: "valid", before: Boolean(original?.valid), after: Boolean(repeated?.valid) });
  }
  if (Number(original?.phases?.selection?.totalWeight ?? 0) !== Number(repeated?.phases?.selection?.totalWeight ?? 0)) {
    changes.push({
      field: "totalWeight",
      before: Number(original?.phases?.selection?.totalWeight ?? 0),
      after: Number(repeated?.phases?.selection?.totalWeight ?? 0)
    });
  }

  return deepFreeze({
    mode,
    matched: changes.length === 0,
    comparedAt: Date.now(),
    originalReportId: original?.id ?? null,
    repeatedReportId: repeated?.id ?? null,
    changes
  });
}


export function createDiagnosticReportExport(report) {
  const source = sanitizeFilename(report?.source?.label ?? report?.source?.messageId ?? "diagnostic");
  const timestamp = new Date(Number(report?.createdAt ?? Date.now())).toISOString().replaceAll(":", "-");
  return deepFreeze({
    filename: `pf2e-critical-forge-${source}-${timestamp}.json`,
    mimeType: "application/json",
    content: serializeDiagnosticEvaluationReport(report)
  });
}

export function serializeDiagnosticEvaluationReport(report, { pretty = true } = {}) {
  return JSON.stringify(report, null, pretty ? 2 : 0);
}

function serializeCandidate(entry) {
  const card = entry.card ?? {};
  const localized = entry.localized ?? {};
  return {
    id: card.id ?? entry.id ?? "",
    packId: card.packId ?? entry.packId ?? "",
    category: card.category ?? entry.category ?? "",
    title: localized.title ?? entry.title ?? card.fallbackTitle ?? card.id ?? "",
    description: localized.description ?? entry.description ?? card.fallbackDescription ?? "",
    tone: card.tone ?? entry.tone ?? "neutral",
    impact: card.impact ?? entry.impact ?? "narrative",
    eligible: Boolean(entry.eligible),
    rejectedBy: [...(entry.rejectedBy ?? [])],
    conditionEvaluation: deepClone(entry.conditionEvaluation ?? null),
    matchedFilters: (entry.matchedFilters ?? []).map((match) => ({
      filter: match.filter,
      values: [...(match.values ?? [])]
    })),
    specificity: Number(entry.specificity ?? 0),
    baseWeight: Number(entry.baseWeight ?? 0),
    effectiveWeight: Number(entry.effectiveWeight ?? 0),
    unprofiledWeight: Number(entry.unprofiledWeight ?? entry.effectiveWeight ?? 0),
    profileId: entry.profileId ?? null,
    profileMultiplier: Number(entry.profileMultiplier ?? 1)
  };
}

function sourceDescriptor(message) {
  return {
    messageId: message?.id ?? message?._id ?? null,
    messageUuid: message?.uuid ?? null,
    label: message?.speaker?.alias ?? message?.actor?.name ?? message?.id ?? null
  };
}

function serializableDiagnostic(entry = {}) {
  return {
    severity: entry.severity ?? "info",
    code: entry.code ?? "UNKNOWN",
    path: entry.path ?? null,
    data: deepClone(entry.data ?? {})
  };
}

function createReportId(createdAt) {
  reportSequence += 1;
  return `critical-diagnostic-${createdAt}-${reportSequence}`;
}

function replaceReport(report, patch) {
  return deepFreeze({ ...deepClone(report), ...deepClone(patch) });
}

function ids(entries = []) {
  return entries.map((entry) => String(entry.id)).sort();
}

function compareSet(field, before, after, changes) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  changes.push({ field, before, after });
}

function sanitizeFilename(value) {
  const normalized = String(value ?? "diagnostic")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "diagnostic";
}
