# Movement component

The `movement` component adds a typed PF2e modifier to one or more existing Speeds.

```js
{
  type: "movement",
  movementType: "land",
  value: 10,
  modifierType: "status"
}
```

## Movement types

| Value | PF2e selector |
|---|---|
| `all` | `all-speeds` |
| `land` | `land-speed` |
| `burrow` | `burrow-speed` |
| `climb` | `climb-speed` |
| `fly` | `fly-speed` |
| `swim` | `swim-speed` |

The catalog is exposed through `api.movementTypes`.

## Values and modifier types

`value` is a non-zero integer measured in feet. Positive values increase a Speed and negative values reduce it. Values in 5-foot increments are conventional; other integer values remain valid but produce `MOVEMENT_VALUE_UNUSUAL_INCREMENT`.

`modifierType` accepts the same built-in types as the general modifier component:

- `status`
- `circumstance`
- `item`
- `untyped`

The compiler emits a native PF2e `FlatModifier`:

```js
{
  key: "FlatModifier",
  selector: "land-speed",
  value: 10,
  type: "status"
}
```

## Existing Speeds only

A movement modifier changes a Speed that the Actor already possesses. It does not grant a missing fly, swim, climb, or burrow Speed. Granting a new movement mode belongs to a separate future `BaseSpeed` component.

## Stacking

When two movement components overlap and use the same modifier type, the Validation Engine reports `MOVEMENT_MODIFIER_OVERLAP`. This also covers an `all` component overlapping with a specific movement mode.
