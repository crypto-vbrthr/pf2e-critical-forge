import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "save-success.through-the-gap",
    namespace: "SaveSuccess",
    key: "ThroughTheGap",
    category: "savingThrowCriticalSuccess",
    tone: "dramatic",
    impact: "light",
    fallbackTitle: "Through the Gap",
    fallbackDescription: "The creature slips through the effect and carries the momentum forward.",
    tags: ["save", "reflex", "boon"],
    filters: { saveTypes: ["reflex"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "movement", movementType: "land", value: 5, modifierType: "circumstance" }]
    }
  }),
  defineCoreCard({
    id: "save-success.unshaken-body",
    namespace: "SaveSuccess",
    key: "UnshakenBody",
    category: "savingThrowCriticalSuccess",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Unshaken Body",
    fallbackDescription: "The body absorbs the assault and emerges harder to break.",
    tags: ["save", "fortitude", "boon"],
    filters: { saveTypes: ["fortitude"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "temporaryHitPoints", value: 4 }]
    }
  }),
  defineCoreCard({
    id: "save-success.unbroken-mind",
    namespace: "SaveSuccess",
    key: "UnbrokenMind",
    category: "savingThrowCriticalSuccess",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Unbroken Mind",
    fallbackDescription: "The will does not merely resist; it shuts the door and bars it.",
    tags: ["save", "will", "boon"],
    filters: { saveTypes: ["will"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "immunity", immunityType: "frightened" }]
    }
  }),
  defineCoreCard({
    id: "save-success.turn-the-force",
    namespace: "SaveSuccess",
    key: "TurnTheForce",
    category: "savingThrowCriticalSuccess",
    tone: "dramatic",
    impact: "light",
    fallbackTitle: "Turn the Force",
    fallbackDescription: "Defiance becomes momentum for the next decisive action.",
    tags: ["save", "boon"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "attack-roll", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "save-success.defensive-momentum",
    namespace: "SaveSuccess",
    key: "DefensiveMomentum",
    category: "savingThrowCriticalSuccess",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Defensive Momentum",
    fallbackDescription: "The perfect defense leaves the creature poised for the next threat.",
    tags: ["save", "defense"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "ac", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "save-success.unimpressed",
    namespace: "SaveSuccess",
    key: "Unimpressed",
    category: "savingThrowCriticalSuccess",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Entirely Unimpressed",
    fallbackDescription: "The effect arrives dramatically and receives the emotional response of a closed door.",
    tags: ["save", "flourish"],
    filters: {},
    effect: null
  })
]);
