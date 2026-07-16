import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "fumble.ranged.bad-release",
    namespace: "FumbleRanged",
    key: "BadRelease",
    category: "criticalFumble",
    tone: "humorous",
    impact: "light",
    fallbackTitle: "Bad Release",
    fallbackDescription: "The shot leaves a heartbeat too early and leaves the hand uncertain.",
    weight: 2,
    tags: ["fumble", "ranged"],
    filters: {
        "attackTraits": [
            "ranged"
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
    id: "fumble.ranged.exposed-position",
    namespace: "FumbleRanged",
    key: "ExposedPosition",
    category: "criticalFumble",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Exposed Position",
    fallbackDescription: "While aiming, the shooter forgets that others can shoot back.",
    weight: 1,
    tags: ["fumble", "ranged"],
    filters: {
        "attackTraits": [
            "ranged"
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
    id: "fumble.ranged.recoil-stumble",
    namespace: "FumbleRanged",
    key: "RecoilStumble",
    category: "criticalFumble",
    tone: "humorous",
    impact: "moderate",
    fallbackTitle: "Recoil Stumble",
    fallbackDescription: "Recoil and footing briefly disagree. The ground wins.",
    weight: 1,
    tags: ["fumble", "ranged", "control"],
    filters: {
        "attackTraits": [
            "ranged"
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
    id: "fumble.ranged.sightline-lost",
    namespace: "FumbleRanged",
    key: "SightlineLost",
    category: "criticalFumble",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Sightline Lost",
    fallbackDescription: "String, smoke, or sleeve crosses the sightline at exactly the wrong moment.",
    weight: 1,
    tags: ["fumble", "ranged", "control"],
    filters: {
        "attackTraits": [
            "ranged"
        ]
    },
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "dazzled"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "fumble.ranged.string-burn",
    namespace: "FumbleRanged",
    key: "StringBurn",
    category: "criticalFumble",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "String Burn",
    fallbackDescription: "The string hits something at least, unfortunately the shooter’s own arm.",
    weight: 1,
    tags: ["fumble", "ranged", "flourish"],
    filters: {
        "attackTraits": [
            "ranged"
        ]
    },
    effect: null
  }),
  defineCoreCard({
    id: "fumble.ranged.shaky-aim",
    namespace: "FumbleRanged",
    key: "ShakyAim",
    category: "criticalFumble",
    tone: "serious",
    impact: "strong",
    fallbackTitle: "Shaky Aim",
    fallbackDescription: "After this miss, the sightline trembles like a nervous compass needle.",
    weight: 1,
    tags: ["fumble", "ranged", "debuff"],
    filters: {
        "attackTraits": [
            "ranged"
        ]
    },
    effect: {
          target: "source",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "modifier",
                          "selector": "attack-roll",
                          "value": -2,
                          "modifierType": "circumstance",
                          "predicate": []
                  }
          ]
        }
  }),
]);
