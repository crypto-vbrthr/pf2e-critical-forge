export function prepareDiagnosticConditionEvaluation(evaluation, {
  localize = defaultLocalize
} = {}) {
  if (!evaluation?.configured) return null;
  return {
    matched: evaluation.matched,
    available: evaluation.available,
    counts: evaluation.counts,
    rows: flattenConditionResults(evaluation.root).map((entry) => ({
      field: entry.field,
      operator: entry.operator,
      operatorLabel: localizeOperator(entry.operator, localize),
      expected: formatConditionValue(entry.expected),
      actual: formatConditionValue(entry.actual),
      matched: entry.matched,
      available: entry.available,
      statusClass: entry.matched ? "matched" : entry.available ? "failed" : "unavailable",
      icon: entry.matched ? "fa-circle-check" : entry.available ? "fa-circle-xmark" : "fa-circle-question"
    }))
  };
}

function flattenConditionResults(node) {
  if (!node) return [];
  if (node.type === "condition") return [node];
  return (node.conditions ?? []).flatMap(flattenConditionResults);
}

function formatConditionValue(value) {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function localizeOperator(operator, localize) {
  const key = `PF2E_CRITICAL_FORGE.CriticalDiagnostic.ConditionOperators.${operator}`;
  const localized = localize(key);
  return localized && localized !== key ? localized : operator;
}

function defaultLocalize(key) {
  return globalThis.game?.i18n?.localize?.(key) ?? key;
}
