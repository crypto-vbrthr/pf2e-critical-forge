# Examples

## Build, analyze, compile, and apply an effect

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

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
  .build();

const report = api.effects.analyze(definition);
console.log(report);

if (report.valid) {
  const source = await api.effects.toItemSource(definition);
  console.log(source);

  await api.effects.apply(definition, canvas.tokens.controlled);
}
```

## Non-valued condition

Do not supply a numeric value for a binary condition:

```js
const prone = api.builders
  .effect()
  .setId("example.prone")
  .setName("Zu Boden")
  .setDuration(1, "rounds", "turn-end")
  .addCondition("prone")
  .build();
```

The compiled `GrantItem` rule contains no `badge-value` alteration.

## Multiple selectors

```js
const alert = api.builders
  .effect()
  .setName("Geschärfte Sinne")
  .setDuration(10, "minutes", "turn-end")
  .addModifier({
    selector: ["perception", "initiative"],
    value: 1,
    modifierType: "status"
  })
  .build();
```

## Clone and modify a definition

```js
const stronger = api.builders
  .from(definition)
  .setId("example.shaken-nerves.greater")
  .setName("Schwer erschütterte Nerven")
  .setDuration(3, "rounds", "turn-end")
  .build();
```

The original definition remains unchanged.

## React to validation codes

```js
const report = api.effects.analyze(definition);

if (report.issues.some((issue) => issue.code === "STACKING_FRIGHTENED_STATUS")) {
  ui.notifications.warn(
    "The separate status penalty will usually not stack with frightened."
  );
}
```

## Create a world Item

```js
const item = await api.effects.createItem(definition, {
  renderSheet: true
});
```

## Remove generated effects by definition ID

```js
await api.effects.remove(
  "example.shaken-nerves",
  canvas.tokens.controlled
);
```

## Register a custom component

```js
Hooks.on("pf2eCriticalForgeReady", (api) => {
  api.components.register({
    type: "my-module.marker",

    validate(component) {
      return component.key
        ? { errors: [], warnings: [] }
        : { errors: ["A key is required."], warnings: [] };
    },

    async compile(component) {
      return {
        kind: "my-module.marker",
        key: component.key,
        rules: []
      };
    },

    describe(component) {
      return `Marker: ${component.key}`;
    }
  });
});
```

Then use it in a definition:

```js
const custom = api.builders
  .effect()
  .setName("Marked")
  .addComponent({
    type: "my-module.marker",
    key: "marked"
  })
  .build();
```
