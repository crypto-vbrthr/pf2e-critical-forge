# Component Durations

Schema `2` allows every Effect Definition component to use either the global duration or an optional local override.

## Inheritance

```js
{
  schemaVersion: 2,
  name: "Layered Curse",
  duration: { value: 10, unit: "minutes", expiry: "turn-end" },
  components: [
    {
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "status"
    },
    {
      type: "condition",
      slug: "frightened",
      value: 2,
      duration: { value: 1, unit: "rounds", expiry: "turn-end" }
    }
  ]
}
```

The modifier inherits ten minutes. The frightened component lasts one round. Removing the `duration` property from the second component makes it inherit ten minutes as well.

All built-in component types accept the same optional field. `duration: null` is treated as inheritance during validation and removed by schema migration.

## Builder

Component builders accept `duration` in their options:

```js
const definition = api.builders.effect()
  .setName("Layered Curse")
  .setDuration(10, "minutes", "turn-end")
  .addModifier({
    selector: "will",
    value: -1,
    modifierType: "status"
  })
  .addCondition("frightened", 2, {
    duration: { value: 1, unit: "rounds", expiry: "turn-end" }
  })
  .build();
```

Existing components can be changed by index:

```js
const builder = api.builders.from(definition)
  .setComponentDuration(0, 3, "rounds", "turn-start")
  .clearComponentDuration(1);
```

## Compilation

`api.effects.compile()` resolves an effective duration for every component:

```js
compiled.components[0].duration;
compiled.components[0].durationSource; // "global" or "component"
compiled.durationGroups;
compiled.requiresDurationSplit;
```

Components with identical effective durations share one duration group, even when one inherited the duration and another explicitly declared the same value.

## Native PF2e Item bundles

PF2e Effect Items expose one duration for the whole Item. Critical Forge therefore emits one native Item source for every distinct effective duration. Every source:

- contains only the Rule Elements belonging to its duration group;
- has the matching PF2e Item duration;
- stores the complete logical Effect Definition;
- carries `durationSegment` metadata with one shared bundle ID.

```js
const sources = await api.effects.toItemSources(definition);
const items = await api.effects.createItems(definition);
const embedded = await api.effects.apply(definition, actor);
```

`toItemSource()` remains useful for guaranteed single-duration definitions. It throws `EffectDurationSplitError` rather than discarding duration groups when more than one source is required.

`createItem()` remains backward compatible and returns the primary world Item, while still creating all required sibling Items. New integrations that need every created document should use `createItems()`.

## Editing and removal

Opening any segment through `api.effects.readItem()` restores the full definition. `api.effects.updateItem()` reuses the bundle ID, updates the chosen primary segment, removes stale siblings, and recreates the remaining duration groups.

```js
await api.effects.remove(definition.id, actor);
```

Definition-based removal deletes all segments because they share the same `definitionId` flag.

## Unmanaged Rule Elements

Unmanaged rules preserved from an existing Item are attached only to the primary segment. Duplicating them across every segment could apply advanced automation more than once.

## Card effects

Critical Card effect templates use the same schema. A card may therefore combine, for example, a one-round condition with a longer modifier. Manual application from the chat card records every created segment ID in its audit data.
