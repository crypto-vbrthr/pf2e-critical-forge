const GROUP_ORDER = Object.freeze(["physical", "energy", "other", "additional"]);

const STANDARD_GROUPS = Object.freeze([
  {
    id: "physical",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.DamageTypeGroups.Physical",
    values: ["bleed", "bludgeoning", "piercing", "slashing"]
  },
  {
    id: "energy",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.DamageTypeGroups.Energy",
    values: ["acid", "cold", "electricity", "fire", "force", "sonic", "vitality", "void"]
  },
  {
    id: "other",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.DamageTypeGroups.Other",
    values: ["mental", "poison", "spirit"]
  }
]);

const FALLBACK_LABELS = Object.freeze({
  acid: "Acid",
  bleed: "Bleed",
  bludgeoning: "Bludgeoning",
  cold: "Cold",
  electricity: "Electricity",
  fire: "Fire",
  force: "Force",
  mental: "Mental",
  piercing: "Piercing",
  poison: "Poison",
  slashing: "Slashing",
  sonic: "Sonic",
  spirit: "Spirit",
  vitality: "Vitality",
  void: "Void"
});

function localize(key) {
  return game.i18n.localize(key);
}

function configuredDamageTypes() {
  const configured = CONFIG.PF2E?.damageTypes ?? {};
  const definitions = new Map();

  for (const [value, config] of Object.entries(configured)) {
    const rawLabel = typeof config === "string"
      ? config
      : config?.label ?? config?.name;
    const label = typeof rawLabel === "string" && rawLabel
      ? localize(rawLabel)
      : value;

    definitions.set(value, {
      value,
      label,
      source: "pf2e-config"
    });
  }

  // The fallback keeps the catalog usable during init, in tests, and in older
  // compatible PF2e releases whose CONFIG object may not yet be complete.
  for (const [value, labelName] of Object.entries(FALLBACK_LABELS)) {
    if (definitions.has(value)) continue;
    definitions.set(value, {
      value,
      label: localize(
        `PF2E_CRITICAL_FORGE.EffectForge.DamageTypeLabels.${labelName}`
      ),
      source: "fallback"
    });
  }

  return definitions;
}

function groupFor(value) {
  return STANDARD_GROUPS.find((group) => group.values.includes(value)) ?? {
    id: "additional",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.DamageTypeGroups.Additional"
  };
}

export function listDamageTypeDefinitions() {
  const definitions = configuredDamageTypes();

  return [...definitions.values()]
    .map((definition) => {
      const group = groupFor(definition.value);
      return Object.freeze({
        ...definition,
        groupId: group.id,
        groupLabel: localize(group.labelKey)
      });
    })
    .sort((a, b) => {
      const groupCompare = GROUP_ORDER.indexOf(a.groupId) - GROUP_ORDER.indexOf(b.groupId);
      return groupCompare || a.label.localeCompare(b.label, game.i18n.lang);
    });
}

export function getDamageTypeDefinition(value) {
  const normalized = String(value ?? "").trim();
  return listDamageTypeDefinitions().find((entry) => entry.value === normalized) ?? null;
}

export function isKnownDamageType(value) {
  return Boolean(getDamageTypeDefinition(value));
}

export function getDamageTypeGroups(selected = null) {
  const selectedValues = new Set(
    (Array.isArray(selected) ? selected : [selected])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  );
  const grouped = new Map();

  for (const definition of listDamageTypeDefinitions()) {
    if (!grouped.has(definition.groupId)) {
      grouped.set(definition.groupId, {
        id: definition.groupId,
        label: definition.groupLabel,
        options: []
      });
    }

    grouped.get(definition.groupId).options.push({
      value: definition.value,
      label: definition.label,
      selected: selectedValues.has(definition.value)
    });
  }

  return [...grouped.values()]
    .map((group) => Object.freeze({
      ...group,
      options: Object.freeze(group.options
        .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
        .map((option) => Object.freeze({ ...option })))
    }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id));
}
