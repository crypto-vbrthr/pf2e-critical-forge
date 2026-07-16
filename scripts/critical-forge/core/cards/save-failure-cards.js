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
  })
]);
