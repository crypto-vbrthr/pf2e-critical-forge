export const SUPPORTED_DURATION_UNITS = Object.freeze([
  "rounds",
  "minutes",
  "hours",
  "days",
  "unlimited"
]);

const SUPPORTED_UNITS = new Set(SUPPORTED_DURATION_UNITS);

export function buildDuration(value, unit = "rounds", expiry = "turn-end") {
  if (!SUPPORTED_UNITS.has(unit)) {
    throw new TypeError(`Unsupported duration unit: ${unit}`);
  }

  if (unit === "unlimited") {
    return Object.freeze({
      value: -1,
      unit: "unlimited",
      expiry: null
    });
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new TypeError("Duration value must be a non-negative finite number.");
  }

  return Object.freeze({
    value: numericValue,
    unit,
    expiry: expiry ?? "turn-end"
  });
}

export function normalizeDuration(duration, { allowNull = false } = {}) {
  if (duration == null) {
    if (allowNull) return null;
    return buildDuration(-1, "unlimited", null);
  }
  if (typeof duration !== "object" || Array.isArray(duration)) {
    throw new TypeError("Duration must be an object.");
  }
  return buildDuration(duration.value, duration.unit, duration.expiry);
}

export function durationKey(duration) {
  const normalized = normalizeDuration(duration);
  return `${normalized.unit}:${normalized.value}:${normalized.expiry ?? ""}`;
}

export function durationsEqual(left, right) {
  return durationKey(left) === durationKey(right);
}
