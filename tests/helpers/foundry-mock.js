import assert from "node:assert/strict";

function deepClone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

function mergeObject(original, other, { inplace = true } = {}) {
  const target = inplace ? original : deepClone(original);
  for (const [key, value] of Object.entries(other ?? {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      target[key] = mergeObject(target[key], value, { inplace: false });
    } else {
      target[key] = deepClone(value);
    }
  }
  return target;
}

function getProperty(object, path) {
  return String(path)
    .split(".")
    .reduce((value, key) => value?.[key], object);
}

function format(key, data = {}) {
  return Object.entries(data).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    key
  );
}

export function installFoundryMock({ skills = {}, damageTypes = {}, resistanceTypes = {}, packs = new Map(), language = "de" } = {}) {
  globalThis.foundry = {
    utils: { deepClone, deepFreeze, mergeObject, getProperty }
  };

  globalThis.CONFIG = {
    PF2E: { skills, damageTypes, resistanceTypes }
  };

  globalThis.game = {
    i18n: {
      lang: language,
      localize: (key) => key,
      format
    },
    packs
  };
}

export function createConditionPack(entries) {
  const normalized = entries.map((entry, index) => ({
    _id: entry._id ?? `condition-${index}`,
    uuid: entry.uuid,
    system: {
      slug: entry.slug,
      value: { isValued: entry.isValued }
    }
  }));

  return {
    async getIndex() {
      return deepClone(normalized);
    },
    async getDocument(id) {
      const entry = normalized.find((candidate) => candidate._id === id);
      return entry ? deepClone(entry) : null;
    },
    getUuid(id) {
      return `Compendium.pf2e.conditionitems.Item.${id}`;
    }
  };
}

export function assertDeepFrozen(value, path = "root") {
  assert.equal(Object.isFrozen(value), true, `${path} should be frozen`);
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (nested && typeof nested === "object") {
      assertDeepFrozen(nested, `${path}.${key}`);
    }
  }
}
