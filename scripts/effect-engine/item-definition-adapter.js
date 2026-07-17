import { EFFECT_SCHEMA_VERSION, MODULE_ID } from "../constants.js";
import { migrateEffectDefinition } from "./migration/migration-engine.js";
import {
  initializeConditionCatalog,
  listConditionDefinitions
} from "./catalogs/condition-catalog.js";
import {
  listBaseSpeedTypeDefinitions,
  listMovementTypeDefinitions
} from "./catalogs/movement-type-catalog.js";

const GUI_COMPONENT_TYPES = new Set([
  "condition",
  "modifier",
  "persistentDamage",
  "resistance",
  "weakness",
  "immunity",
  "fastHealing",
  "regeneration",
  "temporaryHitPoints",
  "movement",
  "baseSpeed"
]);

function isGuiEditableStoredComponent(component) {
  if (!component || typeof component !== "object" || !GUI_COMPONENT_TYPES.has(component.type)) {
    return false;
  }

  if (component.type === "modifier") {
    if (Array.isArray(component.selector) || typeof component.selector !== "string") return false;
    if (component.label) return false;
    if (Array.isArray(component.predicate) && component.predicate.length > 0) return false;
    if (component.predicate !== undefined && !Array.isArray(component.predicate)) return false;
  }

  return true;
}

function normalizeStoredComponent(component) {
  const normalized = clone(component);
  if (normalized.type === "modifier" && Array.isArray(normalized.predicate) && normalized.predicate.length === 0) {
    delete normalized.predicate;
  }
  return normalized;
}

function clone(value) {
  return foundry.utils.deepClone(value);
}

function readItemSource(item) {
  if (!item || typeof item !== "object") {
    throw new TypeError("An Item document or Item source object is required.");
  }

  const source = typeof item.toObject === "function" ? item.toObject() : clone(item);
  if (source.type !== "effect") {
    throw new TypeError(`Only PF2e effect Items can be opened in Effect Forge (received: ${source.type ?? "unknown"}).`);
  }
  return source;
}

function stripHtml(value) {
  const html = String(value ?? "");
  if (!html) return "";

  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n");
    return String(container.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
  }

  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDuration(duration) {
  const value = Number(duration?.value ?? -1);
  const unit = String(duration?.unit ?? "unlimited");

  if (value === -1 || unit === "unlimited") {
    return { value: -1, unit: "unlimited", expiry: null };
  }

  return {
    value: Number.isFinite(value) ? value : 0,
    unit,
    expiry: duration?.expiry ?? "turn-end"
  };
}

function hasOnlyKeys(rule, allowed) {
  return Object.keys(rule ?? {}).every((key) => allowed.has(key));
}

function getAlteration(rule, property) {
  return Array.isArray(rule?.alterations)
    ? rule.alterations.find((entry) => entry?.property === property)
    : null;
}

function finiteNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value) {
  const number = finiteNumber(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function resolveConditionSlug(uuid) {
  const normalized = String(uuid ?? "").trim();
  if (!normalized) return null;

  await initializeConditionCatalog();
  const catalogMatch = listConditionDefinitions().find((entry) => entry.uuid === normalized);
  if (catalogMatch) return catalogMatch.slug;

  if (typeof globalThis.fromUuid === "function") {
    try {
      const document = await globalThis.fromUuid(normalized);
      return document?.system?.slug ?? document?.slug ?? null;
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not resolve granted condition ${normalized}.`, error);
    }
  }

  return null;
}

function parseFlatModifier(rule) {
  if (!hasOnlyKeys(rule, new Set(["key", "selector", "value", "type"]))) return null;
  if (Array.isArray(rule.selector)) return null;

  const selector = String(rule.selector ?? "").trim();
  const value = finiteNumber(rule.value);
  if (!selector || value === null) return null;

  const movement = listMovementTypeDefinitions().find((entry) => entry.selector === selector);
  if (movement) {
    return {
      type: "movement",
      movementType: movement.value,
      value,
      modifierType: String(rule.type ?? "untyped")
    };
  }

  return {
    type: "modifier",
    selector,
    value,
    modifierType: String(rule.type ?? "untyped")
  };
}

function parseBaseSpeed(rule) {
  if (!hasOnlyKeys(rule, new Set(["key", "selector", "value"]))) return null;
  const definition = listBaseSpeedTypeDefinitions().find(
    (entry) => entry.baseSpeedSelector === String(rule.selector ?? "").trim()
  );
  const value = positiveInteger(rule.value);
  if (!definition || value === null) return null;

  return {
    type: "baseSpeed",
    movementType: definition.value,
    value
  };
}

async function parseGrantItem(rule) {
  const persistent = getAlteration(rule, "persistent-damage");
  if (persistent?.value && typeof persistent.value === "object") {
    const formula = String(persistent.value.formula ?? "").trim();
    const damageType = String(persistent.value.damageType ?? "").trim();
    const recovery = getAlteration(rule, "pd-recovery-dc");
    const dc = recovery?.value === undefined ? undefined : positiveInteger(recovery.value);
    if (!formula || !damageType || (recovery && dc === null)) return null;

    return {
      type: "persistentDamage",
      formula,
      damageType,
      dc
    };
  }

  const slug = await resolveConditionSlug(rule.uuid);
  if (!slug) return null;

  const badge = getAlteration(rule, "badge-value");
  const value = badge?.value === undefined ? undefined : finiteNumber(badge.value);
  if (badge && (!Number.isInteger(value) || value < 0)) return null;

  return {
    type: "condition",
    slug,
    value
  };
}

async function parseRule(rule) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return null;

  switch (rule.key) {
    case "GrantItem":
      return parseGrantItem(rule);
    case "FlatModifier":
      return parseFlatModifier(rule);
    case "Resistance": {
      const value = positiveInteger(rule.value);
      const type = String(rule.type ?? "").trim();
      return hasOnlyKeys(rule, new Set(["key", "type", "value"])) && type && value !== null
        ? { type: "resistance", resistanceType: type, value }
        : null;
    }
    case "Weakness": {
      const value = positiveInteger(rule.value);
      const type = String(rule.type ?? "").trim();
      return hasOnlyKeys(rule, new Set(["key", "type", "value"])) && type && value !== null
        ? { type: "weakness", weaknessType: type, value }
        : null;
    }
    case "Immunity": {
      const type = String(rule.type ?? "").trim();
      return hasOnlyKeys(rule, new Set(["key", "type"])) && type
        ? { type: "immunity", immunityType: type }
        : null;
    }
    case "FastHealing": {
      if (rule.type === "regeneration") {
        const value = positiveInteger(rule.value);
        const deactivatedBy = Array.isArray(rule.deactivatedBy)
          ? rule.deactivatedBy.map((entry) => String(entry).trim()).filter(Boolean)
          : [];
        return hasOnlyKeys(rule, new Set(["key", "value", "type", "deactivatedBy"]))
          && value !== null
          && deactivatedBy.length > 0
          ? { type: "regeneration", value, deactivatedBy }
          : null;
      }
      const value = positiveInteger(rule.value);
      return hasOnlyKeys(rule, new Set(["key", "value"])) && value !== null
        ? { type: "fastHealing", value }
        : null;
    }
    case "TempHP": {
      const value = positiveInteger(rule.value);
      return hasOnlyKeys(rule, new Set(["key", "value"])) && value !== null
        ? { type: "temporaryHitPoints", value }
        : null;
    }
    case "BaseSpeed":
      return parseBaseSpeed(rule);
    default:
      return null;
  }
}

export async function parseEffectItemRules(rules = []) {
  const components = [];
  const unmanagedRules = [];

  for (const rule of Array.isArray(rules) ? rules : []) {
    const component = await parseRule(rule);
    if (component) components.push(component);
    else unmanagedRules.push(clone(rule));
  }

  return { components, unmanagedRules };
}

/**
 * Convert an existing PF2e effect Item into an editable Effect Definition.
 * Unsupported Rule Elements are returned separately so an update can preserve
 * them byte-for-byte instead of silently deleting them.
 */
export async function extractEffectDefinitionFromItem(item) {
  const source = readItemSource(item);
  const moduleFlags = source.flags?.[MODULE_ID] ?? {};
  const storedRaw = moduleFlags.definition && typeof moduleFlags.definition === "object"
    ? clone(moduleFlags.definition)
    : null;
  const storedMigration = storedRaw ? migrateEffectDefinition(storedRaw) : null;
  const stored = storedMigration?.definition ?? null;
  const parsed = await parseEffectItemRules(source.system?.rules ?? []);

  const storedComponents = Array.isArray(stored?.components) ? stored.components : null;
  const canUseStoredComponents = Array.isArray(storedComponents)
    && storedComponents.every(isGuiEditableStoredComponent);
  const components = canUseStoredComponents
    ? storedComponents.map(normalizeStoredComponent)
    : parsed.components;

  const metadata = {
    ...(stored?.metadata ?? {}),
    originModule: moduleFlags.originModule ?? stored?.metadata?.originModule ?? MODULE_ID,
    originFeature: moduleFlags.originFeature ?? stored?.metadata?.originFeature ?? "effect-forge-ui"
  };

  const definition = {
    schemaVersion: EFFECT_SCHEMA_VERSION,
    id: stored?.id ?? moduleFlags.definitionId ?? `item.${source._id ?? source.id ?? "effect"}`,
    name: String(stored?.name ?? source.name ?? ""),
    description: stripHtml(stored?.description ?? source.system?.description?.value ?? ""),
    img: String(stored?.img ?? source.img ?? "icons/svg/aura.svg"),
    duration: normalizeDuration(stored?.duration ?? source.system?.duration),
    components,
    application: clone(stored?.application ?? {}),
    metadata
  };

  const storedUnmanaged = Array.isArray(moduleFlags.unmanagedRules)
    ? clone(moduleFlags.unmanagedRules)
    : [];
  const unmanagedRules = parsed.unmanagedRules.length > 0
    ? parsed.unmanagedRules
    : storedUnmanaged;

  return {
    definition: foundry.utils.deepFreeze(definition),
    unmanagedRules: foundry.utils.deepFreeze(unmanagedRules),
    sourceItemId: source._id ?? source.id ?? null,
    sourceItemUuid: item.uuid ?? source.uuid ?? null,
    source: canUseStoredComponents ? "stored-definition" : "rules",
    migration: storedMigration
      ? {
          fromVersion: storedMigration.fromVersion,
          toVersion: storedMigration.toVersion,
          migrated: storedMigration.migrated,
          steps: clone(storedMigration.steps),
          warnings: clone(storedMigration.warnings)
        }
      : null,
    warnings: [
      ...(unmanagedRules.length > 0
        ? [{ code: "ITEM_UNMANAGED_RULES_PRESERVED", count: unmanagedRules.length }]
        : []),
      ...(storedMigration?.migrated
        ? [{
            code: "ITEM_DEFINITION_MIGRATED",
            fromVersion: storedMigration.fromVersion,
            toVersion: storedMigration.toVersion
          }]
        : [])
    ]
  };
}
