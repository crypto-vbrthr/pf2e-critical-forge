import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "fumble.generic.wrong-footed",
    namespace: "Fumble",
    key: "WrongFooted",
    category: "criticalFumble",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Wrong-Footed",
    fallbackDescription: "The failed attempt ends one step farther than planned and in the wrong direction.",
    weight: 1,
    tags: ["fumble", "generic", "movement"],
    filters: {},
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "movement",
                          "movementType": "all",
                          "value": -5,
                          "modifierType": "circumstance"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.generic.rattled",
    namespace: "Fumble",
    key: "Rattled",
    category: "criticalFumble",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Rattled",
    fallbackDescription: "The failure cuts deeper than expected and gnaws at courage for a moment.",
    weight: 1,
    tags: ["fumble", "generic", "emotion"],
    filters: {
        "excludedSourceTraits": [
            "mindless"
        ]
    },
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "frightened",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.generic.lost-tempo",
    namespace: "Fumble",
    key: "LostTempo",
    category: "criticalFumble",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Lost Tempo",
    fallbackDescription: "The attack devours the fighter’s rhythm and leaves a gap in the next moment.",
    weight: 1,
    tags: ["fumble", "generic", "control"],
    filters: {},
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "slowed",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.generic.audience-approval",
    namespace: "Fumble",
    key: "AudienceApproval",
    category: "criticalFumble",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Polite Applause",
    fallbackDescription: "Polite applause seems to come from somewhere. It was probably only a goblin.",
    weight: 1,
    tags: ["fumble", "generic", "flourish"],
    filters: {},
    effect: null
  }),
  defineCoreCard({
    id: "fumble.generic.moment-of-doubt",
    namespace: "Fumble",
    key: "MomentOfDoubt",
    category: "criticalFumble",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Moment of Doubt",
    fallbackDescription: "For one moment, every decision looks suspicious, especially the last one.",
    weight: 1,
    tags: ["fumble", "generic", "debuff"],
    filters: {},
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "modifier",
                          "selector": "will",
                          "value": -1,
                          "modifierType": "circumstance",
                          "predicate": []
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.generic.lucky-escape",
    namespace: "Fumble",
    key: "LuckyEscape",
    category: "criticalFumble",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Surely Intentional",
    fallbackDescription: "The attack misses so thoroughly that everyone briefly checks whether it was intentional.",
    weight: 1,
    tags: ["fumble", "generic", "flourish"],
    filters: {},
    effect: null
  }),
]);
