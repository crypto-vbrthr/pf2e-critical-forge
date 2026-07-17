function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

/** Schema 2 adds optional component-level duration overrides. Existing schema
 * 1 definitions already have the correct inheritance behavior and therefore
 * only need their version marker advanced. */
export function migrateV1ToV2(definition) {
  const source = clone(definition);
  const changes = [];

  for (const component of source.components ?? []) {
    if (component?.duration === null) {
      delete component.duration;
      changes.push("remove-null-component-duration");
    }
  }

  source.schemaVersion = 2;
  return {
    definition: source,
    changes: [...new Set(changes)],
    warnings: []
  };
}
