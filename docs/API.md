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

### `api.effects.createItem(definition, options?)`

Reserved public method. It currently throws a localized `NotImplementedError`.

### `api.effects.apply(definition, targets, options?)`

Reserved public method. It currently throws a localized `NotImplementedError`.

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
