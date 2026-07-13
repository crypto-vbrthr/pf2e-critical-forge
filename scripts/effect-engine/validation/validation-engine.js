import { ValidationReport } from "./validation-report.js";
import { validateSchema } from "./validators/schema-validator.js";
import { validateRules } from "./validators/rule-validator.js";
import { validateCompatibility } from "./validators/compatibility-validator.js";

export function analyzeEffectDefinition(definition, context = {}) {
  const report = new ValidationReport();
  report.addMany(validateSchema(definition));

  if (!report.valid) return report.toJSON();

  report.addMany(validateRules(definition));
  report.addMany(validateCompatibility(definition, context.target ?? null));
  return report.toJSON();
}
