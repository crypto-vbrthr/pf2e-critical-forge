# Weakness Type Catalog

The weakness component uses a central catalog backed by `CONFIG.PF2E.weaknessTypes`.
Standard damage types are merged in as fallbacks, so the catalog remains useful during initialization and in isolated tests.

## Public API

```js
const catalog = game.modules.get("pf2e-critical-forge")?.api.weaknessTypes;

catalog.list();
catalog.groups("fire");
catalog.get("physical");
catalog.has("splash-damage");
```

## Groups

The Effect Forge displays weakness types in four compact groups:

- damage types;
- damage categories;
- sources and properties;
- additional PF2e or module-provided types.

Values registered by PF2e or another module in `CONFIG.PF2E.weaknessTypes` are included automatically. The catalog excludes the low-level `custom` entry because custom IWR definitions require predicates and labels not represented by the current schema.
