# Regeneration

The `regeneration` component models PF2e regeneration through the native `FastHealing` Rule Element with `type: "regeneration"`.

## Definition shape

```js
{
  type: "regeneration",
  value: 5,
  deactivatedBy: ["acid", "fire"]
}
```

- `value` must be a positive integer.
- `deactivatedBy` must contain at least one known PF2e damage type.
- Duplicate entries are removed by the Builder and reported when raw Effect Definitions contain them.

## Builder

```js
const definition = api.builders
  .effect()
  .setName("Trollblut")
  .setDuration(1, "minutes", "turn-end")
  .addRegeneration({
    value: 5,
    deactivatedBy: ["acid", "fire"]
  })
  .build();
```

## PF2e Rule Element

```json
{
  "key": "FastHealing",
  "value": 5,
  "type": "regeneration",
  "deactivatedBy": ["acid", "fire"]
}
```

PF2e uses the listed damage types to deactivate regeneration according to the system's regeneration automation and reminders. The Effect Definition's global duration still controls how long the source effect remains on the actor.

## Validation codes

- `REGENERATION_VALUE_INVALID`
- `REGENERATION_DEACTIVATION_REQUIRED`
- `REGENERATION_DEACTIVATION_TYPE_INVALID`
- `REGENERATION_DEACTIVATION_DUPLICATE`
- `REGENERATION_MULTIPLE_SOURCES`
