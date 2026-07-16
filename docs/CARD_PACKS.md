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

A separate Foundry module can contribute one or more protected packs through the public API. The extension should register after `pf2e-critical-forge` has initialized and remove its own pack when appropriate.

```js
Hooks.once("ready", () => {
  const forge = game.modules.get("pf2e-critical-forge")?.api;
  if (!forge) return;

  forge.cards.registerPack({
    schemaVersion: forge.cardPackSchemaVersion,
    id: "my-critical-expansion",
    titleKey: "MY_CRITICAL_EXPANSION.Pack.Title",
    descriptionKey: "MY_CRITICAL_EXPANSION.Pack.Description",
    fallbackTitle: "My Critical Expansion",
    fallbackDescription: "Optional themed critical cards.",
    version: "1.0.0",
    sourceModule: "my-critical-expansion",
    priority: 20,
    enabled: true,
    metadata: { extension: true },
    cards: []
  });
});
```

The extension owns its localization files, artwork, card definitions, and release cadence. Its packs remain read-only in the Card Pack Editor, but users can duplicate them into editable world packs. Uninstalling or disabling the extension removes only its registered packs; exported world copies remain independent.

The bundled `core` pack contains a 96-card localized test library. It is deliberately broad enough to exercise attack, spell, and save filters, profiles, redraw history, and effect application, but its prose and weighting are still playtest content rather than the final critical-results library. See [CORE_CARD_LIBRARY.md](CORE_CARD_LIBRARY.md).
