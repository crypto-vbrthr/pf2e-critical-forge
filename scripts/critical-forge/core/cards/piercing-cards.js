import { defineCoreCard, CORE_CARD_DURATIONS } from "../core-card-factory.js";

const { ONE_ROUND, UNLIMITED } = CORE_CARD_DURATIONS;

export const CARDS = Object.freeze([
  defineCoreCard({
    id: "piercing.puncture",
    namespace: "Piercing",
    key: "Puncture",
    category: "criticalHit",
    tone: "serious",
    impact: "light",
    fallbackTitle: "Puncture",
    fallbackDescription: "The point leaves a narrow but stubbornly bleeding wound.",
    weight: 2,
    tags: ["physical", "bleed"],
    filters: {
        "damageTypes": [
            "piercing"
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
                          "formula": "1d4",
                          "damageType": "bleed"
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "piercing.pinned-step",
    namespace: "Piercing",
    key: "PinnedStep",
    category: "criticalHit",
    tone: "dramatic",
    impact: "moderate",
    fallbackTitle: "Pinned Step",
    fallbackDescription: "The point catches foot or hem and nearly nails the next step in place.",
    weight: 2,
    tags: ["physical", "movement"],
    filters: {
        "damageTypes": [
            "piercing"
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
    id: "piercing.nerve-strike",
    namespace: "Piercing",
    key: "NerveStrike",
    category: "criticalHit",
    tone: "serious",
    impact: "moderate",
    fallbackTitle: "Nerve Strike",
    fallbackDescription: "A precise thrust catches a nerve, turning movement unsteady.",
    weight: 2,
    tags: ["physical", "control"],
    filters: {
        "damageTypes": [
            "piercing"
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
                          "slug": "clumsy",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "piercing.breath-stolen",
    namespace: "Piercing",
    key: "BreathStolen",
    category: "criticalHit",
    tone: "dramatic",
    impact: "strong",
    fallbackTitle: "Breath Stolen",
    fallbackDescription: "The thrust steals the target’s breath and one precious moment.",
    weight: 1,
    tags: ["physical", "control"],
    filters: {
        "damageTypes": [
            "piercing"
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
                          "slug": "slowed",
                          "value": 1
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "piercing.weapon-arm",
    namespace: "Piercing",
    key: "WeaponArm",
    category: "criticalHit",
    tone: "neutral",
    impact: "light",
    fallbackTitle: "Weapon Arm",
    fallbackDescription: "The thrust forces the weapon arm into an awkward posture.",
    weight: 1,
    tags: ["physical", "debuff"],
    filters: {
        "damageTypes": [
            "piercing"
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
    id: "piercing.exposed-joint",
    namespace: "Piercing",
    key: "ExposedJoint",
    category: "criticalHit",
    tone: "serious",
    impact: "strong",
    fallbackTitle: "Exposed Joint",
    fallbackDescription: "The point finds the seam where every following thrust hurts more.",
    weight: 1,
    tags: ["physical", "vulnerability"],
    filters: {
        "damageTypes": [
            "piercing"
        ]
    },
    effect: {
          target: "target",
          duration: ONE_ROUND,
          components: [
                  {
                          "type": "weakness",
                          "weaknessType": "piercing",
                          "value": 2
                  }
          ]
        }
  }),
  defineCoreCard({
    id: "piercing.needle-threaded",
    namespace: "Piercing",
    key: "NeedleThreaded",
    category: "criticalHit",
    tone: "humorous",
    impact: "narrative",
    fallbackTitle: "Needle Threaded",
    fallbackDescription: "The point passes armor, clothing, and dignity with the same astonishing precision.",
    weight: 1,
    tags: ["physical", "flourish"],
    filters: {
        "damageTypes": [
            "piercing"
        ]
    },
    effect: null
  }),
  defineCoreCard({
    id: "piercing.stuck-fast",
    namespace: "Piercing",
    key: "StuckFast",
    category: "criticalHit",
    tone: "humorous",
    impact: "light",
    fallbackTitle: "Stuck Fast",
    fallbackDescription: "For one embarrassingly long heartbeat, the weapon sits where it should not.",
    weight: 1,
    tags: ["physical", "control"],
    filters: {
        "damageTypes": [
            "piercing"
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
]);
