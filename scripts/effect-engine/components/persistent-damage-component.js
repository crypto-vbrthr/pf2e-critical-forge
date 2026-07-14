import { isKnownDamageType } from "../catalogs/damage-type-catalog.js";
import { resolveConditionDefinition } from "../condition-resolver.js";

function error(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const persistentDamageComponent = {
  type: "persistentDamage",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (typeof component.formula !== "string" || !component.formula.trim()) {
      errors.push(error(
        "PERSISTENT_DAMAGE_FORMULA_MISSING",
        "Validation.Components.PersistentDamage.FormulaMissing"
      ));
    }

    if (typeof component.damageType !== "string" || !isKnownDamageType(component.damageType)) {
      errors.push(error(
        "PERSISTENT_DAMAGE_TYPE_INVALID",
        "Validation.Components.PersistentDamage.TypeInvalid",
        { damageType: String(component.damageType ?? "") }
      ));
    }

    if (
      component.dc !== undefined &&
      (!Number.isInteger(component.dc) || component.dc < 1)
    ) {
      errors.push(error(
        "PERSISTENT_DAMAGE_DC_INVALID",
        "Validation.Components.PersistentDamage.DcInvalid",
        { dc: String(component.dc ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    const condition = await resolveConditionDefinition("persistent-damage");
    const alterations = [{
      mode: "override",
      property: "persistent-damage",
      value: {
        damageType: component.damageType,
        formula: component.formula.trim()
      }
    }];

    if (component.dc !== undefined) {
      alterations.push({
        mode: "override",
        property: "pd-recovery-dc",
        value: component.dc
      });
    }

    const rule = {
      key: "GrantItem",
      uuid: condition.uuid,
      allowDuplicate: true,
      alterations
    };

    return {
      kind: "persistentDamage",
      formula: component.formula.trim(),
      damageType: component.damageType,
      dc: component.dc ?? null,
      rules: [rule]
    };
  },

  describe(component) {
    const dc = component.dc === undefined ? "" : ` (DC ${component.dc})`;
    return `${component.formula} persistent ${component.damageType}${dc}`;
  }
};
