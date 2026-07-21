# Effect Definition Migrations

The public Effect Definition schema is versioned independently from the module and API.

```js
const result = api.effects.migrate(definition);
```

The migration service:

- never mutates caller-owned data;
- applies sequential migrations until the current schema is reached;
- returns a structured report with steps and warnings;
- rejects future schema versions and missing migration paths;
- runs automatically when JSON is imported or a stored Item definition is opened.

## Current migration path

The current schema is version `2`.

### Schema `0 → 1`

Definitions without `schemaVersion` are treated as legacy schema `0`. Supported prototype aliases include:

- `image` → `img`;
- `effects` → `components`;
- numeric duration → round-based duration object;
- `persistent-damage` → `persistentDamage`;
- `damageFormula` → `formula`;
- `damage_type` → `damageType`;
- `condition` → `slug` on condition components;
- `bonusType` → `modifierType` on modifier components.

### Schema `1 → 2`

Schema `2` permits optional component-level duration overrides. Existing schema-1 definitions already express the correct inheritance behavior because their components have no duration field. Migration therefore:

- advances `schemaVersion` to `2`;
- removes a legacy `duration: null` marker from components;
- preserves any explicit duration object found in long-lived prototype data;
- leaves the global duration and all component mechanics unchanged.

Loaded legacy data is migrated only in memory. The original Foundry Item is not changed until the user chooses **Update Item**.

## Result shape

```js
{
  definition: { schemaVersion: 2, ... },
  fromVersion: 0,
  toVersion: 2,
  migrated: true,
  steps: [
    {
      fromVersion: 0,
      toVersion: 1,
      changes: ["image-alias", "components-alias"]
    },
    {
      fromVersion: 1,
      toVersion: 2,
      changes: []
    }
  ],
  warnings: []
}
```

Integrations should call `api.effects.migrate()` before validating long-lived stored definitions.

## Critical Forge 0.9.4-dev.5

No migration runs. `deckType` and `pack.decks` are optional authoring fields within Critical Card and Card Pack schema version `1`. Cards without `deckType` normalize to `default`; historical packs with only a root `cards` array become one default deck in memory. Original source objects are not rewritten. Diagnostics report schema remains `1`, preview schema remains `4`, Effect Definition schema remains `2`, and public API version remains `0.9.4`.

## Critical Forge 0.9.4-dev.4

No migration runs. Diagnostics 2.0 introduces report schema version `1`, which is session-only and independent of Critical Card schema `1`, Card Pack schema `1`, preview schema `4`, and Effect Definition schema `2`. Existing packs and extension modules continue to load unchanged.

## Critical Forge 0.9.4-dev.3.1

No schema migration is required. The visual condition editor reads and writes the existing optional schema-version-1 `conditions` tree introduced in Phase 2. It may add optional `valueType` metadata only to provider-defined custom field leaves; Phase-2 runtimes do not require this metadata and may discard it when normalizing and resaving a pack; extensions that depend on preserving a unary custom-field type should capability-check `conditionEditor`. The Phase-3 normalizer preserves and validates it. Cards without conditions remain `conditions: null`; opening, testing, or saving a pack does not synthesize conditions unless the author explicitly enables them. Public API version `0.9.4` adds `api.cards.conditions.editor` and the `conditionEditor` capability flag.
