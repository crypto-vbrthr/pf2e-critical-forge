# Effect Engine API

## Obtaining the API

```js
const api = game.modules.get("pf2e-critical-forge")?.api;
```

The API is available regardless of whether the Effect Forge UI or Critical Forge is enabled.

## Version information

```js
api.version       // module API version
api.schemaVersion // supported Effect Definition schema
```

## Effects

### `api.effects.analyze(definition, context?)`

Runs the structured Validation Engine and returns stable issue codes, severities, localization keys, and data. An optional `context.target` prepares target-aware checks.

### `api.effects.validate(definition)`

Validates an Effect Definition.

Returns:

```js
{
  valid: true,
  errors: [],
  warnings: []
}
```

Validation does not mutate the supplied object.

### `api.effects.compile(definition, context?)`

Validates and compiles the definition into an abstract compiled representation.

In `0.1.0-dev`, this does not yet create a PF2e Item.

### `api.effects.toItemSource(definition, context?)`

Compiles an Effect Definition into PF2e Effect Item source data without creating a document.

### `api.effects.createItem(definition, options?)`

Creates a world-level PF2e Effect Item. `options.renderSheet` defaults to `true`.

### `api.effects.apply(definition, targets, options?)`

Creates the compiled Effect Item as an embedded Item on one or more Actor or Token targets.

### `api.effects.remove(definitionId, targets)`

Removes effects generated from the supplied Effect Definition ID from the target Actors.

### `api.effects.checkCompatibility(definition, target, options?)`

Performs structural compatibility checks. The initial implementation reports whether a target exists and whether the definition validates.

## Components

### `api.components.register(handler)`

Registers a component handler.

Required handler shape:

```js
{
  type: "example",
  validate(component, context) {},
  compile(component, context) {},
  describe(component, context) {}
}
```

Third-party component types should use a namespaced type such as:

```text
my-module.special-component
```

### `api.components.get(type)`
### `api.components.list()`
### `api.components.unregister(type)`

## Hooks

After initialization, the module emits:

```js
Hooks.callAll("pf2eCriticalForgeReady", api);
```

External modules should register their components or future card packs from this hook.

## User interface

### `api.ui.openEffectForge()`

Opens the GM-only Effect Forge window, independent of sidebar integration.

```js
game.modules.get("pf2e-critical-forge")?.api.ui.openEffectForge();
```

## Effect Builder

The public Builder API creates consistent Effect Definitions without exposing their internal structure.

### `api.builders.effect()`

Creates a new fluent Effect Builder.

```js
const definition = api.builders
  .effect()
  .setId("example.shaken-nerves")
  .setName("Shaken Nerves")
  .setDescription("<p>The target is rattled.</p>")
  .setImage("icons/svg/terror.svg")
  .setDuration(2, "rounds", "turn-end")
  .addCondition("frightened", 2)
  .addModifier({
    selector: "will",
    value: -1,
    modifierType: "status"
  })
  .setMetadata({ originModule: "example-module" })
  .build();
```

### `api.builders.from(definition)`

Creates a Builder from an existing Effect Definition. The source object is cloned and never mutated.

```js
const stronger = api.builders
  .from(definition)
  .setDuration(3, "rounds", "turn-end")
  .build();
```

### Builder methods

- `setId(id)`
- `setName(name)`
- `setDescription(html)`
- `setImage(path)`
- `setDuration(value, unit, expiry)`
- `setApplication(data)`
- `setMetadata(data)`
- `mergeMetadata(data)`
- `addComponent(component)`
- `addCondition(slug, value?)`
- `addModifier(options)`
- `clearComponents()`
- `removeComponent(index)`
- `build()`

`build()` returns a cloned and deeply frozen Effect Definition.
