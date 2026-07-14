const DEFINITIONS = Object.freeze([
  movement("all", "AllSpeeds", "all-speeds", null, "all"),
  movement("land", "LandSpeed", "land-speed", null, "mode"),
  movement("burrow", "BurrowSpeed", "burrow-speed", "burrow", "mode"),
  movement("climb", "ClimbSpeed", "climb-speed", "climb", "mode"),
  movement("fly", "FlySpeed", "fly-speed", "fly", "mode"),
  movement("swim", "SwimSpeed", "swim-speed", "swim", "mode")
]);

const GROUP_ORDER = Object.freeze(["all", "mode"]);

function movement(value, label, selector, baseSpeedSelector, groupId) {
  return Object.freeze({
    value,
    selector,
    baseSpeedSelector,
    grantable: Boolean(baseSpeedSelector),
    groupId,
    labelKey: `PF2E_CRITICAL_FORGE.EffectForge.MovementTypeLabels.${label}`,
    groupLabelKey: `PF2E_CRITICAL_FORGE.EffectForge.MovementTypeGroups.${groupId === "all" ? "All" : "Modes"}`
  });
}

function localize(key) {
  return game.i18n.localize(key);
}

function localizeDefinition(definition) {
  return Object.freeze({
    ...definition,
    label: localize(definition.labelKey),
    groupLabel: localize(definition.groupLabelKey)
  });
}

function groupDefinitions(definitions, selected = null) {
  const selectedValue = String(selected ?? "").trim();
  const grouped = new Map();

  for (const definition of definitions) {
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

export function listMovementTypeDefinitions() {
  return DEFINITIONS.map(localizeDefinition);
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
  return groupDefinitions(listMovementTypeDefinitions(), selected);
}

export function listBaseSpeedTypeDefinitions() {
  return listMovementTypeDefinitions().filter((definition) => definition.grantable);
}

export function getBaseSpeedTypeDefinition(value) {
  const normalized = String(value ?? "").trim();
  return listBaseSpeedTypeDefinitions().find((entry) => entry.value === normalized) ?? null;
}

export function isKnownBaseSpeedType(value) {
  return Boolean(getBaseSpeedTypeDefinition(value));
}

export function getBaseSpeedSelector(value) {
  return getBaseSpeedTypeDefinition(value)?.baseSpeedSelector ?? null;
}

export function getBaseSpeedTypeGroups(selected = null) {
  return groupDefinitions(listBaseSpeedTypeDefinitions(), selected);
}
