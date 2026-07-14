export function shakenNerves({ modifierType = "circumstance" } = {}) {
  return {
    schemaVersion: 1,
    id: "example.shaken-nerves",
    name: "Erschütterte Nerven",
    description: "<p>Das Ziel ist erschüttert.</p>",
    img: "icons/svg/terror.svg",
    duration: { value: 2, unit: "rounds", expiry: "turn-end" },
    components: [
      { type: "condition", slug: "frightened", value: 2 },
      {
        type: "modifier",
        selector: "will",
        value: -1,
        modifierType,
        predicate: []
      }
    ],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function proneEffect({ includeLegacyValue = false } = {}) {
  const condition = { type: "condition", slug: "prone" };
  if (includeLegacyValue) condition.value = 1;

  return {
    schemaVersion: 1,
    id: "example.prone",
    name: "Zu Boden",
    duration: { value: 1, unit: "rounds", expiry: "turn-end" },
    components: [condition],
    application: {},
    metadata: {}
  };
}

export function persistentBleed({ dc = undefined, formula = "1d6", damageType = "bleed" } = {}) {
  const component = {
    type: "persistentDamage",
    formula,
    damageType
  };
  if (dc !== undefined) component.dc = dc;

  return {
    schemaVersion: 1,
    id: "example.persistent-bleed",
    name: "Blutende Wunde",
    duration: { value: -1, unit: "unlimited", expiry: null },
    components: [component],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function fireWeakness({ value = 5, weaknessType = "fire" } = {}) {
  return {
    schemaVersion: 1,
    id: "example.fire-weakness",
    name: "Feuerempfindlich",
    duration: { value: 10, unit: "minutes", expiry: "turn-end" },
    components: [{
      type: "weakness",
      weaknessType,
      value
    }],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function fireResistance({ value = 5, resistanceType = "fire" } = {}) {
  return {
    schemaVersion: 1,
    id: "example.fire-resistance",
    name: "Feuerschutz",
    duration: { value: 10, unit: "minutes", expiry: "turn-end" },
    components: [{
      type: "resistance",
      resistanceType,
      value
    }],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function fireImmunity({ immunityType = "fire" } = {}) {
  return {
    schemaVersion: 1,
    id: "example.fire-immunity",
    name: "Feuerimmunität",
    duration: { value: 10, unit: "minutes", expiry: "turn-end" },
    components: [{
      type: "immunity",
      immunityType
    }],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function fastHealing({ value = 2 } = {}) {
  return {
    schemaVersion: 1,
    id: "example.fast-healing",
    name: "Schnelle Heilung",
    duration: { value: 1, unit: "minutes", expiry: "turn-end" },
    components: [{
      type: "fastHealing",
      value
    }],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function temporaryHitPoints({ value = 5 } = {}) {
  return {
    schemaVersion: 1,
    id: "example.temporary-hit-points",
    name: "Temporäre Trefferpunkte",
    duration: { value: 1, unit: "minutes", expiry: "turn-end" },
    components: [{
      type: "temporaryHitPoints",
      value
    }],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function regeneration({ value = 5, deactivatedBy = ["acid", "fire"] } = {}) {
  return {
    schemaVersion: 1,
    id: "example.regeneration",
    name: "Regeneration",
    duration: { value: 1, unit: "minutes", expiry: "turn-end" },
    components: [{
      type: "regeneration",
      value,
      deactivatedBy
    }],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}
