import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "slashing.deep-cut",
    namespace: "Slashing",
    key: "DeepCut",
    category: "criticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Deep Cut",
    fallbackDescription: "The blade opens a wound that refuses to close.",
    weight: 2,
    tags: ["physical", "bleed"],
    filters: {
        "damageTypes": [
            "slashing"
        ],
        "excludedTargetTraits": [
            "incorporeal"
        ]
    },
    effect: {
          target: "target",
          duration: UNLIMITED,
          components: [
                  {
                          "type": "persistentDamage",
                          "formula": "1d6",
                          "damageType": "bleed"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "slashing.hamstrung",
    namespace: "Slashing",
    key: "Hamstrung",
    category: "criticalHit",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Hamstrung",
    fallbackDescription: "The slash bites into the leg and steals the target’s sure footing.",
    weight: 2,
    tags: ["physical", "movement"],
    filters: {
        "damageTypes": [
            "slashing"
        ],
        "excludedTargetTraits": [
            "incorporeal",
            "ooze"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "movement",
                          "movementType": "land",
                          "value": -10,
                          "modifierType": "circumstance"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "slashing.torn-guard",
    namespace: "Slashing",
    key: "TornGuard",
    category: "criticalHit",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Torn Guard",
    fallbackDescription: "The blade tears protection and posture apart.",
    weight: 2,
    tags: ["physical", "control"],
    filters: {
        "damageTypes": [
            "slashing"
        ]
    },
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
    id: "slashing.numbed-arm",
    namespace: "Slashing",
    key: "NumbedArm",
    category: "criticalHit",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Numbed Arm",
    fallbackDescription: "The hit leaves the weapon arm numb and heavy.",
    weight: 1,
    tags: ["physical", "debuff"],
    filters: {
        "damageTypes": [
            "slashing"
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
    id: "slashing.blood-in-eyes",
    namespace: "Slashing",
    key: "BloodInEyes",
    category: "criticalHit",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Blood in the Eyes",
    fallbackDescription: "Blood runs into the eyes and turns clear sight into red streaks.",
    weight: 1,
    tags: ["physical", "bleed", "control"],
    filters: {
        "damageTypes": [
            "slashing"
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
                          "slug": "dazzled"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "slashing.armor-rent",
    namespace: "Slashing",
    key: "ArmorRent",
    category: "criticalHit",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Armor Rent",
    fallbackDescription: "The cut opens a dangerous gap in the target’s protection.",
    weight: 1,
    tags: ["physical", "vulnerability"],
    filters: {
        "damageTypes": [
            "slashing"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "weakness",
                          "weaknessType": "physical",
                          "value": 2
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "slashing.flourish-of-steel",
    namespace: "Slashing",
    key: "FlourishOfSteel",
    category: "criticalHit",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Flourish of Steel",
    fallbackDescription: "The hit ends in a motion so flawless that even the dust seems to applaud.",
    weight: 1,
    tags: ["physical", "flourish"],
    filters: {
        "damageTypes": [
            "slashing"
        ]
    },
    effect: null
  }),
  defineCoreCard({
    id: "slashing.severed-strap",
    namespace: "Slashing",
    key: "SeveredStrap",
    category: "criticalHit",
    tone: "humorous",
    impact: "light",
    fallbackTitle: "Severed Strap",
    fallbackDescription: "A severed strap catches exactly where it will hinder the next step.",
    weight: 1,
    tags: ["physical", "movement"],
    filters: {
        "damageTypes": [
            "slashing"
        ],
        "excludedTargetTraits": [
            "incorporeal",
            "ooze"
        ]
    },
    effect: {
          target: "target",
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
]);
