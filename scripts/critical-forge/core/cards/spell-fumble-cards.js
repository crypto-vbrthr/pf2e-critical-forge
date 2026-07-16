import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "spell-fumble.arcane-feedback",
    namespace: "SpellFumble",
    key: "ArcaneFeedback",
    category: "spellCriticalFumble",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Arcane Feedback",
    fallbackDescription: "The failed spell snaps back through the caster's thoughts.",
    tags: ["spell", "feedback"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "stupefied", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.static-formula",
    namespace: "SpellFumble",
    key: "StaticFormula",
    category: "spellCriticalFumble",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Static in the Formula",
    fallbackDescription: "The arcane pattern remains noisy and unreliable for a moment.",
    tags: ["spell", "arcane"],
    filters: { spellTraditions: ["arcane"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "spell-attack-roll", value: -1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.faltering-faith",
    namespace: "SpellFumble",
    key: "FalteringFaith",
    category: "spellCriticalFumble",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Faltering Faith",
    fallbackDescription: "For one breath, certainty gives way to doubt.",
    tags: ["spell", "divine", "emotion"],
    filters: { spellTraditions: ["divine"], excludedSourceTraits: ["mindless"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "frightened", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.whispering-backlash",
    namespace: "SpellFumble",
    key: "WhisperingBacklash",
    category: "spellCriticalFumble",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Whispering Backlash",
    fallbackDescription: "Something on the far side of the spell whispers back.",
    tags: ["spell", "occult", "emotion"],
    filters: { spellTraditions: ["occult"], excludedSourceTraits: ["mindless"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "frightened", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.primal-recoil",
    namespace: "SpellFumble",
    key: "PrimalRecoil",
    category: "spellCriticalFumble",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Primal Recoil",
    fallbackDescription: "Unruly magic kicks back with the enthusiasm of an offended aurochs.",
    tags: ["spell", "primal", "control"],
    filters: { spellTraditions: ["primal"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "prone" }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.spectacular-fizzle",
    namespace: "SpellFumble",
    key: "SpectacularFizzle",
    category: "spellCriticalFumble",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Spectacular Fizzle",
    fallbackDescription: "The spell produces one tiny spark and an entirely unreasonable amount of smoke.",
    tags: ["spell", "flourish"],
    filters: {},
    effect: null
  }),
  defineCoreCard({
    id: "spell-fumble.twisted-geometry",
    namespace: "SpellFumble",
    key: "TwistedGeometry",
    category: "spellCriticalFumble",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Twisted Geometry",
    fallbackDescription: "Space folds the wrong way around the caster and steals a fragment of the next moment.",
    tags: ["spell", "control", "backlash"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "slowed", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.scorched-focus",
    namespace: "SpellFumble",
    key: "ScorchedFocus",
    category: "spellCriticalFumble",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Scorched Focus",
    fallbackDescription: "Heat lashes back through the spell and leaves the caster's movements painfully uncertain.",
    tags: ["spell", "fire", "backlash"],
    filters: { spellTraits: ["fire"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "clumsy", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.frozen-gesture",
    namespace: "SpellFumble",
    key: "FrozenGesture",
    category: "spellCriticalFumble",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Frozen Gesture",
    fallbackDescription: "Cold locks into the caster's stance and drags at every step.",
    tags: ["spell", "cold", "backlash"],
    filters: { spellTraits: ["cold"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "movement", movementType: "all", value: -5, modifierType: "circumstance" }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.mental-echo",
    namespace: "SpellFumble",
    key: "MentalEcho",
    category: "spellCriticalFumble",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Mental Echo",
    fallbackDescription: "The spell's final thought returns with teeth.",
    tags: ["spell", "mental", "emotion", "backlash"],
    filters: { spellTraits: ["mental"], excludedSourceTraits: ["mindless"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "frightened", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.rebounding-glare",
    namespace: "SpellFumble",
    key: "ReboundingGlare",
    category: "spellCriticalFumble",
    tone: "dramatic",
    impact: "light",
    fallbackTitle: "Rebounding Glare",
    fallbackDescription: "The spell's brilliance reflects inward and fills the caster's sight with afterimages.",
    tags: ["spell", "light", "sensory", "backlash"],
    filters: { spellTraits: ["light"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "dazzled" }]
    }
  }),
  defineCoreCard({
    id: "spell-fumble.applause-sign",
    namespace: "SpellFumble",
    key: "ApplauseSign",
    category: "spellCriticalFumble",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Applause Sign",
    fallbackDescription: "The magic fails so theatrically that an invisible stagehand appears to be cueing applause.",
    tags: ["spell", "flourish"],
    filters: {},
    effect: null
  })
]);
