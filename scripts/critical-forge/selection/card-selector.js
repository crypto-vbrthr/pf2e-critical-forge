import { matchCard, normalizeSelectionContext } from "./card-matcher.js";

export class CardSelector {
  #cardRegistry;

  constructor({ cardRegistry }) {
    this.#cardRegistry = cardRegistry;
  }

  candidates(context, { excludeCardIds = [], includeRejected = true } = {}) {
    const normalized = normalizeSelectionContext(context);
    const excluded = new Set(excludeCardIds.map(String));
    const evaluated = this.#cardRegistry
      .list({ category: normalized.category })
      .map((card) => excluded.has(card.id)
        ? Object.freeze({
            card,
            eligible: false,
            rejectedBy: ["excludedCardIds"],
            matchedFilters: [],
            specificity: 0,
            baseWeight: card.weight,
            effectiveWeight: 0
          })
        : matchCard(card, normalized));

    return Object.freeze({
      context: normalized,
      eligible: evaluated.filter((entry) => entry.eligible),
      rejected: includeRejected ? evaluated.filter((entry) => !entry.eligible) : [],
      totalWeight: evaluated.reduce((sum, entry) => sum + entry.effectiveWeight, 0)
    });
  }

  select(context, { excludeCardIds = [], random = Math.random } = {}) {
    if (typeof random !== "function") throw new TypeError("random must be a function.");
    const result = this.candidates(context, { excludeCardIds, includeRejected: true });
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
