# Base Speed component

The `baseSpeed` component grants a movement mode the Actor does not already need to possess.
It is separate from the `movement` component, which only modifies an existing Speed.

## Effect Definition

```js
{
  type: "baseSpeed",
  movementType: "fly",
  value: 30
}
```

Supported movement modes are:

- `burrow`
- `climb`
- `fly`
- `swim`

Land Speed is deliberately excluded because PF2e Actors already have a land Speed and ordinary changes belong in the `movement` component.

## Builder

```js
const definition = api.builders
  .effect()
  .setName("Borrowed Wings")
  .setDuration(10, "minutes", "turn-end")
  .addBaseSpeed({
    movementType: "fly",
    value: 30
  })
  .build();
```

## PF2e output

```json
{
  "key": "BaseSpeed",
  "selector": "fly",
  "value": 30
}
```

The value must be a positive integer measured in feet. Values outside the usual 5-foot increment remain valid but produce a warning.

A granted movement mode can be modified by a separate `movement` component. For example, `baseSpeed` can grant a 30-foot fly Speed while a status bonus to `fly-speed` increases it.

## Public catalog

```js
api.baseSpeedTypes.list();
api.baseSpeedTypes.groups("fly");
api.baseSpeedTypes.get("swim");
api.baseSpeedTypes.has("land");     // false
api.baseSpeedTypes.selector("fly"); // "fly"
```
