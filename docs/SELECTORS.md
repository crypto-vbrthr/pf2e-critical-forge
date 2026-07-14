# Selector Catalog

The Effect Engine exposes a centralized catalog for PF2e selectors. The Effect Forge UI, validation layer, and public API use the same source.

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

## Skills

Skills are read from `CONFIG.PF2E.skills`, so skills registered by PF2e or another compatible module can appear automatically. A localized fallback list is provided for development contexts where PF2e configuration is unavailable.

## Custom selectors

A custom selector is stored as its actual string in the Effect Definition. The internal `__custom__` value is only a UI sentinel and never reaches the compiler. Unknown but syntactically valid selectors produce an informational validation entry. Invalid selector syntax produces an error.

PF2e selectors use lowercase kebab case. For specialized rolls, developers should confirm the correct selector with PF2e's roll inspector.
