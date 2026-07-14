# Fast Healing

The `fastHealing` component models PF2e fast healing with the native `FastHealing` Rule Element.

## Component shape

```js
{
  type: "fastHealing",
  value: 4
}
```

`value` must be a positive integer. It represents the Hit Points regained at the beginning of the affected creature's turn. The component uses the Effect Definition's global duration.

## Builder

```js
const definition = api.builders
  .effect()
  .setName("Lebenspuls")
  .setDuration(1, "minutes", "turn-end")
  .addFastHealing({ value: 4 })
  .build();
```

## Compiled Rule Element

```json
{
  "key": "FastHealing",
  "value": 4
}
```

PF2e processes fast healing at the beginning of the actor's turn. The Rule Element also provides the system's normal fast-healing reminder and automation.

## Validation

- `FAST_HEALING_VALUE_INVALID` blocks zero, negative, fractional, or non-numeric values.
- `FAST_HEALING_MULTIPLE_SOURCES` warns when one Effect Definition contains more than one fast-healing component. The definition remains valid so specialized content can choose its own interaction policy.

## Current scope

The built-in component intentionally uses a fixed positive integer. The underlying PF2e Rule Element also supports resolvable expressions, which may be added to a later schema version without weakening the current numeric contract.
