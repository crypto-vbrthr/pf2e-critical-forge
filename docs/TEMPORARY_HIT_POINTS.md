# Temporary Hit Points

The `temporaryHitPoints` component grants a fixed number of temporary Hit Points through PF2e's native `TempHP` Rule Element.

## Effect Definition

```js
{
  type: "temporaryHitPoints",
  value: 5
}
```

`value` must be a positive integer.

## Builder

```js
const definition = api.builders
  .effect()
  .setName("Protective Vitality")
  .setDuration(1, "minutes", "turn-end")
  .addTemporaryHitPoints({ value: 5 })
  .build();
```

## Compiled Rule Element

```json
{
  "key": "TempHP",
  "value": 5
}
```

PF2e applies the temporary Hit Points when the Effect Item is added to an actor. The built-in component intentionally models a one-time grant and does not request a refresh at the start of each turn.

Temporary Hit Points normally do not stack. Multiple components remain compilable, but the Validation Engine emits `TEMPORARY_HIT_POINTS_MULTIPLE_SOURCES`.
