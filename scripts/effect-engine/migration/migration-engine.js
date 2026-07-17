import { EFFECT_SCHEMA_VERSION } from "../../constants.js";
import { migrateV0ToV1 } from "./migrations/v0-to-v1.js";
import { migrateV1ToV2 } from "./migrations/v1-to-v2.js";

const MIGRATIONS = new Map([
  [0, migrateV0ToV1],
  [1, migrateV1ToV2]
]);

function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export class EffectMigrationError extends Error {
  constructor(code, message, data = {}) {
    super(message);
    this.name = "EffectMigrationError";
    this.code = code;
    this.data = data;
  }
}

/**
 * Bring an Effect Definition up to the current schema version without mutating
 * the supplied object. Definitions without a schemaVersion are treated as
 * legacy schema version 0.
 */
export function migrateEffectDefinition(definition, {
  targetVersion = EFFECT_SCHEMA_VERSION
} = {}) {
  if (!isObject(definition)) {
    throw new EffectMigrationError(
      "MIGRATION_DEFINITION_OBJECT",
      "Effect migration requires an Effect Definition object."
    );
  }

  const initialVersion = definition.schemaVersion == null
    ? 0
    : Number(definition.schemaVersion);

  if (!Number.isInteger(initialVersion) || initialVersion < 0) {
    throw new EffectMigrationError(
      "MIGRATION_VERSION_INVALID",
      "The Effect Definition schema version is invalid.",
      { actual: definition.schemaVersion }
    );
  }

  if (initialVersion > targetVersion) {
    throw new EffectMigrationError(
      "MIGRATION_FUTURE_VERSION",
      "The Effect Definition was created with a newer schema version.",
      { actual: initialVersion, expected: targetVersion }
    );
  }

  let current = clone(definition);
  let version = initialVersion;
  const steps = [];
  const warnings = [];

  while (version < targetVersion) {
    const migration = MIGRATIONS.get(version);
    if (typeof migration !== "function") {
      throw new EffectMigrationError(
        "MIGRATION_PATH_MISSING",
        "No migration path is registered for this Effect Definition.",
        { fromVersion: version, toVersion: targetVersion }
      );
    }

    const result = migration(current) ?? {};
    current = clone(result.definition ?? result);
    const nextVersion = Number(current.schemaVersion);
    if (!Number.isInteger(nextVersion) || nextVersion <= version) {
      throw new EffectMigrationError(
        "MIGRATION_STEP_INVALID",
        "An Effect Definition migration did not advance the schema version.",
        { fromVersion: version }
      );
    }

    steps.push({
      fromVersion: version,
      toVersion: nextVersion,
      changes: clone(result.changes ?? [])
    });
    warnings.push(...clone(result.warnings ?? []));
    version = nextVersion;
  }

  return Object.freeze({
    definition: globalThis.foundry?.utils?.deepFreeze
      ? globalThis.foundry.utils.deepFreeze(current)
      : Object.freeze(current),
    fromVersion: initialVersion,
    toVersion: version,
    migrated: initialVersion !== version,
    steps: Object.freeze(steps.map((step) => Object.freeze(step))),
    warnings: Object.freeze(warnings)
  });
}
