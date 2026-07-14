export function buildCondition(slug, value) {
  const normalizedSlug = String(slug ?? "").trim();
  if (!normalizedSlug) {
    throw new TypeError("Condition slug must not be empty.");
  }

  const component = {
    type: "condition",
    slug: normalizedSlug
  };

  if (value !== undefined && value !== null && value !== "") {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      throw new TypeError("Condition value must be a non-negative integer.");
    }
    component.value = numericValue;
  }

  return Object.freeze(component);
}

export function buildModifier({
  selector,
  value,
  modifierType = "status",
  predicate = [],
  label
} = {}) {
  const selectors = Array.isArray(selector)
    ? selector.map((entry) => String(entry).trim()).filter(Boolean)
    : String(selector ?? "").trim();

  if ((Array.isArray(selectors) && selectors.length === 0) || !selectors) {
    throw new TypeError("Modifier selector must not be empty.");
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError("Modifier value must be a finite number.");
  }

  if (!Array.isArray(predicate)) {
    throw new TypeError("Modifier predicate must be an array.");
  }

  const component = {
    type: "modifier",
    selector: selectors,
    value: numericValue,
    modifierType: String(modifierType ?? "status"),
    predicate: foundry.utils.deepClone(predicate)
  };

  if (typeof label === "string" && label.trim()) {
    component.label = label.trim();
  }

  return Object.freeze(component);
}

export function buildPersistentDamage({ formula, damageType, dc } = {}) {
  const normalizedFormula = String(formula ?? "").trim();
  if (!normalizedFormula) {
    throw new TypeError("Persistent damage formula must not be empty.");
  }

  const normalizedDamageType = String(damageType ?? "").trim();
  if (!normalizedDamageType) {
    throw new TypeError("Persistent damage type must not be empty.");
  }

  const component = {
    type: "persistentDamage",
    formula: normalizedFormula,
    damageType: normalizedDamageType
  };

  if (dc !== undefined && dc !== null && dc !== "") {
    const numericDc = Number(dc);
    if (!Number.isInteger(numericDc) || numericDc < 1) {
      throw new TypeError("Persistent damage recovery DC must be a positive integer.");
    }
    component.dc = numericDc;
  }

  return Object.freeze(component);
}

export function cloneComponent(component) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new TypeError("Component must be an object.");
  }

  return foundry.utils.deepClone(component);
}
