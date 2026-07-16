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

Card IDs are globally unique. Pack IDs and card IDs use lowercase letters, digits, dots, underscores, and hyphens.

The bundled `core` pack contains a 96-card localized test library. It is deliberately broad enough to exercise attack, spell, and save filters, profiles, redraw history, and effect application, but its prose and weighting are still playtest content rather than the final critical-results library. See [CORE_CARD_LIBRARY.md](CORE_CARD_LIBRARY.md).
