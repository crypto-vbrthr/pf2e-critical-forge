import { CARD_SCHEMA_VERSION, EFFECT_SCHEMA_VERSION } from "../../constants.js";

export const CORE_CARD_DURATIONS = Object.freeze({
  ONE_ROUND: Object.freeze({ value: 1, unit: "rounds", expiry: "turn-end" }),
  UNLIMITED: Object.freeze({ value: -1, unit: "unlimited", expiry: null })
});

const EMPTY_FILTERS = Object.freeze({
  damageTypes: Object.freeze([]),
  weaponGroups: Object.freeze([]),
  attackTraits: Object.freeze([]),
  saveTypes: Object.freeze([]),
  spellTraditions: Object.freeze([]),
  spellTraits: Object.freeze([]),
  sourceTraits: Object.freeze([]),
  targetTraits: Object.freeze([]),
  excludedSourceTraits: Object.freeze([]),
  excludedTargetTraits: Object.freeze([])
});

export function defineCoreCard({
  id,
  namespace,
  key,
  category,
  tone,
  impact,
  fallbackTitle,
  fallbackDescription,
  weight = 1,
  tags = [],
  filters = {},
  effect = null
}) {
  const localizationRoot = `PF2E_CRITICAL_FORGE.CriticalForge.Cards.${namespace}.${key}`;
  const normalizedEffect = effect
    ? {
        target: effect.target ?? "target",
        nameKey: `PF2E_CRITICAL_FORGE.CriticalForge.Effects.${namespace}.${key}.Name`,
        fallbackName: effect.fallbackName ?? fallbackTitle,
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: effect.duration,
          components: effect.components ?? []
        }
      }
    : null;

  return {
    schemaVersion: CARD_SCHEMA_VERSION,
    id: `core.${id}`,
    packId: "core",
    category,
    tone,
    impact,
    titleKey: `${localizationRoot}.Title`,
    descriptionKey: `${localizationRoot}.Description`,
    fallbackTitle,
    fallbackDescription,
    weight,
    tags,
    filters: {
      ...EMPTY_FILTERS,
      ...filters
    },
    effect: normalizedEffect,
    metadata: { library: "core-test-library-1" }
  };
}
