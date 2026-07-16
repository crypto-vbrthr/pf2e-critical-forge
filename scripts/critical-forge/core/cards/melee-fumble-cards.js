import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "fumble.overextended",
    namespace: "FumbleMelee",
    key: "Overextended",
    category: "criticalFumble",
    tone: "humorous",
    impact: "light",
    fallbackTitle: "Overextended",
    fallbackDescription: "The failed attack leaves the attacker exposed.",
    weight: 2,
    tags: ["fumble", "melee"],
    filters: {
        "attackTraits": [
            "melee"
        ]
    },
    effect: {
          target: "source",
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
    id: "fumble.weapon-jolt",
    namespace: "FumbleMelee",
    key: "WeaponJolt",
    category: "criticalFumble",
    tone: "humorous",
    impact: "light",
    fallbackTitle: "Weapon Jolt",
    fallbackDescription: "The miss sends a painful vibration through the attacker’s grip.",
    weight: 1,
    tags: ["fumble", "melee"],
    filters: {
        "attackTraits": [
            "melee"
        ]
    },
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "modifier",
                          "selector": "attack-roll",
                          "value": -1,
                          "modifierType": "circumstance",
                          "predicate": []
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.melee.tangled-feet",
    namespace: "FumbleMelee",
    key: "TangledFeet",
    category: "criticalFumble",
    tone: "humorous",
    impact: "moderate",
    fallbackTitle: "Tangled Feet",
    fallbackDescription: "For one moment, the attacker chiefly defeats their own footwork.",
    weight: 1,
    tags: ["fumble", "melee", "control"],
    filters: {
        "attackTraits": [
            "melee"
        ],
        "excludedSourceTraits": [
            "incorporeal"
        ]
    },
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "prone"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.melee.open-flank",
    namespace: "FumbleMelee",
    key: "OpenFlank",
    category: "criticalFumble",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Open Flank",
    fallbackDescription: "The swing carries the guard away and leaves the side exposed.",
    weight: 1,
    tags: ["fumble", "melee"],
    filters: {
        "attackTraits": [
            "melee"
        ]
    },
    effect: {
          target: "source",
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
    id: "fumble.melee.wild-swing",
    namespace: "FumbleMelee",
    key: "WildSwing",
    category: "criticalFumble",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Wild Swing",
    fallbackDescription: "The attack pulls the body out of line and takes control with it.",
    weight: 1,
    tags: ["fumble", "melee", "control"],
    filters: {
        "attackTraits": [
            "melee"
        ]
    },
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "clumsy",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.melee.grand-gesture",
    namespace: "FumbleMelee",
    key: "GrandGesture",
    category: "criticalFumble",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Grand Gesture",
    fallbackDescription: "The weapon traces an impressive arc that merely passes the foe.",
    weight: 1,
    tags: ["fumble", "melee", "flourish"],
    filters: {
        "attackTraits": [
            "melee"
        ]
    },
    effect: null
  }),
]);
