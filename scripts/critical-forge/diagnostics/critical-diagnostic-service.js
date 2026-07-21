import { criticalCardSelector } from "../critical-forge.js";
import { localizeCard } from "../localization/card-localizer.js";
import { resolveCriticalContext } from "../context/context-resolver.js";
import { deepFreeze } from "../utils.js";
import { configuredCardProfile } from "../profile/card-profile.js";
import { configuredTriggerPolicy, evaluateCriticalTrigger } from "../trigger/critical-trigger-policy.js";

/**
 * Analyze PF2e input without selecting or applying a card.
 *
 * The result is suitable for diagnostics, tests, and future UI consumers.
 */
export function diagnosePf2eCriticalInput(input = {}, {
  includeRejected = true,
  excludeCardIds = [],
  createContext = (value) => resolveCriticalContext(value, { system: "pf2e" }),
  selector = criticalCardSelector,
  localize = localizeCard,
  profile = configuredCardProfile()
} = {}) {
  const contextReport = createContext(input);
  const triggerPolicy = configuredTriggerPolicy(contextReport.context.category);
  const trigger = evaluateCriticalTrigger(contextReport, triggerPolicy);
  const candidateReport = contextReport.valid
    ? selector.candidates(contextReport.context, { includeRejected, excludeCardIds, profile, snapshot: contextReport.snapshot ?? null })
    : emptyCandidateReport(contextReport.context);

  const eligible = candidateReport.eligible.map((entry) => prepareCandidate(entry, localize));
  const rejected = candidateReport.rejected.map((entry) => prepareCandidate(entry, localize));

  return deepFreeze({
    valid: contextReport.valid,
    contextReport,
    context: contextReport.context,
    metadata: contextReport.metadata,
    snapshot: contextReport.snapshot ?? null,
    diagnostics: contextReport.diagnostics,
    eligible,
    rejected,
    totalWeight: candidateReport.totalWeight,
    profile: candidateReport.profile,
    triggerPolicy,
    trigger,
    counts: {
      eligible: eligible.length,
      rejected: rejected.length,
      diagnostics: contextReport.diagnostics.length
    }
  });
}

function prepareCandidate(entry, localize) {
  return {
    card: entry.card,
    localized: localize(entry.card),
    eligible: entry.eligible,
    rejectedBy: [...entry.rejectedBy],
    conditionEvaluation: entry.conditionEvaluation,
    matchedFilters: entry.matchedFilters.map((match) => ({
      filter: match.filter,
      values: [...match.values]
    })),
    specificity: entry.specificity,
    baseWeight: entry.baseWeight,
    effectiveWeight: entry.effectiveWeight,
    unprofiledWeight: entry.unprofiledWeight,
    profileId: entry.profileId,
    profileMultiplier: entry.profileMultiplier
  };
}

function emptyCandidateReport(context) {
  return {
    context,
    eligible: [],
    rejected: [],
    totalWeight: 0
  };
}
