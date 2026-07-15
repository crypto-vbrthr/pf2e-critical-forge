import { matchCard, normalizeSelectionContext } from "./card-matcher.js";
import { cardProfileMultiplier, resolveCardProfile } from "../profile/card-profile.js";

export class CardSelector {
  #cardRegistry;

  constructor({ cardRegistry }) {
    this.#cardRegistry = cardRegistry;
  }

  candidates(context, { excludeCardIds = [], includeRejected = true, profile = null } = {}) {
    const normalized = normalizeSelectionContext(context);
    const excluded = new Set(excludeCardIds.map(String));
    const resolvedProfile = profile ? resolveCardProfile(profile) : null;
    const evaluated = this.#cardRegistry
      .list({ category: normalized.category })
      .map((card) => {
        const matched = excluded.has(card.id)
          ? Object.freeze({
              card,
              eligible: false,
              rejectedBy: ["excludedCardIds"],
              matchedFilters: [],
              specificity: 0,
              baseWeight: card.weight,
              effectiveWeight: 0
            })
          : matchCard(card, normalized);
        const profileMultiplier = matched.eligible && resolvedProfile
          ? cardProfileMultiplier(card, resolvedProfile)
          : matched.eligible ? 1 : 0;
        return Object.freeze({
          ...matched,
          unprofiledWeight: matched.effectiveWeight,
          profileId: resolvedProfile?.id ?? null,
          profileMultiplier,
          effectiveWeight: matched.effectiveWeight * profileMultiplier
        });
      });

    return Object.freeze({
      context: normalized,
      profile: resolvedProfile,
      eligible: evaluated.filter((entry) => entry.eligible),
      rejected: includeRejected ? evaluated.filter((entry) => !entry.eligible) : [],
      totalWeight: evaluated.reduce((sum, entry) => sum + entry.effectiveWeight, 0)
    });
  }

  select(context, { excludeCardIds = [], random = Math.random, profile = null } = {}) {
    if (typeof random !== "function") throw new TypeError("random must be a function.");
    const result = this.candidates(context, { excludeCardIds, includeRejected: true, profile });
    if (!result.eligible.length || result.totalWeight <= 0) {
      return Object.freeze({ ...result, selected: null, roll: null });
    }

    const raw = Number(random());
    const roll = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), 0.9999999999999999);
    let cursor = roll * result.totalWeight;
    let selected = result.eligible.at(-1).card;
    for (const candidate of result.eligible) {
      cursor -= candidate.effectiveWeight;
      if (cursor < 0) {
        selected = candidate.card;
        break;
      }
    }

    return Object.freeze({ ...result, selected, roll });
  }
}
