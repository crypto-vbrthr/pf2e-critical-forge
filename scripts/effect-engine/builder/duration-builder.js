const SUPPORTED_UNITS = new Set([
  "rounds",
  "minutes",
  "hours",
  "days",
  "unlimited"
]);

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
