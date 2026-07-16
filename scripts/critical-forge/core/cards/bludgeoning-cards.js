import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "bludgeoning.ringing-blow",
    namespace: "Bludgeoning",
    key: "RingingBlow",
    category: "criticalHit",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Ringing Blow",
    fallbackDescription: "The impact turns the next heartbeat into thunder.",
    weight: 2,
    tags: ["physical", "control"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "stunned",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "bludgeoning.knocked-flat",
    namespace: "Bludgeoning",
    key: "KnockedFlat",
    category: "criticalHit",
    tone: "neutral",
    impact: "moderate",
    fallbackTitle: "Knocked Flat",
    fallbackDescription: "The impact takes away the target’s footing, direction, and remaining dignity.",
    weight: 2,
    tags: ["physical", "control"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ],
        "excludedTargetTraits": [
            "incorporeal"
        ]
    },
    effect: {
          target: "target",
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
    id: "bludgeoning.rattled-bones",
    namespace: "Bludgeoning",
    key: "RattledBones",
    category: "criticalHit",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Rattled Bones",
    fallbackDescription: "The blow travels through bone and muscle and drains away strength.",
    weight: 2,
    tags: ["physical", "debuff"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ],
        "excludedTargetTraits": [
            "construct",
            "elemental",
            "incorporeal",
            "ooze",
            "undead"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "condition",
                          "slug": "enfeebled",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "bludgeoning.winded",
    namespace: "Bludgeoning",
    key: "Winded",
    category: "criticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Winded",
    fallbackDescription: "The force drives the air from the chest, making every step laborious.",
    weight: 1,
    tags: ["physical", "movement"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ],
        "excludedTargetTraits": [
            "construct",
            "elemental",
            "incorporeal",
            "ooze",
            "undead"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "movement",
                          "movementType": "all",
                          "value": -10,
                          "modifierType": "circumstance"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "bludgeoning.cracked-guard",
    namespace: "Bludgeoning",
    key: "CrackedGuard",
    category: "criticalHit",
    tone: "serious",
    impact: "strong",
    fallbackTitle: "Cracked Guard",
    fallbackDescription: "The hit makes protection and bone crack in the same note.",
    weight: 1,
    tags: ["physical", "vulnerability"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "weakness",
                          "weaknessType": "bludgeoning",
                          "value": 2
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "bludgeoning.dizzying-impact",
    namespace: "Bludgeoning",
    key: "DizzyingImpact",
    category: "criticalHit",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Dizzying Impact",
    fallbackDescription: "The world needs a moment to stand still again.",
    weight: 1,
    tags: ["physical", "debuff"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ]
    },
    effect: {
          target: "target",
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
    id: "bludgeoning.bell-ringer",
    namespace: "Bludgeoning",
    key: "BellRinger",
    category: "criticalHit",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Bell Ringer",
    fallbackDescription: "A bell rings somewhere. Nobody has seen a bell.",
    weight: 1,
    tags: ["physical", "flourish"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ]
    },
    effect: null
  }),
  defineCoreCard({
    id: "bludgeoning.boot-scoot",
    namespace: "Bludgeoning",
    key: "BootScoot",
    category: "criticalHit",
    tone: "humorous",
    impact: "light",
    fallbackTitle: "Boot Scoot",
    fallbackDescription: "The impact sends the target half a dance step in the wrong direction.",
    weight: 1,
    tags: ["physical", "movement"],
    filters: {
        "damageTypes": [
            "bludgeoning"
        ],
        "excludedTargetTraits": [
            "incorporeal"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "movement",
                          "movementType": "land",
                          "value": -5,
                          "modifierType": "circumstance"
                  }
          ]
        }
  }),
]);
