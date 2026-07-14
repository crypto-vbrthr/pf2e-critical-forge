const DEFINITIONS = Object.freeze([
  movement("all", "AllSpeeds", "all-speeds", "all"),
  movement("land", "LandSpeed", "land-speed", "mode"),
  movement("burrow", "BurrowSpeed", "burrow-speed", "mode"),
  movement("climb", "ClimbSpeed", "climb-speed", "mode"),
  movement("fly", "FlySpeed", "fly-speed", "mode"),
  movement("swim", "SwimSpeed", "swim-speed", "mode")
]);

const GROUP_ORDER = Object.freeze(["all", "mode"]);

function movement(value, label, selector, groupId) {
  return Object.freeze({
    value,
    selector,
    groupId,
    labelKey: `PF2E_CRITICAL_FORGE.EffectForge.MovementTypeLabels.${label}`,
    groupLabelKey: `PF2E_CRITICAL_FORGE.EffectForge.MovementTypeGroups.${groupId === "all" ? "All" : "Modes"}`
  });
}

function localize(key) {
  return game.i18n.localize(key);
}

export function listMovementTypeDefinitions() {
  return DEFINITIONS.map((definition) => Object.freeze({
    ...definition,
    label: localize(definition.labelKey),
    groupLabel: localize(definition.groupLabelKey)
  }));
}

export function getMovementTypeDefinition(value) {
  const normalized = String(value ?? "").trim();
  return listMovementTypeDefinitions().find((entry) => entry.value === normalized) ?? null;
}

export function isKnownMovementType(value) {
  return Boolean(getMovementTypeDefinition(value));
}

export function getMovementSelector(value) {
  return getMovementTypeDefinition(value)?.selector ?? null;
}

export function getMovementTypeGroups(selected = null) {
  const selectedValue = String(selected ?? "").trim();
  const grouped = new Map();

  for (const definition of listMovementTypeDefinitions()) {
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
      selected: definition.value === selectedValue
    });
  }

  return [...grouped.values()]
    .sort((a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id))
    .map((group) => Object.freeze({
      ...group,
      options: Object.freeze(group.options.map((option) => Object.freeze({ ...option })))
    }));
}
