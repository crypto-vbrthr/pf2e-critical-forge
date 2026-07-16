import {
  documentIdentity,
  extractRollOptionValues,
  firstDefined,
  getPath,
  normalizeSlug,
  normalizeSlugArray,
  recordTruthyKeys,
  uniqueSlugs
} from "./context-utils.js";
import { readSpellContext } from "./spell-context-reader.js";

export function resolveAttackItem(input = {}) {
  return firstDefined(
    input.item,
    input.strike?.item,
    input.message?.item,
    input.message?._strike?.item,
    input.message?._attack?.item
  ) ?? null;
}

export function readAttackContext(item, {
  input = {},
  rollOptions = [],
  damageRollFlag = null,
  rollResult = {}
} = {}) {
  const strike = input.strike ?? input.message?._strike ?? input.message?._attack ?? null;
  const selectedDamageType = normalizeSlug(firstDefined(
    getPath(item, "system.traits.toggles.versatile.selected"),
    getPath(item, "system.traits.toggles.modular.selected"),
    getPath(strike, "item.system.traits.toggles.versatile.selected"),
    getPath(strike, "item.system.traits.toggles.modular.selected")
  ));

  const directDamageType = normalizeSlug(firstDefined(
    getPath(item, "system.damage.damageType"),
    getPath(item, "system.damage.type"),
    getPath(strike, "item.system.damage.damageType"),
    getPath(strike, "item.system.damage.type")
  ));
  const npcDamageTypes = Object.values(getPath(item, "system.damageRolls") ?? {})
    .map((entry) => entry?.damageType);
  const spellDamageTypes = normalizeSlug(item?.type) === "spell"
    ? collectDamageTypes(getPath(item, "system.damage"))
    : [];
  const messageDamageTypes = recordTruthyKeys(damageRollFlag?.types);
  const optionDamageTypes = [
    ...extractRollOptionValues(rollOptions, "item:damage:type"),
    ...extractRollOptionValues(rollOptions, "damage:type")
  ];

  const itemDamageTypes = selectedDamageType
    ? [selectedDamageType, ...npcDamageTypes, ...spellDamageTypes]
    : [directDamageType, ...npcDamageTypes, ...spellDamageTypes];
  const damageTypes = uniqueSlugs(input.damageTypes, itemDamageTypes, messageDamageTypes, optionDamageTypes);

  const itemTraits = getPath(item, "system.traits.value") ?? [];
  const otherTags = getPath(item, "system.traits.otherTags") ?? [];
  const strikeTraits = normalizeStrikeTraits(strike?.traits ?? strike?.weaponTraits ?? []);
  const spell = readSpellContext(item, { input, rollOptions, rollResult });
  const baseAttackTraits = uniqueSlugs(
    input.attackTraits,
    itemTraits,
    otherTags,
    strikeTraits,
    extractRollOptionValues(rollOptions, "item:trait")
  );

  const weaponGroups = spell.isSpell ? [] : uniqueSlugs(
    input.weaponGroups,
    getPath(item, "system.group"),
    getPath(strike, "item.system.group"),
    extractRollOptionValues(rollOptions, "item:group")
  );

  const itemIdentity = documentIdentity(item);
  const range = firstDefined(getPath(item, "system.range"), getPath(strike, "item.system.range"));
  const rangeIncrement = finiteNumber(typeof range === "object" ? range?.increment : range);
  const explicitMelee = typeof input.isMelee === "boolean" ? input.isMelee : null;
  const explicitRanged = typeof input.isRanged === "boolean" ? input.isRanged : null;
  const itemIsMelee = firstBoolean(item?.isMelee, strike?.item?.isMelee);
  const itemIsRanged = firstBoolean(item?.isRanged, strike?.item?.isRanged);
  const isRanged = explicitRanged ?? itemIsRanged ?? (rangeIncrement != null ? true : spell.isSpell ? true : null);
  const isMelee = explicitMelee ?? itemIsMelee ?? (isRanged === true ? false : range === null ? true : null);
  const attackTraits = uniqueSlugs(
    baseAttackTraits,
    isMelee === true ? ["melee"] : [],
    isRanged === true ? ["ranged"] : [],
    spell.isSpell ? ["spell"] : []
  );

  return {
    item,
    strike,
    damageTypes,
    weaponGroups,
    attackTraits,
    spellTraits: spell.spellTraits,
    spellTraditions: spell.spellTraditions,
    metadata: {
      ...(itemIdentity ?? { id: null, uuid: null, name: null, type: null }),
      category: normalizeSlug(getPath(item, "system.category")) || null,
      baseItem: normalizeSlug(getPath(item, "system.baseItem")) || null,
      rangeIncrement,
      isMelee,
      isRanged,
      isSpell: spell.isSpell,
      spellRank: spell.metadata.rank,
      spellTraditions: spell.spellTraditions,
      altUsage: normalizeSlug(firstDefined(input.altUsage, getPath(input, "message.flags.pf2e.context.altUsage"))) || null,
      selectedDamageType: selectedDamageType || null
    }
  };
}

export function collectRollOptions(input = {}, rollResult = {}) {
  const messageContext = rollResult.contextFlag ?? getPath(input.message, "flags.pf2e.context") ?? {};
  const roll = rollResult.roll ?? input.roll;
  return uniqueSlugs(
    input.rollOptions,
    messageContext.options,
    messageContext.contextualOptions?.postRoll,
    roll?.options?.options,
    roll?.options?.rollOptions,
    input.strike?.options
  );
}

function normalizeStrikeTraits(traits) {
  return normalizeSlugArray(traits.map?.((trait) => {
    if (typeof trait === "string") return trait;
    const rollOption = String(trait?.rollOption ?? "");
    return rollOption.startsWith("item:trait:") ? rollOption.slice("item:trait:".length) : trait;
  }) ?? traits);
}

function collectDamageTypes(value) {
  const types = [];
  visit(value);
  return uniqueSlugs(types);

  function visit(entry) {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) {
      for (const item of entry) visit(item);
      return;
    }
    for (const key of ["damageType", "type"]) {
      const candidate = entry[key];
      if (typeof candidate === "string" && candidate && !["damage", "persistent"].includes(candidate)) {
        types.push(candidate);
      }
    }
    for (const child of Object.values(entry)) {
      if (child && typeof child === "object") visit(child);
    }
  }
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstBoolean(...values) {
  return values.find((value) => typeof value === "boolean") ?? null;
}
