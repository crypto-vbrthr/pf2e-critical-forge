export function validateCompatibility(_definition, target) {
  if (!target) return [];

  return [{
    severity: "info",
    code: "COMPATIBILITY_TARGET_PRESENT",
    messageKey: "Validation.Compatibility.TargetPresent",
    data: {
      targetName: target.name ?? target.actor?.name ?? ""
    }
  }];
}
