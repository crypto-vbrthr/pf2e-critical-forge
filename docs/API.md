# Effect Engine API

## Obtaining the API

```js
const api = game.modules.get("pf2e-critical-forge")?.api;
```

The API is published during Foundry's `init` hook and remains available regardless of the Effect Forge and Critical Forge settings.

For module integrations, prefer the ready hook:

```js
Hooks.on("pf2eCriticalForgeReady", (api) => {
  console.log(api.version, api.schemaVersion);
});
```

## Version information

```js
api.version        // public API version
api.moduleVersion  // installed module version
api.schemaVersion  // supported Effect Definition schema version
```

Consumers should branch on `api.version` for API capabilities and on `api.schemaVersion` when importing stored Effect Definitions.

## Effects

### `api.effects.analyze(definition, context?)`

Runs the structured Validation Engine without compiling or mutating the definition.

```js
const report = api.effects.analyze(definition, {
  target: actor
});
```

Return shape:

```js
{
  valid: true,
  issues: [],
  errors: [],
  warnings: [],
  hints: [],
  information: []
}
```

Each issue contains:

```js
{
  severity: "error" | "warning" | "hint" | "info",
  code: "STABLE_MACHINE_CODE",
  messageKey: "Validation.Rules.SomeMessage",
  message: null,
  data: {},
  componentIndex: 0
}
```

Use `code` for program logic. `messageKey` and localized messages are presentation details.

### `api.effects.validate(definition)`

Compatibility wrapper around the structured analyzer. It returns localized string arrays while retaining the structured `issues` array.

```js
const validation = api.effects.validate(definition);

if (!validation.valid) {
  ui.notifications.error(validation.errors.join("\n"));
}
```

The supplied definition is never mutated.

### `api.effects.compile(definition, context?)`

Validates and compiles the definition into an abstract representation.

```js
const compiled = await api.effects.compile(definition);
```

Important fields:

```js
{
  schemaVersion: 1,
  id: "example.effect",
  name: "Example Effect",
  duration: { value: 2, unit: "rounds", expiry: "turn-end" },
  components: [
    {
      kind: "condition",
      rules: [{ key: "GrantItem", uuid: "..." }]
    }
  ],
  validation: { valid: true, ... }
}
```

Compilation is asynchronous because condition UUIDs and metadata may need to be resolved from the PF2e condition compendium.

Invalid definitions reject with `EffectValidationError`. The complete validation result is available as `error.result`.

```js
try {
  await api.effects.compile(definition);
} catch (error) {
  console.error(error.result);
}
```

### `api.effects.toItemSource(definition, context?)`

Compiles an Effect Definition into PF2e Effect Item source data without creating a Foundry document.

```js
const source = await api.effects.toItemSource(definition);
```

The returned source contains:

- `type: "effect"`;
- PF2e duration data;
- collected Rule Elements in `system.rules`;
- origin and definition metadata in `flags.pf2e-critical-forge`.

### `api.effects.createItem(definition, options?)`

Creates a world-level PF2e Effect Item.

```js
const item = await api.effects.createItem(definition, {
  renderSheet: true
});
```

### `api.effects.apply(definition, targets, options?)`

Creates the compiled Effect Item as an embedded Item on one or more Actor or Token targets.

```js
await api.effects.apply(definition, [actorA, tokenB]);
```

Targets may be supplied as Actors, Tokens, TokenDocuments, or arrays supported by the application service.

### `api.effects.remove(definitionId, targets)`

Removes generated effects whose module flag contains the supplied Effect Definition ID.

```js
await api.effects.remove("example.shaken-nerves", [actor]);
```

### `api.effects.checkCompatibility(definition, target, options?)`

Performs structural and target-aware compatibility checks. Target-specific PF2e immunity and resistance analysis is an extension point and is intentionally still limited in the current milestone.

## Effect Builder

The Builder is the supported construction path for new definitions.

### `api.builders.effect()`

```js
const definition = api.builders
  .effect()
  .setId("example.shaken-nerves")
  .setName("Erschütterte Nerven")
  .setDescription("<p>Das Ziel ist verängstigt und mental verwundbar.</p>")
  .setImage("icons/svg/terror.svg")
  .setDuration(2, "rounds", "turn-end")
  .addCondition("frightened", 2)
  .addModifier({
    selector: "will",
    value: -1,
    modifierType: "circumstance"
  })
  .setMetadata({
    originModule: "example-module",
    originFeature: "critical-hit"
  })
  .build();
```

`build()` returns a cloned and deeply frozen definition.

### `api.builders.from(definition)`

Creates a Builder from a deep clone of an existing definition.

```js
const longer = api.builders
  .from(definition)
  .setDuration(3, "rounds", "turn-end")
  .build();
```

The original object is not mutated.

### Builder methods

| Method | Purpose |
|---|---|
| `setId(id)` | Sets a stable definition ID or `null`. |
| `setName(name)` | Sets and trims the display name. |
| `setDescription(html)` | Stores description HTML. |
| `setImage(path)` | Sets an image, falling back to `icons/svg/aura.svg`. |
| `setDuration(value, unit, expiry)` | Sets the global duration. |
| `setApplication(data)` | Replaces application metadata with a clone. |
| `setMetadata(data)` | Replaces metadata with a clone. |
| `mergeMetadata(data)` | Deep-merges metadata without mutating the source. |
| `addComponent(component)` | Adds an arbitrary registered component. |
| `addCondition(slug, value?)` | Adds a PF2e condition component. |
| `addModifier(options)` | Adds a modifier component. |
| `addPersistentDamage(options)` | Adds persistent damage with `formula`, `damageType`, and optional `dc`. |
| `clearComponents()` | Removes all components. |
| `removeComponent(index)` | Removes one component or throws `RangeError`. |
| `build()` | Returns the immutable Effect Definition. |

Persistent-damage example:

```js
const bleeding = api.builders
  .effect()
  .setName("Bleeding Wound")
  .setDuration(-1, "unlimited", null)
  .addPersistentDamage({
    formula: "1d6",
    damageType: "bleed",
    dc: 17
  })
  .addResistance({
    resistanceType: "fire",
    value: 5
  })
  .build();
```

## Selector catalog

```js
api.selectors.list();
api.selectors.groups("will");
api.selectors.get("athletics");
api.selectors.has("saving-throw");
api.selectors.isValidSyntax("my-module-special-check");
api.selectors.customValue;
```

The catalog is shared by the GUI, validator, and public API. See [`SELECTORS.md`](SELECTORS.md).

## Condition catalog

```js
await api.conditions.initialize();

api.conditions.isValued("frightened"); // true
api.conditions.isValued("prone");      // false
api.conditions.get("frightened");
api.conditions.list();
```

The PF2e condition compendium is the primary metadata source. A fallback valued-condition set keeps Builder and validation behavior available before compendia finish loading.

The compiler emits a `badge-value` alteration only when the resolved condition is valued.

## Damage-type catalog

```js
api.damageTypes.list();
api.damageTypes.groups("bleed");
api.damageTypes.get("fire");
api.damageTypes.has("spirit");
```

The catalog combines `CONFIG.PF2E.damageTypes` with standard fallback metadata. The GUI and persistent-damage validator consume the same catalog. See [`DAMAGE_TYPES.md`](DAMAGE_TYPES.md).


## Resistance-type catalog

```js
api.resistanceTypes.list();
api.resistanceTypes.groups("fire");
api.resistanceTypes.get("physical");
api.resistanceTypes.has("all-damage");
```

The catalog reads `CONFIG.PF2E.resistanceTypes` and supplements it with stable fallbacks for standard damage types, broad damage categories, and common damage sources. GUI options are grouped to keep the list navigable. See [`RESISTANCE_TYPES.md`](RESISTANCE_TYPES.md).

## Component extension API

### `api.components.register(handler, options?)`

Required handler shape:

```js
{
  type: "my-module.special-component",

  validate(component, context) {
    return {
      errors: [],
      warnings: []
    };
  },

  async compile(component, context) {
    return {
      kind: "my-module.special-component",
      rules: []
    };
  },

  describe(component, context) {
    return "Readable summary";
  }
}
```

Rules:

- `type` must be a non-empty unique string.
- Third-party types should be namespaced.
- `validate`, `compile`, and `describe` are required functions.
- `compile` may be asynchronous.
- Compiled Rule Elements belong in a `rules` array.
- Register during `pf2eCriticalForgeReady` unless early registration is specifically required.

```js
Hooks.on("pf2eCriticalForgeReady", (api) => {
  api.components.register(handler);
});
```

Other methods:

```js
api.components.get(type);
api.components.list();
api.components.unregister(type);
```

## User interface

```js
api.ui.openEffectForge();
```

This opens the GM-only Effect Forge window independently of sidebar integration.

## Weakness catalog and Builder method

```js
const definition = api.builders
  .effect()
  .setName("Feuerempfindlich")
  .setDuration(10, "minutes", "turn-end")
  .addWeakness({ weaknessType: "fire", value: 5 })
  .build();

api.weaknessTypes.list();
api.weaknessTypes.groups("fire");
api.weaknessTypes.get("physical");
api.weaknessTypes.has("splash-damage");
```
