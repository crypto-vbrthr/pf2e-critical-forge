# Critical Card Pack Editor

Version `0.8.0-rc.2` freezes the GM-only visual editor for Critical Forge card packs, the Effect Forge return workflow, deterministic collision-free card IDs, pack activation, and the tested end-to-end pack roundtrip.

## Opening the editor

When Critical Forge is enabled, the chat toolbar contains a **Card Editor** button beside the diagnostic workbench.

The public entry point is:

```js
await game.modules.get("pf2e-critical-forge")?.api.ui.openCardPackEditor();
```

## Pack ownership

The bundled `core` pack and packs registered by other modules are read-only. They can be inspected and exported, and any card can be copied into a world-managed pack as a template. Copies receive new world-owned IDs and localization keys; the original protected definitions are never mutated.

World-managed packs are stored in the hidden world setting `criticalCustomCardPacks`. Saving a pack re-registers it in the live Pack Registry and Card Registry, so it immediately participates in selection and automatic draws. New and duplicated cards are checked against every ID already present in the destination pack, rather than trusting random suffixes to be unique.

## Card fields

The editor exposes:

- stable card and pack IDs;
- one of six attack, spell-attack, or saving-throw critical categories;
- neutral, serious, dramatic, or humorous tone;
- narrative, light, moderate, or strong impact;
- draw weight and tags;
- damage-type, weapon-group, attack-trait, save-type, spell-tradition, spell-trait, source-trait, target-trait, and exclusion filters;
- fallback title and description;
- optional localization keys for distributed multilingual packs.

Fallback text is what world-authored cards normally display. Localization keys remain available for packs intended to ship with a module and language files.

## Mechanical effects

The **Edit in Effect Forge** action opens a dedicated Effect Forge session. The normal world-item and effect-import controls are hidden in that mode. The footer contains a prominent **Use for Card** / **Zur Karte übernehmen** button. Pressing it validates the Effect Definition, returns it to the card editor, and closes the dedicated Effect Forge session. Normal world-Item and Token actions are hidden in this mode.

The card editor stores effect target, localized effect-name key, fallback name, and the complete Effect Definition.

## Import and export

The editor accepts both raw Card Pack objects and the portable wrapper:

```json
{
  "format": "pf2e-critical-forge.card-pack",
  "formatVersion": 1,
  "generator": {},
  "pack": {}
}
```

Packs can be imported from a JSON file or clipboard and exported to a file or clipboard. Imports are loaded as unsaved drafts first. A protected pack ID is automatically copied to a new editable ID rather than replacing the protected pack.

## Public pack-editor API

```js
const packs = api.cards.packEditor;

packs.list();
packs.get("core");
packs.listCustom();
await packs.save(pack, { previousId: null });
await packs.remove("my-critical-cards");

const json = packs.serialize(pack);
const imported = packs.parseImport(json);
```

## Stabilized roundtrip

The automated integration path verifies this sequence:

```text
protected core card
→ editable world copy
→ Effect Forge edit
→ card-pack JSON export/import
→ world-setting save
→ live registry selection
→ localized chat preview
→ Effect Engine compilation
```

This test does not replace a visual Foundry smoke test, but it protects the data boundaries where cards previously had the greatest risk of losing ownership, effect definitions, or portable metadata.
