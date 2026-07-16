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
  }),
  defineCoreCard({
    id: "save-success.perfect-footing",
    namespace: "SaveSuccess",
    key: "PerfectFooting",
    category: "savingThrowCriticalSuccess",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Perfect Footing",
    fallbackDescription: "The creature finds exactly the right place to stand and keeps that rhythm for the next threat.",
    tags: ["save", "reflex", "boon"],
    filters: { saveTypes: ["reflex"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "reflex", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "save-success.iron-pulse",
    namespace: "SaveSuccess",
    key: "IronPulse",
    category: "savingThrowCriticalSuccess",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Iron Pulse",
    fallbackDescription: "The body answers the assault with a steadier, harder rhythm.",
    tags: ["save", "fortitude", "boon"],
    filters: { saveTypes: ["fortitude"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "fortitude", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "save-success.lucid-defiance",
    namespace: "SaveSuccess",
    key: "LucidDefiance",
    category: "savingThrowCriticalSuccess",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Lucid Defiance",
    fallbackDescription: "The creature names the intrusion for what it is and refuses it entry.",
    tags: ["save", "will", "boon"],
    filters: { saveTypes: ["will"] },
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "will", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "save-success.battle-hardened",
    namespace: "SaveSuccess",
    key: "BattleHardened",
    category: "savingThrowCriticalSuccess",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Battle Hardened",
    fallbackDescription: "The perfect defense turns pain into readiness against whatever comes next.",
    tags: ["save", "boon", "defense"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "modifier", selector: "saving-throw", value: 1, modifierType: "circumstance", predicate: [] }]
    }
  }),
  defineCoreCard({
    id: "save-success.second-wind",
    namespace: "SaveSuccess",
    key: "SecondWind",
    category: "savingThrowCriticalSuccess",
    tone: "neutral",
    impact: "moderate",
    fallbackTitle: "Second Wind",
    fallbackDescription: "The creature emerges from the effect with a sudden pulse of recovery.",
    tags: ["save", "boon", "healing"],
    filters: {},
    effect: {
      target: "source",
      duration: ONE_ROUND,
      components: [{ type: "fastHealing", value: 2 }]
    }
  }),
  defineCoreCard({
    id: "save-success.not-today",
    namespace: "SaveSuccess",
    key: "NotToday",
    category: "savingThrowCriticalSuccess",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Not Today",
    fallbackDescription: "The effect presents its credentials. The creature declines the appointment.",
    tags: ["save", "flourish"],
    filters: {},
    effect: null
  })
]);
