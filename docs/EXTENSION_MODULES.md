# Optional Critical Card Extension Modules

Critical Forge can act as a card engine for separate Foundry modules. An extension module owns its card data, localization, artwork, versioning, and release schedule while `pf2e-critical-forge` supplies validation, filtering, selection, chat presentation, redraws, and Effect Engine integration.

## Foundry relationship

Declare Critical Forge as a required module dependency so the extension is never loaded without the registration API.

```json
{
  "id": "my-critical-expansion",
  "title": "My Critical Expansion",
  "version": "1.0.0",
  "compatibility": {
    "minimum": "14",
    "verified": "14"
  },
  "relationships": {
    "requires": [
      {
        "id": "pf2e-critical-forge",
        "type": "module",
        "compatibility": {
          "minimum": "0.9.4-dev.1"
        }
      }
    ],
    "systems": [
      {
        "id": "pf2e",
        "type": "system"
      }
    ]
  },
  "esmodules": ["scripts/main.js"],
  "languages": [
    { "lang": "de", "name": "Deutsch", "path": "lang/de.json" },
    { "lang": "en", "name": "English", "path": "lang/en.json" }
  ]
}
```

## Registration lifecycle

Register through `pf2eCriticalForgeReady`. The API and all Critical Forge registries are initialized when this hook fires.

```js
import { DARK_FANTASY_PACK } from "./packs/dark-fantasy.js";
import { HEROIC_PACK } from "./packs/heroic.js";

Hooks.once("pf2eCriticalForgeReady", (forge) => {
  const extension = forge.cards.extensions.forModule("my-critical-expansion");

  extension.registerPacks([
    DARK_FANTASY_PACK,
    HEROIC_PACK
  ]);
});
```

A Foundry reload naturally clears runtime registrations. When the extension is disabled, its script no longer runs and its packs no longer enter the registry. No world cleanup task is required.

## Pack definition

The extension controller supplies and enforces `sourceModule`. The extension may omit it from its source data.

```js
export const DARK_FANTASY_PACK = {
  schemaVersion: 1,
  id: "my-critical-expansion.dark-fantasy",
  titleKey: "MY_CRITICAL_EXPANSION.Packs.DarkFantasy.Title",
  descriptionKey: "MY_CRITICAL_EXPANSION.Packs.DarkFantasy.Description",
  fallbackTitle: "Dark Fantasy",
  fallbackDescription: "Bleak and dramatic critical results.",
  version: "1.0.0",
  priority: 20,
  enabled: true,
  metadata: {
    theme: "dark-fantasy"
  },
  cards: [
    {
      schemaVersion: 1,
      id: "my-critical-expansion.dark-fantasy.ashen-reversal",
      packId: "my-critical-expansion.dark-fantasy",
      category: "spellCriticalFumble",
      tone: "dramatic",
      impact: "moderate",
      titleKey: "MY_CRITICAL_EXPANSION.Cards.AshenReversal.Title",
      descriptionKey: "MY_CRITICAL_EXPANSION.Cards.AshenReversal.Description",
      fallbackTitle: "Ashen Reversal",
      fallbackDescription: "The spell recoils in a cloud of cold ash.",
      weight: 1,
      tags: ["dark-fantasy", "backlash"],
      filters: {
        spellTraits: ["fire"]
      },
      effect: null,
      metadata: {}
    }
  ]
};
```

Card and pack ids are globally unique. Namespace both with the extension module id. Localized keys remain in the extension module’s own language files.

Positive and negative attack filters can be combined. This keeps a martial ranged pack from leaking into spell attacks:

```js
filters: {
  attackTraits: ["ranged"],
  excludedAttackTraits: ["spell"]
}
```

The negative filter rejects the card when any listed attack trait is present. Omitting it remains equivalent to an empty array.

## Controller contract

```js
const extension = forge.cards.extensions.forModule("my-critical-expansion");

extension.registerPack(pack);
extension.registerPacks([packA, packB]);
extension.registerPack(replacement, { replace: true });

extension.getPack("my-critical-expansion.dark-fantasy");
extension.listPacks();

extension.unregisterPack("my-critical-expansion.dark-fantasy");
extension.unregisterAll();
```

The controller provides four important guarantees:

1. **Ownership isolation:** it can replace or remove only packs whose `sourceModule` matches the bound module id.
2. **Atomic batches:** `registerPacks()` either registers the whole batch or leaves the previous registry untouched.
3. **Protected editor state:** extension packs are read-only in the Card Pack Editor and cannot pretend to be world-managed packs.
4. **Global collision checks:** duplicate pack or card ids are rejected before the batch is committed.

The general `api.cards.registerPack()` method remains available as a low-level API, but extension modules should use the bound controller.

## Enabled packs

`enabled: false` registers a pack without adding its cards to normal candidate lists or weighted selection. It remains visible as a protected pack and can still be inspected, localized, exported, or copied into a world-managed pack.

An extension that provides several themes can choose their initial state itself or expose its own settings and replace the registered definitions when those settings change.

```js
extension.registerPack({
  ...DARK_FANTASY_PACK,
  enabled: game.settings.get("my-critical-expansion", "enableDarkFantasy")
}, { replace: true });
```

## Change hook

Critical Forge announces successful extension changes:

```js
Hooks.on("pf2eCriticalForgePacksChanged", (change) => {
  console.log(change.action);
  console.log(change.sourceModule);
  console.log(change.packIds);
  console.log(change.replacedPackIds);
});
```

Possible actions are `register`, `register-or-replace`, `unregister`, and `unregister-all`. The payload is frozen.

## Development updates

During hot-reload experiments or repeated macro execution, use `{ replace: true }`. Production modules normally register once per Foundry startup.

```js
extension.registerPacks(allPacks, { replace: true });
```

Replacement is allowed only for packs already owned by the same extension. A request to replace `core`, a world pack, or another extension’s pack throws and leaves all registries unchanged.
