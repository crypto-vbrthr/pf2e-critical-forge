# Critical Card Packs

A card pack is a versioned registration unit. Packs allow the core module, other Forge modules, worlds, and third-party modules to contribute cards without modifying the selector.

```js
{
  schemaVersion: 1,
  id: "my-module",
  titleKey: "MY_MODULE.CriticalPack.Title",
  descriptionKey: "MY_MODULE.CriticalPack.Description",
  fallbackTitle: "My Critical Pack",
  fallbackDescription: "Additional critical results.",
  version: "1.0.0",
  sourceModule: "my-module",
  priority: 10,
  enabled: true,
  metadata: {},
  cards: []
}
```

Registration is transactional. Every card is normalized and validated before the pack replaces an existing registration. A failed replacement restores the previous pack and cards.

The `enabled` property is the pack-level activation switch. Disabled packs stay registered so they can be inspected, localized, exported, or edited, but their cards are excluded from normal candidate lists and weighted selection. The Card Pack Editor exposes this property as **Paket aktivieren**.

Card IDs are globally unique. Pack IDs and card IDs use lowercase letters, digits, dots, underscores, and hyphens.

## Optional extension modules

A separate Foundry module should use the module-bound extension API rather than the low-level registry methods. Registration normally happens through `pf2eCriticalForgeReady`:

```js
Hooks.once("pf2eCriticalForgeReady", (forge) => {
  const extension = forge.cards.extensions.forModule("my-critical-expansion");

  extension.registerPacks([
    {
      schemaVersion: forge.cardPackSchemaVersion,
      id: "my-critical-expansion.dark-fantasy",
      titleKey: "MY_CRITICAL_EXPANSION.Packs.DarkFantasy.Title",
      descriptionKey: "MY_CRITICAL_EXPANSION.Packs.DarkFantasy.Description",
      fallbackTitle: "Dark Fantasy",
      fallbackDescription: "Optional dark-fantasy critical results.",
      version: "1.0.0",
      priority: 20,
      enabled: true,
      metadata: {},
      cards: []
    }
  ]);
});
```

The controller binds every registered pack to the supplied module id. `sourceModule` and protected ownership metadata are written by Critical Forge, not trusted from the supplied object. The extension can replace or remove only packs owned by that same module. Core packs, world-managed packs, and packs from other modules cannot be taken over through this API.

```js
const extension = forge.cards.extensions.forModule("my-critical-expansion");

extension.registerPack(pack);
extension.registerPacks([packA, packB]);
extension.registerPack(updatedPack, { replace: true });
extension.getPack("my-critical-expansion.dark-fantasy");
extension.listPacks();
extension.unregisterPack("my-critical-expansion.dark-fantasy");
extension.unregisterAll();
```

`registerPacks()` is atomic across the complete batch. Every pack and every card is normalized and validated before the live registry is changed. Duplicate ids, foreign ownership, or any later registration error leave the previous registry state intact.

Registered extension packs appear as protected, read-only packs in the Card Pack Editor. Users can inspect and export them or copy cards into an editable world pack. The `enabled` field controls whether a registered pack participates in selection. Disabling the extension module removes its packs on the next Foundry reload because its registration code no longer runs; independent world copies remain.

Critical Forge emits `pf2eCriticalForgePacksChanged` after successful extension registration, replacement, or removal. The hook receives a frozen payload containing `action`, `sourceModule`, `packIds`, and `replacedPackIds`.

See [EXTENSION_MODULES.md](EXTENSION_MODULES.md) for a complete module skeleton and lifecycle guidance.

The bundled `core` pack contains a 96-card localized test library. It is deliberately broad enough to exercise attack, spell, and save filters, profiles, redraw history, and effect application, but its prose and weighting are still playtest content rather than the final critical-results library. See [CORE_CARD_LIBRARY.md](CORE_CARD_LIBRARY.md).
