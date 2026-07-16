import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "save-failure.thrown-off-balance",
    namespace: "SaveFailure",
    key: "ThrownOffBalance",
    category: "savingThrowCriticalFailure",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Thrown Off Balance",
    fallbackDescription: "The effect catches every wrong movement and sends the creature sprawling.",
    tags: ["save", "reflex", "control"],
    filters: { saveTypes: ["reflex"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "prone" }]
    }
  }),
  defineCoreCard({
    id: "save-failure.system-shock",
    namespace: "SaveFailure",
    key: "SystemShock",
    category: "savingThrowCriticalFailure",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "System Shock",
    fallbackDescription: "The body fails to contain the effect and turns violently against itself.",
    tags: ["save", "fortitude", "debuff"],
    filters: { saveTypes: ["fortitude"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "sickened", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.mind-reels",
    namespace: "SaveFailure",
    key: "MindReels",
    category: "savingThrowCriticalFailure",
    tone: "serious",
    impact: "strong",
    fallbackTitle: "Mind Reels",
    fallbackDescription: "Thought fractures under the full weight of the effect.",
    tags: ["save", "will", "mental"],
    filters: { saveTypes: ["will"], excludedSourceTraits: ["mindless"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "stupefied", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.full-impact",
    namespace: "SaveFailure",
    key: "FullImpact",
    category: "savingThrowCriticalFailure",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Full Impact",
    fallbackDescription: "The creature catches the effect at precisely the worst possible angle.",
    tags: ["save", "vulnerability"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "weakness", weaknessType: "all-damage", value: 2 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.staggered",
    namespace: "SaveFailure",
    key: "Staggered",
    category: "savingThrowCriticalFailure",
    tone: "neutral",
    impact: "moderate",
    fallbackTitle: "Staggered",
    fallbackDescription: "The full force of the effect steals a precious moment of action.",
    tags: ["save", "control"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "slowed", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.painfully-obvious",
    namespace: "SaveFailure",
    key: "PainfullyObvious",
    category: "savingThrowCriticalFailure",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Painfully Obvious",
    fallbackDescription: "No expert is required to determine that this went badly.",
    tags: ["save", "flourish"],
    filters: {},
    effect: null
  }),
  defineCoreCard({
    id: "save-failure.tangled-recovery",
    namespace: "SaveFailure",
    key: "TangledRecovery",
    category: "savingThrowCriticalFailure",
    tone: "neutral",
    impact: "moderate",
    fallbackTitle: "Tangled Recovery",
    fallbackDescription: "The failed escape leaves every corrective movement a fraction too late.",
    tags: ["save", "reflex", "debuff"],
    filters: { saveTypes: ["reflex"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "clumsy", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.drained-reserves",
    namespace: "SaveFailure",
    key: "DrainedReserves",
    category: "savingThrowCriticalFailure",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Drained Reserves",
    fallbackDescription: "The body spends too much strength resisting and has nothing left for the next effort.",
    tags: ["save", "fortitude", "debuff"],
    filters: { saveTypes: ["fortitude"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "enfeebled", value: 1 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.echoing-dread",
    namespace: "SaveFailure",
    key: "EchoingDread",
    category: "savingThrowCriticalFailure",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Echoing Dread",
    fallbackDescription: "The failed defense leaves the mind repeating the worst possible answer.",
    tags: ["save", "will", "mental", "emotion"],
    filters: { saveTypes: ["will"], excludedSourceTraits: ["mindless"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "frightened", value: 2 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.open-defense",
    namespace: "SaveFailure",
    key: "OpenDefense",
    category: "savingThrowCriticalFailure",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Open Defense",
    fallbackDescription: "The creature commits so completely to the failed defense that its guard falls away.",
    tags: ["save", "debuff", "defense"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "condition", slug: "off-guard" }]
    }
  }),
  defineCoreCard({
    id: "save-failure.magical-saturation",
    namespace: "SaveFailure",
    key: "MagicalSaturation",
    category: "savingThrowCriticalFailure",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Magical Saturation",
    fallbackDescription: "The spell sinks too deeply into the creature and leaves it dangerously receptive to further magic.",
    tags: ["save", "spell", "vulnerability"],
    filters: { spellTraditions: ["arcane", "divine", "occult", "primal"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "weakness", weaknessType: "damage-from-spells", value: 2 }]
    }
  }),
  defineCoreCard({
    id: "save-failure.wrong-instinct",
    namespace: "SaveFailure",
    key: "WrongInstinct",
    category: "savingThrowCriticalFailure",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Every Wrong Instinct",
    fallbackDescription: "The creature dodges into it, braces against it, and somehow chooses the least helpful thought as well.",
    tags: ["save", "flourish"],
    filters: {},
    effect: null
  })
]);
