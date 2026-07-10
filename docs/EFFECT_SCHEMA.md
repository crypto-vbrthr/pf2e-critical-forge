# Effect Definition Schema

Current schema version: `1`.

```js
{
  schemaVersion: 1,
  id: "example.shaken-nerves",
  name: "Shaken Nerves",
  description: "The target is rattled and mentally vulnerable.",
  img: "icons/svg/terror.svg",

  duration: {
    value: 2,
    unit: "rounds",
    expiry: "turn-end"
  },

  components: [
    {
      type: "condition",
      slug: "frightened",
      value: 2
    },
    {
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "status"
    }
  ],

  application: {
    targetType: "actor",
    stacking: "replace",
    incompatibilityMode: "warn"
  },

  metadata: {
    originModule: "example-module",
    originFeature: "critical-hit",
    tags: ["mental", "critical"]
  }
}
```

## Required fields

- `schemaVersion`: currently `1`.
- `name`: non-empty string.
- `components`: array with at least one registered component.

## Duration

The global duration is inherited by every component.

Supported initial units:

- `rounds`
- `minutes`
- `hours`
- `days`
- `unlimited`

Components may later support `durationMode` values such as `inherit`, `override`, `independent`, or `instant`. These are reserved and not compiled in `0.1.0-dev`.

## Initial component types

### Condition

```js
{
  type: "condition",
  slug: "frightened",
  value: 2
}
```

`value` is optional because not every PF2e condition has a value.

### Modifier

```js
{
  type: "modifier",
  selector: "will",
  value: -1,
  modifierType: "status",
  predicate: []
}
```

Initial supported modifier types are `status`, `circumstance`, `item`, and `untyped`.
