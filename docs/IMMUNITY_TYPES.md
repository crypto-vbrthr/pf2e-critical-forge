# Immunity Type Catalog

The immunity component uses a central catalog backed by `CONFIG.PF2E.immunityTypes`.
Unlike resistance and weakness, immunity has no numeric value. PF2e immunities may refer to damage types, conditions, effects, traits, or other supported system categories.

## Public API

```js
const catalog = game.modules.get("pf2e-critical-forge")?.api.immunityTypes;

catalog.list();
catalog.groups("frightened");
catalog.get("fire");
catalog.has("emotion");
```

## Groups

The Effect Forge divides the usually long immunity list into compact groups:

- damage types;
- damage categories;
- conditions;
- effects and traits;
- sources and properties;
- additional PF2e or module-provided entries.

Values registered by PF2e or another module in `CONFIG.PF2E.immunityTypes` are included automatically. The low-level `custom` entry is omitted because custom IWR definitions require labels and predicates that are outside the current component schema.

## Component

```js
{
  type: "immunity",
  immunityType: "fire"
}
```

The compiler emits:

```js
{
  key: "Immunity",
  type: "fire"
}
```

Condition immunity uses the same structure, for example `frightened`.
