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
  }),
  defineCoreCard({
    id: "spell-hit.frozen-instant",
    namespace: "SpellHit",
    key: "FrozenInstant",
    category: "spellCriticalHit",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Frozen Instant",
    fallbackDescription: "Cold closes around the target for one stolen heartbeat and breaks its rhythm.",
    tags: ["spell", "cold", "control"],
    filters: { spellTraits: ["cold"] },
    effect: {
      target: "target",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "slowed", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.corrosive-opening",
    namespace: "SpellHit",
    key: "CorrosiveOpening",
    category: "spellCriticalHit",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Corrosive Opening",
    fallbackDescription: "The magic eats open a vulnerable seam that remains exposed for a moment.",
    tags: ["spell", "acid", "vulnerability"],
    filters: { spellTraits: ["acid"] },
    effect: {
      target: "target",
      duration: ONE_ROUND,
      components: [{ type: "weakness", weaknessType: "acid", value: 2 }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.blinding-discharge",
    namespace: "SpellHit",
    key: "BlindingDischarge",
    category: "spellCriticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Blinding Discharge",
    fallbackDescription: "The hit erupts in a white-hot flash that leaves stars dancing across the target's sight.",
    tags: ["spell", "electricity", "sensory"],
    filters: { spellTraits: ["electricity"] },
    effect: {
      target: "target",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "dazzled" }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.broken-defense",
    namespace: "SpellHit",
    key: "BrokenDefense",
    category: "spellCriticalHit",
    tone: "neutral",
    impact: "moderate",
    fallbackTitle: "Broken Defense",
    fallbackDescription: "The spell briefly unravels the target's magical and physical defenses.",
    tags: ["spell", "debuff"],
    filters: {},
    effect: {
      target: "target",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "saving-throw", value: -1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.harmonic-focus",
    namespace: "SpellHit",
    key: "HarmonicFocus",
    category: "spellCriticalHit",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Harmonic Focus",
    fallbackDescription: "The flawless formula continues to resonate and sharpens the caster's next spell.",
    tags: ["spell", "boon"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "spell-dc", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "spell-hit.protective-afterglow",
    namespace: "SpellHit",
    key: "ProtectiveAfterglow",
    category: "spellCriticalHit",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Protective Afterglow",
    fallbackDescription: "Residual magic settles around the caster in a thin protective mantle.",
    tags: ["spell", "boon", "defense"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "ac", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  })
]);
