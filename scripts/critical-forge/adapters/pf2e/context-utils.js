import { normalizeString } from "../../utils.js";

export function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  if (typeof value === "object" && Symbol.iterator in value) return [...value];
  return [value];
}

export function normalizeSlug(value) {
  return normalizeString(value).toLowerCase();
}

export function normalizeSlugArray(value) {
  const result = [];
  const seen = new Set();
  for (const entry of asArray(value)) {
    const slug = normalizeSlug(typeof entry === "object" ? extractObjectSlug(entry) : entry);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
  }
  return result;
}

export function uniqueSlugs(...values) {
  return normalizeSlugArray(values.flatMap((value) => asArray(value)));
}

export function getPath(object, path) {
  if (globalThis.foundry?.utils?.getProperty) {
    return foundry.utils.getProperty(object, path);
  }
  return String(path)
    .split(".")
    .reduce((value, key) => value?.[key], object);
}

export function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export function recordTruthyKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .filter(([, enabled]) => enabled !== false && enabled != null)
    .map(([key]) => key);
}

export function extractRollOptionValues(options, prefix) {
  const normalizedPrefix = `${prefix}:`;
  return normalizeSlugArray(options)
    .filter((option) => option.startsWith(normalizedPrefix))
    .map((option) => option.slice(normalizedPrefix.length))
    .filter(Boolean);
}

export function documentIdentity(document) {
  if (!document || typeof document !== "object") return null;
  const id = normalizeString(document.id ?? document._id) || null;
  const uuid = normalizeString(document.uuid) || null;
  const name = normalizeString(document.name) || null;
  const type = normalizeString(document.type) || null;
  return { id, uuid, name, type };
}

function extractObjectSlug(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const rollOption = normalizeString(entry.rollOption);
  if (rollOption.includes(":")) return rollOption.split(":").at(-1);
  return entry.slug ?? entry.name ?? entry.value ?? entry.id ?? "";
}
