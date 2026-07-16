import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "generic.off-balance",
    namespace: "Generic",
    key: "OffBalance",
    category: "criticalHit",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Off Balance",
    fallbackDescription: "The hit tears the target out of its stance.",
    weight: 1,
    tags: ["generic", "control"],
    filters: {},
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "off-guard"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "generic.opening",
    namespace: "Generic",
    key: "Opening",
    category: "criticalHit",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Perfect Opening",
    fallbackDescription: "For one moment, every defense stands open like a badly closed door.",
    weight: 1,
    tags: ["generic", "control"],
    filters: {},
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "modifier",
                          "selector": "ac",
                          "value": -1,
                          "modifierType": "circumstance",
                          "predicate": []
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "generic.shaken-confidence",
    namespace: "Generic",
    key: "ShakenConfidence",
    category: "criticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Shaken Confidence",
    fallbackDescription: "The hit is so clean that the target doubts its own future.",
    weight: 1,
    tags: ["generic", "emotion"],
    filters: {
        "excludedTargetTraits": [
            "mindless"
        ]
    },
    effect: {
          target: "target",
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
    id: "generic.momentum",
    namespace: "Generic",
    key: "Momentum",
    category: "criticalHit",
    tone: "dramatic",
    impact: "light",
    fallbackTitle: "Momentum",
    fallbackDescription: "The perfect hit gives the attacker a brief surge of unshakable confidence.",
    weight: 1,
    tags: ["generic", "boon"],
    filters: {},
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "temporaryHitPoints",
                          "value": 3
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "generic.spectacular-hit",
    namespace: "Generic",
    key: "SpectacularHit",
    category: "criticalHit",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Spectacularly Unnecessary",
    fallbackDescription: "The hit looks far more expensive than it mechanically needs to be.",
    weight: 1,
    tags: ["generic", "flourish"],
    filters: {},
    effect: null
  }),
  defineCoreCard({
    id: "generic.perfect-follow-through",
    namespace: "Generic",
    key: "PerfectFollowThrough",
    category: "criticalHit",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Perfect Follow-Through",
    fallbackDescription: "The motion ends exactly where the next attack should begin.",
    weight: 1,
    tags: ["generic", "boon"],
    filters: {},
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "modifier",
                          "selector": "attack-roll",
                          "value": 1,
                          "modifierType": "circumstance",
                          "predicate": []
                  }
          ]
        }
  }),
]);
