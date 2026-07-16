import { CARD_PACK_SCHEMA_VERSION } from "../../constants.js";
import { CARDS as SLASHING_CARDS } from "./cards/slashing-cards.js";
import { CARDS as PIERCING_CARDS } from "./cards/piercing-cards.js";
import { CARDS as BLUDGEONING_CARDS } from "./cards/bludgeoning-cards.js";
import { CARDS as GENERIC_HIT_CARDS } from "./cards/generic-hit-cards.js";
import { CARDS as MELEE_FUMBLE_CARDS } from "./cards/melee-fumble-cards.js";
import { CARDS as RANGED_FUMBLE_CARDS } from "./cards/ranged-fumble-cards.js";
import { CARDS as GENERIC_FUMBLE_CARDS } from "./cards/generic-fumble-cards.js";
import { CARDS as SPELL_HIT_CARDS } from "./cards/spell-hit-cards.js";
import { CARDS as SPELL_FUMBLE_CARDS } from "./cards/spell-fumble-cards.js";
import { CARDS as SAVE_SUCCESS_CARDS } from "./cards/save-success-cards.js";
import { CARDS as SAVE_FAILURE_CARDS } from "./cards/save-failure-cards.js";

export const CORE_CRITICAL_CARD_PACK = Object.freeze({
  schemaVersion: CARD_PACK_SCHEMA_VERSION,
  id: "core",
  titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Packs.Core.Title",
  descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Packs.Core.Description",
  fallbackTitle: "Critical Forge Core",
  fallbackDescription: "Balanced test library for critical hits and fumbles.",
  version: "0.7.1",
  sourceModule: "pf2e-critical-forge",
  priority: 0,
  enabled: true,
  metadata: { library: "core-test-library-1" },
  cards: Object.freeze([
    ...SLASHING_CARDS,
    ...PIERCING_CARDS,
    ...BLUDGEONING_CARDS,
    ...GENERIC_HIT_CARDS,
    ...MELEE_FUMBLE_CARDS,
    ...RANGED_FUMBLE_CARDS,
    ...GENERIC_FUMBLE_CARDS,
    ...SPELL_HIT_CARDS,
    ...SPELL_FUMBLE_CARDS,
    ...SAVE_SUCCESS_CARDS,
    ...SAVE_FAILURE_CARDS
  ])
});
