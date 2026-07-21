# Critical Card Pack Editor

Version `0.9.4-dev.3` adds the visual condition builder and synthetic test workbench while retaining the Effect Forge return workflow, deterministic collision-free card IDs, pack activation, and the tested end-to-end pack roundtrip.

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
- optional localization keys for distributed multilingual packs;
- optional nested context conditions with typed fields, operators, and test data.

Fallback text is what world-authored cards normally display. Localization keys remain available for packs intended to ship with a module and language files.

## Mechanical effects

The **Edit in Effect Forge** action opens a dedicated Effect Forge session. The normal world-item and effect-import controls are hidden in that mode. The footer contains a prominent **Use for Card** / **Zur Karte übernehmen** button. Pressing it validates the Effect Definition, returns it to the card editor, and closes the dedicated Effect Forge session. Normal world-Item and Token actions are hidden in this mode.

The card editor stores effect target, localized effect-name key, fallback name, and the complete Effect Definition. The UI now explains the stable role convention used by the runtime:

- `source`: the acting Actor for attacks and the saving Actor for saving throws;
- `target`: the hostile opponent for attacks and the hostile origin or caster for saving throws.

These labels describe existing schema-version-1 behavior; Phase 3 does not introduce a new targeting schema.

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


## Visual condition builder

A card still starts with `conditions: null`. Press **Enable Conditions** to create a root `all` group. The tree editor can then add or remove comparison leaves and nested `all`/`any` groups. Removing the root clears the optional condition tree and restores legacy behavior.

The curated field catalog covers roll, item, acting/saving Actor (`participants.source`), hostile opponent/origin (`participants.target`), and battlefield snapshot values. Field choices determine the available operators and value control:

- numbers: equality and range comparisons;
- booleans and enums: equality comparisons;
- text and text lists: equality and containment;
- every type: `exists` and `notExists`.

Provider-defined paths remain possible through **Custom field**. Authors explicitly choose whether the operand is text, number, boolean, or a text list, preventing ambiguous conversion during rerenders and JSON roundtrips. Custom paths must still satisfy the Condition Engine's safe dot-path validation.

## Contradiction warnings

The editor performs a non-blocking review of direct constraints inside each `all` group. It warns about combinations such as:

- `exists` together with `notExists`;
- incompatible equality values;
- equality together with the same inequality;
- `contains` together with `notContains`;
- empty numeric ranges.

Warnings do not rewrite or reject the card. Canonical schema validation remains the authority when saving. Nested alternatives in `any` groups are not treated as contradictions.

## Synthetic condition test

The test workbench builds a plain serializable snapshot and runs the production Condition Engine against it. Authors can vary roll category, save type, DC, source/target levels, Hit Point ratios, traits, hostile threat count, round, and turn. The result lists every group and leaf with expected value, actual value, availability, and match status.

The synthetic snapshot has provider id `card-editor-test`. It does not read or modify Actors, Tokens, Items, Combats, chat messages, or world settings. Test values and results are editor-session state and do not mark the pack dirty.

## Condition roundtrip and compatibility

Condition trees are preserved by:

- cloning a card or pack;
- opening and saving a world-managed pack;
- Effect Forge handoff and return;
- portable JSON export/import;
- world-setting persistence and registry hydration.

Existing cards with `conditions: null` remain unchanged, and imported Phase-2 condition trees open directly in the visual builder. Critical Card and Card Pack schemas remain at version `1`; no migration runs merely because a pack is opened or saved.

## Public condition-editor API

```js
const editor = api.cards.conditions.editor;

editor.fields;
editor.getField("participants.source.hp.ratio");
editor.operatorsForField("participants.source.level");
editor.analyzeContradictions(tree);
editor.createTestSnapshot({ sourceHpRatio: 0.4 });
editor.evaluateTest(tree, { sourceHpRatio: 0.4 });
```

Use `api.cards.capabilities.conditionEditor` before depending on these helpers from an extension module.
