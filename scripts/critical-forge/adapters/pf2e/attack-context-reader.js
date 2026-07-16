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
  damageRollFlag = null
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
  const messageDamageTypes = recordTruthyKeys(damageRollFlag?.types);
  const optionDamageTypes = [
    ...extractRollOptionValues(rollOptions, "item:damage:type"),
    ...extractRollOptionValues(rollOptions, "damage:type")
  ];

  const itemDamageTypes = selectedDamageType
    ? [selectedDamageType, ...npcDamageTypes]
    : [directDamageType, ...npcDamageTypes];
  const damageTypes = uniqueSlugs(input.damageTypes, itemDamageTypes, messageDamageTypes, optionDamageTypes);

  const itemTraits = getPath(item, "system.traits.value") ?? [];
  const otherTags = getPath(item, "system.traits.otherTags") ?? [];
  const strikeTraits = normalizeStrikeTraits(strike?.traits ?? strike?.weaponTraits ?? []);
  const baseAttackTraits = uniqueSlugs(
    input.attackTraits,
    itemTraits,
    otherTags,
    strikeTraits,
    extractRollOptionValues(rollOptions, "item:trait")
  );

  const weaponGroups = uniqueSlugs(
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
  const isRanged = explicitRanged ?? itemIsRanged ?? (rangeIncrement != null ? true : null);
  const isMelee = explicitMelee ?? itemIsMelee ?? (isRanged === true ? false : range === null ? true : null);
  const itemType = normalizeSlug(item?.type);
  const isSpell = typeof input.isSpell === "boolean" ? input.isSpell : itemType === "spell";
  const attackTraits = uniqueSlugs(
    baseAttackTraits,
    isMelee === true ? ["melee"] : [],
    isRanged === true ? ["ranged"] : [],
    isSpell ? ["spell"] : []
  );

  return {
    item,
    strike,
    damageTypes,
    weaponGroups,
    attackTraits,
    metadata: {
      ...(itemIdentity ?? { id: null, uuid: null, name: null, type: null }),
      category: normalizeSlug(getPath(item, "system.category")) || null,
      baseItem: normalizeSlug(getPath(item, "system.baseItem")) || null,
      rangeIncrement,
      isMelee,
      isRanged,
      isSpell,
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

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstBoolean(...values) {
  return values.find((value) => typeof value === "boolean") ?? null;
}
