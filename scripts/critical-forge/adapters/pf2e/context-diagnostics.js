import { deepFreeze } from "../../utils.js";

const SEVERITIES = new Set(["error", "warning", "info"]);

export function diagnostic(code, {
  severity = "warning",
  path = null,
  data = {}
} = {}) {
  const normalizedSeverity = SEVERITIES.has(severity) ? severity : "warning";
  return deepFreeze({
    severity: normalizedSeverity,
    code: String(code),
    path: path == null ? null : String(path),
    data: { ...data }
  });
}

export function createAdapterReport({ context, metadata, diagnostics = [] }) {
  const issues = diagnostics.map((entry) => diagnostic(entry.code, entry));
  const errors = issues.filter((entry) => entry.severity === "error");
  const warnings = issues.filter((entry) => entry.severity === "warning");
  const information = issues.filter((entry) => entry.severity === "info");
  return deepFreeze({
    valid: errors.length === 0,
    context,
    metadata,
    diagnostics: issues,
    errors,
    warnings,
    information
  });
}
