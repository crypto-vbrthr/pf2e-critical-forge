import { normalizeStringArray, intersect } from "../utils.js";

export function normalizeSelectionContext(context = {}) {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new TypeError("Card selection context must be an object.");
  }
  return Object.freeze({
    category: String(context.category ?? "").trim(),
    damageTypes: normalizeStringArray(context.damageTypes ?? []),
    weaponGroups: normalizeStringArray(context.weaponGroups ?? []),
    attackTraits: normalizeStringArray(context.attackTraits ?? []),
    saveTypes: normalizeStringArray(context.saveTypes ?? []),
    spellTraditions: normalizeStringArray(context.spellTraditions ?? []),
    spellTraits: normalizeStringArray(context.spellTraits ?? []),
    sourceTraits: normalizeStringArray(context.sourceTraits ?? []),
    targetTraits: normalizeStringArray(context.targetTraits ?? []),
    requiredTags: normalizeStringArray(context.requiredTags ?? []),
    excludedTags: normalizeStringArray(context.excludedTags ?? [])
  });
}

export function matchCard(card, rawContext = {}) {
  const context = normalizeSelectionContext(rawContext);
  const rejectedBy = [];
  const matchedFilters = [];
  let specificity = 0;

  if (card.category !== context.category) rejectedBy.push("category");
  matchAny("damageTypes", card.filters.damageTypes, context.damageTypes);
  matchAny("weaponGroups", card.filters.weaponGroups, context.weaponGroups);
  matchAll("attackTraits", card.filters.attackTraits, context.attackTraits);
  excludeAny("excludedAttackTraits", card.filters.excludedAttackTraits, context.attackTraits);
  matchAny("saveTypes", card.filters.saveTypes, context.saveTypes);
  matchAny("spellTraditions", card.filters.spellTraditions, context.spellTraditions);
  matchAll("spellTraits", card.filters.spellTraits, context.spellTraits);
  matchAll("sourceTraits", card.filters.sourceTraits, context.sourceTraits);
  matchAll("targetTraits", card.filters.targetTraits, context.targetTraits);
  excludeAny("excludedSourceTraits", card.filters.excludedSourceTraits, context.sourceTraits);
  excludeAny("excludedTargetTraits", card.filters.excludedTargetTraits, context.targetTraits);

  if (context.requiredTags.some((tag) => !card.tags.includes(tag))) rejectedBy.push("requiredTags");
  if (context.excludedTags.some((tag) => card.tags.includes(tag))) rejectedBy.push("excludedTags");

  const eligible = rejectedBy.length === 0;
  const effectiveWeight = eligible ? card.weight * (1 + specificity) : 0;
  return Object.freeze({
    card,
    eligible,
    rejectedBy,
    matchedFilters,
    specificity,
    baseWeight: card.weight,
    effectiveWeight
  });

  function matchAny(name, expected, actual) {
    if (!expected.length) return;
    const matches = intersect(expected, actual);
    if (!matches.length) rejectedBy.push(name);
    else {
      matchedFilters.push({ filter: name, values: matches });
      specificity += 1;
    }
  }

  function matchAll(name, expected, actual) {
    if (!expected.length) return;
    const missing = expected.filter((value) => !actual.includes(value));
    if (missing.length) rejectedBy.push(name);
    else {
      matchedFilters.push({ filter: name, values: [...expected] });
      specificity += 1;
    }
  }

  function excludeAny(name, excluded, actual) {
    if (!excluded.length) return;
    const conflicts = intersect(excluded, actual);
    if (conflicts.length) rejectedBy.push(name);
    else specificity += 1;
  }
}
