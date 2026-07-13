export function buildPf2eDuration(duration) {
  if (!duration || duration.unit === "unlimited") {
    return { value: -1, unit: "unlimited", expiry: null, sustained: false };
  }
  return {
    value: duration.value,
    unit: duration.unit,
    expiry: duration.expiry ?? "turn-end",
    sustained: false
  };
}
