import { listDamageTypeDefinitions } from "./damage-type-catalog.js";

const GROUP_ORDER = Object.freeze([
  "damage-types",
  "damage-categories",
  "sources",
  "additional"
]);

const DAMAGE_CATEGORY_VALUES = Object.freeze([
  "all-damage",
  "physical",
  "energy",
  "precision",
  "persistent-damage",
  "area-damage",
  "splash-damage",
  "critical-hits"
]);

const SOURCE_VALUES = Object.freeze([
  "alchemical",
  "magical",
  "non-magical",
  "weapons",
  "unarmed-attacks",
  "damage-from-spells",
  "spells"
]);

const FALLBACK_LABEL_KEYS = Object.freeze({
  "all-damage": "AllDamage",
  physical: "Physical",
  energy: "Energy",
  precision: "Precision",
  "persistent-damage": "PersistentDamage",
  "area-damage": "AreaDamage",
  "splash-damage": "SplashDamage",
  "critical-hits": "CriticalHits",
  alchemical: "Alchemical",
  magical: "Magical",
  "non-magical": "NonMagical",
  weapons: "Weapons",
  "unarmed-attacks": "UnarmedAttacks",
  "damage-from-spells": "DamageFromSpells",
  spells: "Spells"
});

function localize(key) {
  return game.i18n.localize(key);
}

function groupDefinition(id) {
  const labels = {
    "damage-types": "PF2E_CRITICAL_FORGE.EffectForge.WeaknessTypeGroups.DamageTypes",
    "damage-categories": "PF2E_CRITICAL_FORGE.EffectForge.WeaknessTypeGroups.DamageCategories",
    sources: "PF2E_CRITICAL_FORGE.EffectForge.WeaknessTypeGroups.Sources",
    additional: "PF2E_CRITICAL_FORGE.EffectForge.WeaknessTypeGroups.Additional"
  };

  return { id, label: localize(labels[id]) };
}

function configuredWeaknessTypes() {
  const configured = CONFIG.PF2E?.weaknessTypes ?? {};
  const definitions = new Map();

  for (const [value, config] of Object.entries(configured)) {
    if (value === "custom") continue;

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

  for (const damageType of listDamageTypeDefinitions()) {
    if (definitions.has(damageType.value)) continue;
    definitions.set(damageType.value, {
      value: damageType.value,
      label: damageType.label,
      source: damageType.source
    });
  }

  for (const [value, labelName] of Object.entries(FALLBACK_LABEL_KEYS)) {
    if (definitions.has(value)) continue;
    definitions.set(value, {
      value,
      label: localize(
        `PF2E_CRITICAL_FORGE.EffectForge.WeaknessTypeLabels.${labelName}`
      ),
      source: "fallback"
    });
  }

  return definitions;
}

function groupIdFor(value) {
  if (listDamageTypeDefinitions().some((entry) => entry.value === value)) {
    return "damage-types";
  }
  if (DAMAGE_CATEGORY_VALUES.includes(value)) return "damage-categories";
  if (SOURCE_VALUES.includes(value)) return "sources";
  return "additional";
}

export function listWeaknessTypeDefinitions() {
  return [...configuredWeaknessTypes().values()]
    .map((definition) => {
      const group = groupDefinition(groupIdFor(definition.value));
      return Object.freeze({
        ...definition,
        groupId: group.id,
        groupLabel: group.label
      });
    })
    .sort((a, b) => {
      const groupCompare = GROUP_ORDER.indexOf(a.groupId) - GROUP_ORDER.indexOf(b.groupId);
      return groupCompare || a.label.localeCompare(b.label, game.i18n.lang);
    });
}

export function getWeaknessTypeDefinition(value) {
  const normalized = String(value ?? "").trim();
  return listWeaknessTypeDefinitions().find((entry) => entry.value === normalized) ?? null;
}

export function isKnownWeaknessType(value) {
  return Boolean(getWeaknessTypeDefinition(value));
}

export function getWeaknessTypeGroups(selected = null) {
  const selectedValue = String(selected ?? "").trim();
  const grouped = new Map();

  for (const definition of listWeaknessTypeDefinitions()) {
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
    .map((group) => Object.freeze({
      ...group,
      options: Object.freeze(group.options
        .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
        .map((option) => Object.freeze({ ...option })))
    }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id));
}
