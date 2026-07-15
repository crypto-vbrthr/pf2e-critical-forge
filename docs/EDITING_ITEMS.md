# Editing existing Effect Items

Effect Forge can open existing world-level PF2e Effect Items, translate supported Rule Elements back into Effect Definition components, and update the original Item.

## GUI workflow

1. Open Effect Forge from the Items Directory.
2. Either choose an effect under **Existing effects** and select **Load effect**, or drag an Effect Item onto the drop zone.
3. Edit basic data, duration, or components.
4. Use **Update Item** to overwrite the loaded Item, or **Create as new Item** to make a copy.
5. Use **New effect** to leave edit mode and start with an empty definition.

The update button is disabled until an Item has been loaded or created by the current Forge window.

The drop zone accepts:

- world-level Effect Items from the Items Directory;
- embedded Effect Items from Actor sheets;
- Effect Items from compendiums.

A compendium or embedded Item can always be loaded and copied. Updating it in place still depends on Foundry permissions and whether the source compendium is unlocked.

## Round-trip data

Newly created Items store the complete Effect Definition under:

```js
item.flags["pf2e-critical-forge"].definition
```

This provides a lossless source for future Forge versions. Items created before `0.3.0-dev`, and compatible Items created manually, are reconstructed from their PF2e Rule Elements.

The Item adapter currently recognizes the Rule Elements produced by all built-in Forge components:

- `GrantItem` for conditions and persistent damage;
- `FlatModifier` for ordinary modifiers and Speed changes;
- `Resistance`;
- `Weakness`;
- `Immunity`;
- `FastHealing` and regeneration;
- `TempHP`;
- `BaseSpeed`.

## Unsupported Rule Elements

Effect Forge never silently deletes Rule Elements it cannot represent.

Unsupported or advanced rules are kept as **unmanaged rules**. The GUI displays a warning with their count. Updating the loaded Item, creating a copy, or applying the loaded effect to selected tokens carries those rules forward unchanged after the newly compiled Forge rules.

Examples include:

- an `Aura` Rule Element;
- a `FlatModifier` with an advanced predicate not represented by the GUI;
- formulas in fields that currently accept only fixed integers;
- third-party Rule Elements.

Unmanaged rules are intentionally not shown as editable component cards. They remain part of the Item and are persisted in module flags for later updates.

## Public API

### Read an Item

```js
const result = await api.effects.readItem(item);

console.log(result.definition);
console.log(result.unmanagedRules);
console.log(result.warnings);
```

Return shape:

```js
{
  definition: EffectDefinition,
  unmanagedRules: RuleElementSource[],
  sourceItemId: string | null,
  sourceItemUuid: string | null,
  source: "stored-definition" | "rules",
  warnings: [{ code: "ITEM_UNMANAGED_RULES_PRESERVED", count: 1 }]
}
```

### Update an Item

```js
await api.effects.updateItem(item, definition, {
  unmanagedRules: result.unmanagedRules,
  render: false
});
```

The update service changes the Item name, image, description, duration, managed rules, and Critical Forge flags. Other PF2e Item fields remain untouched.

### Open the GUI with an Item

```js
await api.ui.openEffectForge(item);
```

This works with a world Item and can also be used by another module to pass a writable embedded effect Item directly to the editor. The built-in dropdown lists world-level effect Items only. Drag-and-drop additionally accepts embedded Actor effects and compendium effects by UUID.
