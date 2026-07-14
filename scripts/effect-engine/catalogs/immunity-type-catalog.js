import { listDamageTypeDefinitions } from "./damage-type-catalog.js";

const GROUP_ORDER = Object.freeze([
  "damage-types",
  "damage-categories",
  "conditions",
  "effects",
  "sources",
  "additional"
]);

const FALLBACK_CONDITION_VALUES = Object.freeze([
  "blinded",
  "clumsy",
  "confused",
  "controlled",
  "dazzled",
  "deafened",
  "doomed",
  "drained",
  "enfeebled",
  "fascinated",
  "fatigued",
  "fleeing",
  "frightened",
  "grabbed",
  "immobilized",
  "off-guard",
  "paralyzed",
  "petrified",
  "prone",
  "restrained",
  "sickened",
  "slowed",
  "stunned",
  "stupefied",
  "unconscious",
  "wounded"
]);

const DAMAGE_CATEGORY_VALUES = Object.freeze([
  "area-damage",
  "critical-hits",
  "energy",
  "persistent-damage",
  "physical",
  "precision"
]);

const EFFECT_VALUES = Object.freeze([
  "aging",
  "auditory",
  "curse",
  "death-effects",
  "detection",
  "disease",
  "emotion",
  "fear-effects",
  "fortune-effects",
  "healing",
  "illusion",
  "inhaled",
  "light",
  "misfortune-effects",
  "object-immunities",
  "sleep",
  "visual"
]);

const SOURCE_VALUES = Object.freeze([
  "alchemical",
  "magic",
  "non-magical",
  "nonlethal-attacks",
  "spells",
  "unarmed-attacks",
  "weapons"
]);

function localize(key) {
  return game.i18n.localize(key);
}

function humanize(value) {
  return String(value)
    .split("-")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(" ");
}

function groupDefinition(id) {
  const labels = {
    "damage-types": "PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeGroups.DamageTypes",
    "damage-categories": "PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeGroups.DamageCategories",
    conditions: "PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeGroups.Conditions",
    effects: "PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeGroups.Effects",
    sources: "PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeGroups.Sources",
    additional: "PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeGroups.Additional"
  };

  return { id, label: localize(labels[id]) };
}

function configuredConditionValues() {
  return new Set(FALLBACK_CONDITION_VALUES);
}

function configuredImmunityTypes() {
  const configured = CONFIG.PF2E?.immunityTypes ?? {};
  const definitions = new Map();

  for (const [value, config] of Object.entries(configured)) {
    if (value === "custom") continue;

    const rawLabel = typeof config === "string"
      ? config
      : config?.label ?? config?.name;
    const label = typeof rawLabel === "string" && rawLabel
      ? localize(rawLabel)
      : humanize(value);

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

  const conditionTypes = CONFIG.PF2E?.conditionTypes ?? {};
  for (const value of configuredConditionValues()) {
    if (definitions.has(value)) continue;
    const labelKey = conditionTypes[value];
    definitions.set(value, {
      value,
      label: typeof labelKey === "string" && labelKey ? localize(labelKey) : humanize(value),
      source: "fallback"
    });
  }

  for (const value of [...DAMAGE_CATEGORY_VALUES, ...EFFECT_VALUES, ...SOURCE_VALUES]) {
    if (definitions.has(value)) continue;
    definitions.set(value, {
      value,
      label: localize(`PF2E_CRITICAL_FORGE.EffectForge.ImmunityTypeLabels.${value}`),
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
  if (configuredConditionValues().has(value)) return "conditions";
  if (EFFECT_VALUES.includes(value)) return "effects";
  if (SOURCE_VALUES.includes(value)) return "sources";
  return "additional";
}

export function listImmunityTypeDefinitions() {
  return [...configuredImmunityTypes().values()]
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

export function getImmunityTypeDefinition(value) {
  const normalized = String(value ?? "").trim();
  return listImmunityTypeDefinitions().find((entry) => entry.value === normalized) ?? null;
}

export function isKnownImmunityType(value) {
  return Boolean(getImmunityTypeDefinition(value));
}

export function getImmunityTypeGroups(selected = null) {
  const selectedValue = String(selected ?? "").trim();
  const grouped = new Map();

  for (const definition of listImmunityTypeDefinitions()) {
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
