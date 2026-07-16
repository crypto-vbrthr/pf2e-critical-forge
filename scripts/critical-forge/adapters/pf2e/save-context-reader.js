import { extractRollOptionValues, firstDefined, getPath, normalizeSlug, uniqueSlugs } from "./context-utils.js";

export const SAVE_TYPES = Object.freeze(["fortitude", "reflex", "will"]);

export function readSaveContext(input = {}, rollResult = {}, rollOptions = []) {
  const candidates = uniqueSlugs(
    input.saveTypes,
    input.saveType,
    getPath(input, "message.flags.pf2e.context.statistic"),
    getPath(input, "message.flags.pf2e.context.save"),
    rollResult.identifier,
    extractRollOptionValues(rollOptions, "check:statistic"),
    extractRollOptionValues(rollOptions, "check:type"),
    extractRollOptionValues(rollOptions, "saving-throw")
  );
  const saveTypes = candidates
    .map(normalizeSaveType)
    .filter((value, index, values) => value && values.indexOf(value) === index);

  return Object.freeze({
    saveTypes,
    metadata: Object.freeze({
      type: saveTypes[0] ?? null,
      dc: finiteNumber(firstDefined(
        input.saveDC,
        getPath(input, "message.flags.pf2e.context.dc.value"),
        getPath(input, "message.flags.pf2e.context.dc")
      ))
    })
  });
}

export function normalizeSaveType(value) {
  const slug = normalizeSlug(value);
  if (SAVE_TYPES.includes(slug)) return slug;
  return SAVE_TYPES.find((type) => slug === `${type}-save`
    || slug === `${type}-saving-throw`
    || slug.includes(`:${type}`)
    || slug.endsWith(`-${type}`)) ?? null;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
