export function deepClone(value) {
  if (globalThis.foundry?.utils?.deepClone) {
    return foundry.utils.deepClone(value);
  }
  return value === undefined ? undefined : structuredClone(value);
}

export function deepFreeze(value, seen = new WeakSet()) {
  if (globalThis.foundry?.utils?.deepFreeze) {
    return foundry.utils.deepFreeze(value);
  }
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

export function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function normalizeStringArray(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new TypeError("Expected an array of strings.");
  return [...new Set(value.map((entry) => normalizeString(entry)).filter(Boolean))];
}

export function intersect(left = [], right = []) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}
