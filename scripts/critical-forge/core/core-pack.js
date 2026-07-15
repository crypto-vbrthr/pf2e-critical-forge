import { CARD_PACK_SCHEMA_VERSION, CARD_SCHEMA_VERSION, EFFECT_SCHEMA_VERSION } from "../../constants.js";

const unlimited = Object.freeze({ value: -1, unit: "unlimited", expiry: null });
const oneRound = Object.freeze({ value: 1, unit: "rounds", expiry: "turn-end" });
const oneMinute = Object.freeze({ value: 1, unit: "minutes", expiry: "turn-end" });

export const CORE_CRITICAL_CARD_PACK = Object.freeze({
  schemaVersion: CARD_PACK_SCHEMA_VERSION,
  id: "core",
  titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Packs.Core.Title",
  descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Packs.Core.Description",
  fallbackTitle: "Critical Forge Core",
  fallbackDescription: "Core architecture test cards for critical hits and fumbles.",
  version: "0.5.5",
  sourceModule: "pf2e-critical-forge",
  priority: 0,
  enabled: true,
  cards: [
    {
      schemaVersion: CARD_SCHEMA_VERSION,
      id: "core.slashing.deep-cut",
      packId: "core",
      category: "criticalHit",
      titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Slashing.DeepCut.Title",
      descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Slashing.DeepCut.Description",
      fallbackTitle: "Deep Cut",
      fallbackDescription: "The blade opens a wound that refuses to close.",
      weight: 2,
      tags: ["physical", "bleed"],
      filters: { damageTypes: ["slashing"], excludedTargetTraits: ["incorporeal"] },
      effect: {
        target: "target",
        nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Slashing.DeepCut.Name",
        fallbackName: "Deep Cut",
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: unlimited,
          components: [{ type: "persistentDamage", formula: "1d6", damageType: "bleed" }]
        }
      }
    },
    {
      schemaVersion: CARD_SCHEMA_VERSION,
      id: "core.piercing.puncture",
      packId: "core",
      category: "criticalHit",
      titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Piercing.Puncture.Title",
      descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Piercing.Puncture.Description",
      fallbackTitle: "Puncture",
      fallbackDescription: "The point leaves a narrow but stubbornly bleeding wound.",
      weight: 2,
      tags: ["physical", "bleed"],
      filters: { damageTypes: ["piercing"], excludedTargetTraits: ["incorporeal"] },
      effect: {
        target: "target",
        nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Piercing.Puncture.Name",
        fallbackName: "Puncture",
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: unlimited,
          components: [{ type: "persistentDamage", formula: "1d4", damageType: "bleed" }]
        }
      }
    },
    {
      schemaVersion: CARD_SCHEMA_VERSION,
      id: "core.bludgeoning.ringing-blow",
      packId: "core",
      category: "criticalHit",
      titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Bludgeoning.RingingBlow.Title",
      descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Bludgeoning.RingingBlow.Description",
      fallbackTitle: "Ringing Blow",
      fallbackDescription: "The impact turns the next heartbeat into thunder.",
      weight: 2,
      tags: ["physical", "control"],
      filters: { damageTypes: ["bludgeoning"] },
      effect: {
        target: "target",
        nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Bludgeoning.RingingBlow.Name",
        fallbackName: "Ringing Blow",
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: oneRound,
          components: [{ type: "condition", slug: "stunned", value: 1 }]
        }
      }
    },
    {
      schemaVersion: CARD_SCHEMA_VERSION,
      id: "core.generic.off-balance",
      packId: "core",
      category: "criticalHit",
      titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Generic.OffBalance.Title",
      descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Generic.OffBalance.Description",
      fallbackTitle: "Off Balance",
      fallbackDescription: "The hit tears the target out of its stance.",
      weight: 1,
      tags: ["generic", "control"],
      filters: {},
      effect: {
        target: "target",
        nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Generic.OffBalance.Name",
        fallbackName: "Off Balance",
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: oneRound,
          components: [{ type: "condition", slug: "off-guard" }]
        }
      }
    },
    {
      schemaVersion: CARD_SCHEMA_VERSION,
      id: "core.fumble.overextended",
      packId: "core",
      category: "criticalFumble",
      titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Fumble.Overextended.Title",
      descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Fumble.Overextended.Description",
      fallbackTitle: "Overextended",
      fallbackDescription: "The failed attack leaves the attacker exposed.",
      weight: 2,
      tags: ["generic", "fumble"],
      filters: {},
      effect: {
        target: "source",
        nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Fumble.Overextended.Name",
        fallbackName: "Overextended",
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: oneRound,
          components: [{ type: "condition", slug: "off-guard" }]
        }
      }
    },
    {
      schemaVersion: CARD_SCHEMA_VERSION,
      id: "core.fumble.weapon-jolt",
      packId: "core",
      category: "criticalFumble",
      titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Fumble.WeaponJolt.Title",
      descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Fumble.WeaponJolt.Description",
      fallbackTitle: "Weapon Jolt",
      fallbackDescription: "The miss sends a painful vibration through the attacker's grip.",
      weight: 1,
      tags: ["generic", "fumble"],
      filters: {},
      effect: {
        target: "source",
        nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Fumble.WeaponJolt.Name",
        fallbackName: "Weapon Jolt",
        definition: {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          duration: oneMinute,
          components: [{ type: "modifier", selector: "attack-roll", value: -1, modifierType: "circumstance", predicate: [] }]
        }
      }
    }
  ]
});
