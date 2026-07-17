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
