const CUSTOM_SELECTOR_VALUE = "__custom__";

const FALLBACK_SKILLS = Object.freeze([
  ["acrobatics", "Acrobatics"],
  ["arcana", "Arcana"],
  ["athletics", "Athletics"],
  ["crafting", "Crafting"],
  ["deception", "Deception"],
  ["diplomacy", "Diplomacy"],
  ["intimidation", "Intimidation"],
  ["medicine", "Medicine"],
  ["nature", "Nature"],
  ["occultism", "Occultism"],
  ["performance", "Performance"],
  ["religion", "Religion"],
  ["society", "Society"],
  ["stealth", "Stealth"],
  ["survival", "Survival"],
  ["thievery", "Thievery"]
]);

const STATIC_GROUPS = Object.freeze([
  {
    id: "saving-throws",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.SavingThrows",
    options: [
      selector("saving-throw", "AllSavingThrows", true),
      selector("fortitude", "Fortitude", true),
      selector("reflex", "Reflex", true),
      selector("will", "Will", true)
    ]
  },
  {
    id: "attributes",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.Attributes",
    options: [
      selector("str-based", "StrengthBased", true),
      selector("dex-based", "DexterityBased", true),
      selector("con-based", "ConstitutionBased", true),
      selector("int-based", "IntelligenceBased", true),
      selector("wis-based", "WisdomBased", true),
      selector("cha-based", "CharismaBased", true)
    ]
  },
  {
    id: "attacks",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.Attacks",
    options: [
      selector("attack", "AllAttackRolls", true),
      selector("strike-attack-roll", "StrikeAttackRolls", true),
      selector("melee-attack-roll", "MeleeAttackRolls", true),
      selector("ranged-attack-roll", "RangedAttackRolls", true),
      selector("spell-attack-roll", "SpellAttackRolls", true)
    ]
  },
  {
    id: "perception-initiative",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.PerceptionInitiative",
    options: [
      selector("perception", "Perception", true),
      selector("initiative", "Initiative", true)
    ]
  },
  {
    id: "defenses-dcs",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.DefensesDCs",
    options: [
      selector("ac", "ArmorClass", true),
      selector("perception-dc", "PerceptionDC", true),
      selector("fortitude-dc", "FortitudeDC", true),
      selector("reflex-dc", "ReflexDC", true),
      selector("will-dc", "WillDC", true),
      selector("class", "ClassDC", true),
      selector("spell-dc", "SpellDC", true)
    ]
  },
  {
    id: "movement",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.Movement",
    options: [
      selector("all-speeds", "AllSpeeds", false),
      selector("land-speed", "LandSpeed", false),
      selector("burrow-speed", "BurrowSpeed", false),
      selector("climb-speed", "ClimbSpeed", false),
      selector("fly-speed", "FlySpeed", false),
      selector("swim-speed", "SwimSpeed", false)
    ]
  },
  {
    id: "health-damage",
    labelKey: "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.HealthDamage",
    options: [
      selector("hp", "HitPoints", false),
      selector("damage", "AllDamage", false),
      selector("strike-damage", "StrikeDamage", false),
      selector("spell-damage", "SpellDamage", false),
      selector("damage-received", "DamageReceived", false),
      selector("healing-received", "HealingReceived", false)
    ]
  }
]);

const GROUP_ORDER = Object.freeze([
  "saving-throws",
  "skills",
  "attributes",
  "attacks",
  "perception-initiative",
  "defenses-dcs",
  "movement",
  "health-damage"
]);

const HIDDEN_KNOWN_SELECTORS = Object.freeze([
  { value: "all", frightenedAffected: true },
  { value: "check", frightenedAffected: true },
  { value: "attack-roll", frightenedAffected: true }
]);

function selector(value, label, frightenedAffected) {
  return Object.freeze({
    value,
    labelKey: `PF2E_CRITICAL_FORGE.EffectForge.SelectorLabels.${label}`,
    frightenedAffected
  });
}

function localize(key) {
  return game.i18n.localize(key);
}

function configuredSkills() {
  const configured = CONFIG.PF2E?.skills ?? {};
  const entries = Object.entries(configured).map(([value, config]) => {
    const rawLabel = typeof config === "string" ? config : config?.label;
    const label = typeof rawLabel === "string" && rawLabel
      ? localize(rawLabel)
      : value;

    return Object.freeze({
      value,
      label,
      frightenedAffected: true,
      source: "pf2e-config"
    });
  });

  if (entries.length > 0) return entries;

  return FALLBACK_SKILLS.map(([value, label]) => Object.freeze({
    value,
    label: localize(`PF2E_CRITICAL_FORGE.EffectForge.SkillFallback.${label}`),
    frightenedAffected: true,
    source: "fallback"
  }));
}

function staticDefinitions() {
  return STATIC_GROUPS.flatMap((group) => group.options.map((option) => ({
    ...option,
    groupId: group.id,
    groupLabel: localize(group.labelKey),
    label: localize(option.labelKey),
    source: "core"
  })));
}

export function listSelectorDefinitions() {
  const skillGroupLabel = localize(
    "PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.Skills"
  );
  const skills = [
    {
      value: "skill-check",
      label: localize("PF2E_CRITICAL_FORGE.EffectForge.SelectorLabels.AllSkillChecks"),
      frightenedAffected: true,
      source: "core"
    },
    ...configuredSkills()
  ].map((option) => ({
    ...option,
    groupId: "skills",
    groupLabel: skillGroupLabel
  }));

  return [...staticDefinitions(), ...skills]
    .map((definition) => Object.freeze({ ...definition }))
    .sort((a, b) => {
      const groupCompare = GROUP_ORDER.indexOf(a.groupId) - GROUP_ORDER.indexOf(b.groupId);
      return groupCompare || a.label.localeCompare(b.label, game.i18n.lang);
    });
}

export function getSelectorDefinition(value) {
  const selectorValue = String(value ?? "").trim();
  const visible = listSelectorDefinitions().find((entry) => entry.value === selectorValue);
  if (visible) return visible;

  const hidden = HIDDEN_KNOWN_SELECTORS.find((entry) => entry.value === selectorValue);
  return hidden ? Object.freeze({ ...hidden, hidden: true }) : null;
}

export function isKnownSelector(value) {
  return Boolean(getSelectorDefinition(value));
}

export function isValidSelectorSyntax(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value ?? "").trim());
}

export function selectorIsAffectedByFrightened(value) {
  return getSelectorDefinition(value)?.frightenedAffected === true;
}

export function getSelectorGroups(selected = null, { includeCustom = true } = {}) {
  const selectedValue = String(selected ?? "").trim();
  const known = isKnownSelector(selectedValue);
  const definitions = listSelectorDefinitions();
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
      selected: known && definition.value === selectedValue
    });
  }

  const groups = [...grouped.values()]
    .map((group) => ({
      ...group,
      options: group.options.sort((a, b) =>
        a.label.localeCompare(b.label, game.i18n.lang)
      )
    }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id));

  if (includeCustom) {
    groups.push({
      id: "custom",
      label: localize("PF2E_CRITICAL_FORGE.EffectForge.SelectorGroups.Custom"),
      options: [{
        value: CUSTOM_SELECTOR_VALUE,
        label: localize("PF2E_CRITICAL_FORGE.EffectForge.SelectorLabels.Custom"),
        selected: !known
      }]
    });
  }

  return groups.map((group) => Object.freeze({
    ...group,
    options: Object.freeze(group.options.map((option) => Object.freeze({ ...option })))
  }));
}

export { CUSTOM_SELECTOR_VALUE };
