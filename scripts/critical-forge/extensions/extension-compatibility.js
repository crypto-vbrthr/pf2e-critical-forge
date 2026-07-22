import {
  API_VERSION,
  CARD_PACK_SCHEMA_VERSION,
  CARD_SCHEMA_VERSION,
  EFFECT_SCHEMA_VERSION,
  MODULE_VERSION
} from "../../constants.js";
import { deepClone, deepFreeze, normalizeString, normalizeStringArray } from "../utils.js";

export const CRITICAL_EXTENSION_CONTRACT_VERSION = 1;

export const CRITICAL_EXTENSION_CAPABILITIES = Object.freeze([
  "cards.contextSnapshots",
  "cards.contextProviders",
  "cards.contextConditions",
  "cards.conditionEditor",
  "cards.diagnosticReports",
  "cards.diagnosticHistory",
  "cards.diagnosticSimulation",
  "cards.multiDeckPacks",
  "extensions.contracts",
  "extensions.conditionProviders",
  "extensions.diagnosticProviders",
  "extensions.registrationDiagnostics"
]);

export function currentExtensionEnvironment() {
  return deepFreeze({
    moduleVersion: MODULE_VERSION,
    apiVersion: API_VERSION,
    extensionContractVersion: CRITICAL_EXTENSION_CONTRACT_VERSION,
    effectSchemaVersion: EFFECT_SCHEMA_VERSION,
    cardSchemaVersion: CARD_SCHEMA_VERSION,
    cardPackSchemaVersion: CARD_PACK_SCHEMA_VERSION,
    capabilities: [...CRITICAL_EXTENSION_CAPABILITIES]
  });
}

export function checkExtensionCompatibility(requirements = {}, environment = currentExtensionEnvironment()) {
  const normalized = normalizeRequirements(requirements);
  const issues = [];

  compareRequirement("moduleVersion", normalized.moduleVersion, environment.moduleVersion, issues);
  compareRequirement("apiVersion", normalized.apiVersion, environment.apiVersion, issues);
  compareRequirement("extensionContractVersion", normalized.extensionContractVersion, environment.extensionContractVersion, issues);
  compareRequirement("effectSchemaVersion", normalized.effectSchemaVersion, environment.effectSchemaVersion, issues);
  compareRequirement("cardSchemaVersion", normalized.cardSchemaVersion, environment.cardSchemaVersion, issues);
  compareRequirement("cardPackSchemaVersion", normalized.cardPackSchemaVersion, environment.cardPackSchemaVersion, issues);

  const available = new Set(environment.capabilities ?? []);
  for (const capability of normalized.capabilities) {
    if (available.has(capability)) continue;
    issues.push(issue("error", "EXTENSION_CAPABILITY_MISSING", "capabilities", {
      required: capability,
      available: [...available]
    }));
  }

  const errors = issues.filter((entry) => entry.severity === "error");
  const warnings = issues.filter((entry) => entry.severity === "warning");
  return deepFreeze({
    compatible: errors.length === 0,
    requirements: normalized,
    available: deepClone(environment),
    issues,
    errors,
    warnings
  });
}

export function assertExtensionCompatibility(requirements = {}, environment = currentExtensionEnvironment()) {
  const report = checkExtensionCompatibility(requirements, environment);
  if (report.compatible) return report;
  const summary = report.errors
    .map((entry) => `${entry.code}: ${entry.data.required ?? entry.data.capability ?? "unmet"}`)
    .join(", ");
  const error = new Error(`Critical Forge extension requirements are not satisfied${summary ? ` (${summary})` : ""}.`);
  error.code = "EXTENSION_INCOMPATIBLE";
  error.compatibility = report;
  throw error;
}

export function satisfiesVersionRequirement(actual, requirement) {
  const expression = normalizeString(requirement);
  if (!expression || expression === "*") return true;
  const match = expression.match(/^(>=|<=|>|<|=|\^|~)?\s*([0-9]+(?:\.[0-9]+){0,2}(?:-[0-9A-Za-z.-]+)?)$/u);
  if (!match) throw new TypeError(`Unsupported Critical Forge version requirement: ${requirement}`);
  const [, operator = "=", expected] = match;
  const comparison = compareVersions(actual, expected);
  switch (operator) {
    case ">=": return comparison >= 0;
    case "<=": return comparison <= 0;
    case ">": return comparison > 0;
    case "<": return comparison < 0;
    case "^": return comparison >= 0 && sameCompatibleMajor(actual, expected);
    case "~": return comparison >= 0 && sameMajorMinor(actual, expected);
    default: return comparison === 0;
  }
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] > b.numbers[index] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return comparePrerelease(a.prerelease, b.prerelease);
}

function normalizeRequirements(requirements) {
  if (requirements == null) requirements = {};
  if (typeof requirements !== "object" || Array.isArray(requirements)) {
    throw new TypeError("Critical Forge extension requirements must be an object.");
  }
  return deepFreeze({
    moduleVersion: normalizeOptionalRequirement(requirements.moduleVersion ?? requirements.module),
    apiVersion: normalizeOptionalRequirement(requirements.apiVersion ?? requirements.api),
    extensionContractVersion: normalizeOptionalRequirement(requirements.extensionContractVersion ?? requirements.contract),
    effectSchemaVersion: normalizeOptionalRequirement(requirements.effectSchemaVersion ?? requirements.effectSchema),
    cardSchemaVersion: normalizeOptionalRequirement(requirements.cardSchemaVersion ?? requirements.cardSchema),
    cardPackSchemaVersion: normalizeOptionalRequirement(requirements.cardPackSchemaVersion ?? requirements.cardPackSchema),
    capabilities: normalizeStringArray(requirements.capabilities ?? [])
  });
}

function compareRequirement(field, requirement, actual, issues) {
  if (!requirement) return;
  let satisfied = false;
  try {
    satisfied = satisfiesVersionRequirement(String(actual), requirement);
  } catch (error) {
    issues.push(issue("error", "EXTENSION_REQUIREMENT_INVALID", field, {
      required: requirement,
      actual: String(actual),
      message: error.message
    }));
    return;
  }
  if (!satisfied) {
    issues.push(issue("error", "EXTENSION_VERSION_UNSUPPORTED", field, {
      required: requirement,
      actual: String(actual)
    }));
  }
}

function normalizeOptionalRequirement(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return `>=${value}`;
  return normalizeString(value);
}

function issue(severity, code, path, data) {
  return deepFreeze({ severity, code, path, data: deepClone(data) });
}

function parseVersion(value) {
  const normalized = normalizeString(value).replace(/^v/u, "");
  const match = normalized.match(/^([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?(?:-([0-9A-Za-z.-]+))?/u);
  if (!match) throw new TypeError(`Invalid version: ${value}`);
  return {
    numbers: [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)],
    prerelease: match[4] ?? ""
  };
}

function comparePrerelease(left, right) {
  const a = left.split(".");
  const b = right.split(".");
  const count = Math.max(a.length, b.length);
  for (let index = 0; index < count; index += 1) {
    if (a[index] == null) return -1;
    if (b[index] == null) return 1;
    const leftNumber = /^\d+$/u.test(a[index]) ? Number(a[index]) : null;
    const rightNumber = /^\d+$/u.test(b[index]) ? Number(b[index]) : null;
    if (leftNumber != null && rightNumber != null && leftNumber !== rightNumber) return leftNumber > rightNumber ? 1 : -1;
    if (leftNumber != null && rightNumber == null) return -1;
    if (leftNumber == null && rightNumber != null) return 1;
    const comparison = a[index].localeCompare(b[index]);
    if (comparison !== 0) return comparison > 0 ? 1 : -1;
  }
  return 0;
}

function sameCompatibleMajor(actual, expected) {
  const a = parseVersion(actual).numbers;
  const b = parseVersion(expected).numbers;
  if (b[0] > 0) return a[0] === b[0];
  if (b[1] > 0) return a[0] === 0 && a[1] === b[1];
  return a[0] === 0 && a[1] === 0 && a[2] === b[2];
}

function sameMajorMinor(actual, expected) {
  const a = parseVersion(actual).numbers;
  const b = parseVersion(expected).numbers;
  return a[0] === b[0] && a[1] === b[1];
}
