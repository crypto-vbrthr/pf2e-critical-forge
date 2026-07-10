# Examples

## Validate a composite effect

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

const definition = {
  schemaVersion: 1,
  id: "example.shaken-nerves",
  name: "Shaken Nerves",
  duration: { value: 2, unit: "rounds", expiry: "turn-end" },
  components: [
    { type: "condition", slug: "frightened", value: 2 },
    {
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "status"
    }
  ]
};

console.log(api.effects.validate(definition));
console.log(await api.effects.compile(definition));
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

    compile(component) {
      return {
        kind: "marker",
        key: component.key
      };
    },

    describe(component) {
      return `Marker: ${component.key}`;
    }
  });
});
```
