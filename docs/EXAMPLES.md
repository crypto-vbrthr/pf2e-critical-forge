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

## Persistent damage

```js
const bleedingWound = api.builders
  .effect()
  .setId("example.bleeding-wound")
  .setName("Blutende Wunde")
  .setDuration(-1, "unlimited", null)
  .addPersistentDamage({
    formula: "1d6",
    damageType: "bleed"
  })
  .build();
```

A custom recovery DC is optional:

```js
const acidBurn = api.builders
  .effect()
  .setName("Ätzende Verbrennung")
  .setDuration(10, "minutes", "turn-end")
  .addPersistentDamage({
    formula: "2d4",
    damageType: "acid",
    dc: 19
  })
  .build();
```

The first definition uses PF2e's normal recovery DC. The second adds a `pd-recovery-dc` alteration.


## Resistance

```js
const fireShield = api.builders
  .effect()
  .setId("example.fire-shield")
  .setName("Feuerschild")
  .setDuration(10, "minutes", "turn-end")
  .addResistance({
    resistanceType: "fire",
    value: 5
  })
  .build();
```

Broad resistance categories use the same component:

```js
const hardenedBody = api.builders
  .effect()
  .setName("Gehärteter Körper")
  .setDuration(1, "minutes", "turn-end")
  .addResistance({
    resistanceType: "physical",
    value: 3
  })
  .build();
```

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

## Weakness

```js
const fireWeakness = api.builders
  .effect()
  .setId("example.fire-weakness")
  .setName("Feuerempfindlich")
  .setDuration(10, "minutes", "turn-end")
  .addWeakness({ weaknessType: "fire", value: 5 })
  .build();
```


## Immunity

```js
const fireImmunity = api.builders
  .effect()
  .setId("example.fire-immunity")
  .setName("Flammenkörper")
  .setDuration(10, "minutes", "turn-end")
  .addImmunity({ immunityType: "fire" })
  .build();
```

A condition immunity uses the same component shape:

```js
.addImmunity({ immunityType: "frightened" })
```


## Fast healing

```js
const lifePulse = api.builders
  .effect()
  .setId("example.life-pulse")
  .setName("Lebenspuls")
  .setDuration(1, "minutes", "turn-end")
  .addFastHealing({ value: 4 })
  .build();
```

The resulting PF2e Rule Element is:

```json
{
  "key": "FastHealing",
  "value": 4
}
```


## Regeneration

```js
const trollBlood = api.builders
  .effect()
  .setId("example.troll-blood")
  .setName("Trollblut")
  .setDuration(1, "minutes", "turn-end")
  .addRegeneration({
    value: 5,
    deactivatedBy: ["acid", "fire"]
  })
  .build();
```

The resulting PF2e Rule Element is:

```json
{
  "key": "FastHealing",
  "value": 5,
  "type": "regeneration",
  "deactivatedBy": ["acid", "fire"]
}
```


## Temporary Hit Points

```js
const definition = api.builders
  .effect()
  .setId("example.protective-vitality")
  .setName("Protective Vitality")
  .setDuration(1, "minutes", "turn-end")
  .addTemporaryHitPoints({ value: 7 })
  .build();
```

Compiled rule:

```json
{
  "key": "TempHP",
  "value": 7
}
```
