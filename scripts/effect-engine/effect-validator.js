import { analyzeEffectDefinition } from "./validation/validation-engine.js";

function localizeIssue(issue) {
  if (issue.message) return issue.message;
  if (issue.messageKey) {
    return game.i18n.format(`PF2E_CRITICAL_FORGE.${issue.messageKey}`, issue.data ?? {});
  }
  return issue.data?.message ?? issue.code;
}

export function validateEffectDefinition(definition) {
  const report = analyzeEffectDefinition(definition);
  return {
    ...report,
    errors: report.errors.map(localizeIssue),
    warnings: report.warnings.map(localizeIssue),
    hints: report.hints.map(localizeIssue),
    information: report.information.map(localizeIssue)
  };
}
