# PF2E Critical Forge

PF2E Critical Forge is being developed as two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: on-demand critical-hit and fumble results.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

`0.1.3-dev` adds a rudimentary test GUI to the functional Effect Engine. It provides:

- independent settings for Effect Forge and Critical Forge;
- an always-loaded public API;
- versioned effect definitions;
- a component registry;
- initial `condition` and `modifier` components;
- validation and PF2e Effect Item compilation;
- world Item creation and application to selected tokens;
- a rudimentary GM-only Effect Forge form for building test definitions;
- developer documentation.

The reference effect can now be compiled, created as a world Item, and applied to selected tokens.

## API access

```js
const api = game.modules.get("pf2e-critical-forge")?.api;
console.log(api.version);
console.log(api.effects);
```

See [`docs/API.md`](docs/API.md), [`docs/EFFECT_SCHEMA.md`](docs/EFFECT_SCHEMA.md), and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Opening Effect Forge

The normal entry point is the **Open Effect Forge** button in the Items Directory.
For diagnostics or macros, the window can always be opened with:

```js
game.modules.get("pf2e-critical-forge")?.api.ui.openEffectForge();
```
