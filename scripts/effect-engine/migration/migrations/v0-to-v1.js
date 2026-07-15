function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

function normalizeComponent(source, changes) {
  const component = clone(source ?? {});

  const typeAliases = {
    "persistent-damage": "persistentDamage",
    "fast-healing": "fastHealing",
    "temporary-hit-points": "temporaryHitPoints",
    "base-speed": "baseSpeed"
  };
  if (typeAliases[component.type]) {
    component.type = typeAliases[component.type];
    changes.push("component-type-alias");
  }

  if (component.type === "condition" && component.slug == null && component.condition != null) {
    component.slug = component.condition;
    delete component.condition;
    changes.push("condition-slug-alias");
  }

  if (component.type === "modifier" && component.modifierType == null && component.bonusType != null) {
    component.modifierType = component.bonusType;
    delete component.bonusType;
    changes.push("modifier-type-alias");
  }

  if (component.type === "persistentDamage") {
    if (component.formula == null && component.damageFormula != null) {
      component.formula = component.damageFormula;
      delete component.damageFormula;
      changes.push("persistent-damage-formula-alias");
    }
    if (component.damageType == null && component.damage_type != null) {
      component.damageType = component.damage_type;
      delete component.damage_type;
      changes.push("persistent-damage-type-alias");
    }
  }

  const typedAliases = {
    resistance: "resistanceType",
    weakness: "weaknessType",
    immunity: "immunityType"
  };
  const typeField = typedAliases[component.type];
  if (typeField && component[typeField] == null && component.subtype != null) {
    component[typeField] = component.subtype;
    delete component.subtype;
    changes.push(`${component.type}-type-alias`);
  }

  return component;
}

/** Legacy schema 0 was never formally published. This migration accepts the
 * field aliases used by early prototypes and normalizes missing containers. */
export function migrateV0ToV1(definition) {
  const source = clone(definition);
  const changes = [];
  const warnings = [];

  if (source.img == null && source.image != null) {
    source.img = source.image;
    delete source.image;
    changes.push("image-alias");
  }

  if (!Array.isArray(source.components) && Array.isArray(source.effects)) {
    source.components = source.effects;
    delete source.effects;
    changes.push("components-alias");
  }

  source.components = Array.isArray(source.components)
    ? source.components.map((component) => normalizeComponent(component, changes))
    : [];

  if (typeof source.duration === "number") {
    source.duration = {
      value: source.duration,
      unit: "rounds",
      expiry: "turn-end"
    };
    changes.push("numeric-duration");
  }

  source.img ??= "icons/svg/aura.svg";
  source.description ??= "";
  source.duration ??= { value: -1, unit: "unlimited", expiry: null };
  source.application = source.application && typeof source.application === "object"
    ? source.application
    : {};
  source.metadata = source.metadata && typeof source.metadata === "object"
    ? source.metadata
    : {};
  source.schemaVersion = 1;

  if (source.components.length === 0) {
    warnings.push({ code: "MIGRATION_COMPONENTS_EMPTY" });
  }

  return { definition: source, changes: [...new Set(changes)], warnings };
}
