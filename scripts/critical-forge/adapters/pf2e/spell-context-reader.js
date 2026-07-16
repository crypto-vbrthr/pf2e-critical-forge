import {
  extractRollOptionValues,
  firstDefined,
  getPath,
  normalizeSlug,
  uniqueSlugs
} from "./context-utils.js";

export const SPELL_TRADITIONS = Object.freeze(["arcane", "divine", "occult", "primal"]);

export function readSpellContext(item, { input = {}, rollOptions = [], rollResult = {} } = {}) {
  const itemType = normalizeSlug(item?.type);
  const contextType = normalizeSlug(getPath(input, "message.flags.pf2e.context.type"));
  const explicitSpell = typeof input.isSpell === "boolean" ? input.isSpell : null;
  const inferredSpell = itemType === "spell"
    || rollOptions.some((option) => normalizeSlug(option) === "item:type:spell")
    || contextType.includes("spell-attack")
    || normalizeSlug(rollResult.action).includes("spell-attack")
    || normalizeSlug(rollResult.identifier).includes("spell-attack")
    || rollResult.rollFamily === "spellAttack";
  const isSpell = explicitSpell ?? inferredSpell;

  const itemTraits = isSpell ? uniqueSlugs(
    getPath(item, "system.traits.value"),
    getPath(item, "system.traits.otherTags")
  ) : [];
  const optionTraits = isSpell ? extractRollOptionValues(rollOptions, "item:trait") : [];
  const spellTraits = uniqueSlugs(
    input.spellTraits,
    itemTraits,
    optionTraits,
    isSpell ? extractRollOptionValues(rollOptions, "spell:trait") : []
  );
  const traditions = uniqueSlugs(
    input.spellTraditions,
    input.spellTradition,
    isSpell ? getPath(item, "system.traits.traditions") : [],
    isSpell ? getPath(item, "system.traditions") : [],
    getPath(input, "spellcasting.tradition"),
    getPath(input, "message.flags.pf2e.context.origin.spellcasting.tradition"),
    isSpell ? extractRollOptionValues(rollOptions, "spellcasting:tradition") : [],
    isSpell ? extractRollOptionValues(rollOptions, "spell:tradition") : [],
    spellTraits.filter((trait) => SPELL_TRADITIONS.includes(trait))
  ).filter((tradition) => SPELL_TRADITIONS.includes(tradition));

  return Object.freeze({
    isSpell: Boolean(isSpell),
    spellTraits,
    spellTraditions: traditions,
    metadata: Object.freeze({
      isSpell: Boolean(isSpell),
      rank: finiteNumber(firstDefined(
        getPath(item, "system.location.heightenedLevel"),
        getPath(item, "system.level.value"),
        input.spellRank
      )),
      traditions
    })
  });
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
