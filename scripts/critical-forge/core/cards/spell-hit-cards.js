import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "spell-hit.lingering-flame",
    namespace: "SpellHit",
    key: "LingeringFlame",
    category: "spellCriticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Lingering Flame",
    fallbackDescription: "The spell leaves hungry flames clinging to the target.",
    tags: ["spell", "fire", "persistent"],
    filters: { spellTraits: ["fire"] },
    effect: {
      target: "target",
      duration: UNLIMITED,
      components: [{ type: "persistentDamage", formula: "1d4", damageType: "fire" }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.arcane-precision",
    namespace: "SpellHit",
    key: "ArcanePrecision",
    category: "spellCriticalHit",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Arcane Precision",
    fallbackDescription: "The flawless formula aligns the caster's next attack.",
    tags: ["spell", "arcane", "boon"],
    filters: { spellTraditions: ["arcane"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "spell-attack-roll", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.divine-radiance",
    namespace: "SpellHit",
    key: "DivineRadiance",
    category: "spellCriticalHit",
    tone: "dramatic",
    impact: "light",
    fallbackTitle: "Divine Radiance",
    fallbackDescription: "A trace of sacred power lingers around the caster as a protective halo.",
    tags: ["spell", "divine", "boon"],
    filters: { spellTraditions: ["divine"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "temporaryHitPoints", value: 4 }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.occult-intrusion",
    namespace: "SpellHit",
    key: "OccultIntrusion",
    category: "spellCriticalHit",
    tone: "serious",
    impact: "strong",
    fallbackTitle: "Occult Intrusion",
    fallbackDescription: "The spell slips behind thought and leaves the target's mind reeling.",
    tags: ["spell", "occult", "mental"],
    filters: { spellTraditions: ["occult"], excludedTargetTraits: ["mindless"] },
    effect: {
      target: "target",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "stupefied", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.primal-surge",
    namespace: "SpellHit",
    key: "PrimalSurge",
    category: "spellCriticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Primal Surge",
    fallbackDescription: "Wild power batters the target and drags at every movement.",
    tags: ["spell", "primal", "control"],
    filters: { spellTraditions: ["primal"] },
    effect: {
      target: "target",
      duration: ONE_ROUND,
      components: [{ type: "movement", movementType: "all", value: -5, modifierType: "circumstance" }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.excessive-sparkles",
    namespace: "SpellHit",
    key: "ExcessiveSparkles",
    category: "spellCriticalHit",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Excessive Sparkles",
    fallbackDescription: "The spell succeeds with enough visual flourish to require its own stage crew.",
    tags: ["spell", "flourish"],
    filters: {},
    effect: null
  })
]);
