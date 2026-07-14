# Selector Catalog

The Effect Engine exposes a centralized catalog for PF2e selectors. The Effect Forge UI, Validation Engine, and public API all use the same source.

## API

```js
const selectors = game.modules.get("pf2e-critical-forge")?.api.selectors;

selectors.list();
selectors.groups("will");
selectors.get("athletics");
selectors.has("saving-throw");
selectors.isValidSyntax("my-module-special-check");
selectors.customValue;
```

## Grouped selectors

`groups(selected)` returns localized groups suitable for `<optgroup>` rendering. Current groups include:

- saving throws;
- skills;
- attribute-based checks;
- attacks;
- perception and initiative;
- defenses and DCs;
- movement;
- hit points and damage;
- custom selector sentinel.

The sentinel value exposed as `selectors.customValue` belongs only to the GUI. Store the actual custom selector string in the Effect Definition.

## Skills

Skills are read dynamically from `CONFIG.PF2E.skills`. This allows skills registered by PF2e or another compatible module to appear automatically.

A localized fallback list is available in development contexts where PF2e configuration has not been populated.

Example definition returned by `selectors.get("athletics")`:

```js
{
  value: "athletics",
  label: "Athletik",
  groupId: "skills",
  groupLabel: "Fertigkeiten",
  frightenedAffected: true,
  source: "pf2e-config"
}
```

The exact localized label depends on the active language.

## Syntax

The catalog accepts lowercase kebab-case selectors:

```text
will
saving-throw
my-module-special-check
```

Rejected examples:

```text
Will
will save
will_save
```

Syntax validation does not prove that PF2e uses a selector for a particular roll. Unknown but valid selectors remain legal so modules can target specialized roll domains.

## Custom selectors

```js
const definition = api.builders
  .effect()
  .setName("Specialized Modifier")
  .addModifier({
    selector: "my-module-special-check",
    value: 1,
    modifierType: "status"
  })
  .build();
```

Validation emits `MODIFIER_SELECTOR_CUSTOM`, not an error.

For specialized PF2e rolls, confirm the domain using PF2e's roll inspector before publishing the effect.
