# Changelog

## 0.4.0-rc.2

- Fixed release metadata tests incorrectly treating the repository root `.git` directory as packaged release content.
- Root development directories `.git`, `node_modules`, and `coverage` are now skipped by source-tree checks while nested occurrences remain forbidden.
- Applied the same distinction to `npm run release:check`, so it can run normally from a Git checkout.

## 0.4.0-rc.1

### Release candidate
- Feature-frozen release candidate for the Effect Engine and Effect Forge.
- Module, package, and runtime version metadata are synchronized.
- Foundry compatibility is narrowed to version 14; the PF2e system dependency now requires 8.1.2 or newer.
- Critical Forge remains planned and is disabled by default so the candidate exposes no non-functional feature switch on a fresh world.
- Added automated release metadata, manifest-path, localization-parity, and archive-hygiene tests.
- Added `npm run release:check` for the full automated suite plus release-specific static checks.
- Added a release-candidate test matrix, known limitations, and a publication checklist.
- The automated suite now contains 92 passing tests with 93.86% measured line coverage.
- No Effect Definition schema changes; schema version remains `1`.
- Public API version remains `0.4.0`.

## 0.4.0-dev

### Added
- Schema Migration Engine with public `api.effects.migrate()` support.
- Automatic migration for legacy raw imports and stored Item definitions.
- Legacy schema-0 normalization for early field aliases and missing default containers.
- Unsaved-change tracking with discard confirmation when loading, importing, resetting, or closing.
- Component actions for duplicate, move up, move down, expand, and collapse.
- Component-level validation markers and links from validation messages back to the affected card.
- Client-side persistence of Effect Forge window size and position.
- Button-state tooltips for unavailable update and token-application actions.
- Eight regression tests for migration, component presentation state, editor snapshots, and window-state normalization.
- New migration documentation in `docs/MIGRATIONS.md`.

### Changed
- Imported and loaded legacy definitions are migrated in memory and written back only when the user saves.
- Collapsed component state is presentation-only and never appears in exported Effect Definitions.
- The automated suite expanded from 80 to 88 tests; measured line coverage is 93.79%.
- Module version increased to `0.4.0-dev`; public API version increased to `0.4.0`; Effect Definition schema remains version `1`.

## 0.3.3-dev

### Fixed
- JSON file export now uses Foundry VTT's native `foundry.utils.saveDataToFile()` utility.
- The desktop client no longer tries to open the temporary `blob:` URL with an external application.

### Changed
- Added a regression test that verifies export data, MIME type, and filename are passed to Foundry's download API.
- The automated suite expanded from 79 to 80 tests; measured line coverage is about 93.74%.
- Module version increased to `0.3.3-dev`; public API remains `0.3.1` and Effect Definition schema remains version `1`.

## 0.3.2-dev

### Added
- Portable, versioned JSON export packages containing the complete Effect Definition and preserved unmanaged Rule Elements.
- Effect Forge actions for importing JSON files, importing from the clipboard, downloading exports, and copying export packages.
- Support for importing both Critical Forge export envelopes and raw Effect Definitions.
- Stable transfer error codes, localized feedback, schema/version checks, and a 2 MB file-size guard.
- Public `api.effects.createExport()`, `serializeExport()`, and `parseImport()` methods.
- Import/export documentation in `docs/IMPORT_EXPORT.md`.
- Seven regression tests for package round-trips, raw definitions, invalid formats, filenames, descriptions, and file limits.

### Changed
- Imported effects open as new unsaved effects to prevent accidental updates of source Items.
- Unmanaged third-party Rule Elements survive export and import.
- The automated suite expanded from 72 to 79 tests.
- Module version increased to `0.3.2-dev`; public API version increased to `0.3.1`; Effect Definition schema remains version `1`.

## 0.3.1-dev

### Added
- Dedicated drag-and-drop zone in Effect Forge for loading existing PF2e Effect Items directly into edit mode.
- Support for world Items, embedded Actor effects, and compendium effects through Foundry UUID resolution.
- Localized feedback for unsupported documents, non-effect Items, and unresolved drops.
- Reusable drag-data and Item-resolution helpers in `scripts/effect-forge/effect-item-drop.js`.
- Six regression tests for Foundry drag parsing, fallback JSON parsing, world Item lookup, UUID resolution, and rejection paths.

### Changed
- The automated suite expanded from 66 to 72 tests.
- Module version increased to `0.3.1-dev`; public API remains `0.3.0` and Effect Definition schema remains version `1`.

## 0.3.0-dev

### Added
- Existing world Effect Items can be selected and loaded directly in Effect Forge.
- Edit mode with separate actions for updating the loaded Item or creating a new copy.
- Public `api.effects.readItem(item)` adapter for reconstructing Effect Definitions.
- Public `api.effects.updateItem(item, definition, options)` application service.
- Public `api.ui.openEffectForge(item)` overload for opening a specific writable effect Item.
- Reverse mapping for every Rule Element produced by the eleven built-in components.
- Complete Effect Definitions are now stored in generated Item flags.
- Preservation of unsupported, advanced, and third-party Rule Elements during Item updates, copies, and token application.
- Editing workflow documentation in `docs/EDITING_ITEMS.md`.
- Six regression tests for stored definitions, legacy Item reconstruction, condition and persistent-damage parsing, and safe Item updates.

### Changed
- Item updates modify only Forge-managed fields while leaving unrelated PF2e Item data intact.
- The automated suite expanded from 60 to 66 tests.
- Public API version increased to `0.3.0`; Effect Definition schema remains version `1`.

## 0.2.9-dev

### Added
- `baseSpeed` component for granting climb, burrow, fly, or swim Speeds.
- Builder method `addBaseSpeed()` with movement type and positive integer value.
- Public `api.baseSpeedTypes` helpers derived from the central movement-type catalog.
- Effect Forge editor card and component-menu entry for granted movement modes.
- Validation codes for invalid types, values, unusual increments, and duplicate base Speeds.
- Compiler support for native PF2e `BaseSpeed` Rule Elements.
- Builder, catalog, validation, and compiler regression tests.
- `docs/BASE_SPEED.md`.

### Changed
- Automated suite expanded from 55 to 60 tests.
- Public API version increased to `0.2.8`; Effect Definition schema remains version `1`.

## 0.2.8-dev

### Added
- `movement` component for all Speeds or one of land, burrow, climb, fly, and swim.
- Builder method `addMovement()` with movement type, signed integer value, and PF2e modifier type.
- Central movement-type catalog and public `api.movementTypes` helpers.
- Effect Forge editor card and component-menu entry for movement modifiers.
- Validation codes for invalid movement types, values, modifier types, unusual increments, and overlapping modifiers.
- Compiler support for PF2e `FlatModifier` Rule Elements using native Speed selectors.
- Builder, catalog, validation, and compiler regression tests.
- `docs/MOVEMENT.md`.

### Changed
- Automated suite expanded from 49 to 55 tests.
- Public API version increased to `0.2.7`; Effect Definition schema remains version `1`.

## 0.2.7-dev

### Added
- `temporaryHitPoints` component with a positive integer value.
- Builder method `addTemporaryHitPoints()`.
- Effect Forge editor card and component-menu entry for temporary Hit Points.
- Validation code `TEMPORARY_HIT_POINTS_VALUE_INVALID`.
- Cross-component warning `TEMPORARY_HIT_POINTS_MULTIPLE_SOURCES`.
- Compiler support for native PF2e `TempHP` Rule Elements.
- Builder, validation, and compiler regression tests.
- `docs/TEMPORARY_HIT_POINTS.md`.

### Changed
- Automated suite expanded from 45 to 49 tests.
- Public API version increased to `0.2.6`; Effect Definition schema remains version `1`.

## 0.2.6-dev

### Added
- `regeneration` component with a positive integer value and one or more deactivating damage types.
- Builder method `addRegeneration()` with normalization and duplicate removal.
- Effect Forge editor card with grouped multi-selection for deactivating damage types.
- Validation codes for invalid values, missing or invalid deactivation types, duplicate deactivation entries, and multiple regeneration sources.
- Compiler support for PF2e `FastHealing` Rule Elements with `type: "regeneration"` and `deactivatedBy`.
- Builder, catalog, validation, and compiler regression tests for regeneration.
- `docs/REGENERATION.md`.

### Changed
- Damage-type groups now support multiple selected entries while remaining backward compatible with single selection.
- Public API version increased to `0.2.5`; Effect Definition schema remains version `1`.

## 0.2.5-dev

### Added
- `fastHealing` component with a positive integer healing value.
- Builder method `addFastHealing()`.
- Effect Forge editor card and component-menu entry for fast healing.
- Validation code `FAST_HEALING_VALUE_INVALID`.
- Cross-component warning `FAST_HEALING_MULTIPLE_SOURCES`.
- Compiler support for native PF2e `FastHealing` Rule Elements.
- Builder, validation, and compiler regression tests for fast healing.
- `docs/FAST_HEALING.md`.

### Changed
- Automated suite expanded from 38 to 41 tests.
- Public API version increased to `0.2.4`; Effect Definition schema remains version `1`.

## 0.2.4-dev

### Added
- `immunity` component with a grouped PF2e immunity type and no numeric value.
- Builder method `addImmunity()`.
- Central immunity-type catalog backed by `CONFIG.PF2E.immunityTypes`.
- Compact immunity groups for damage types, damage categories, conditions, effects and traits, sources and properties, and additional system entries.
- Public `api.immunityTypes` catalog helpers.
- Effect Forge editor card and component-menu entry for immunity.
- Validation codes `IMMUNITY_TYPE_INVALID` and `IMMUNITY_DUPLICATE_TYPE`.
- Compiler support for native PF2e `Immunity` Rule Elements.
- Builder, catalog, validation, and compiler regression tests for immunity.
- `docs/IMMUNITY_TYPES.md`.

### Changed
- Automated suite expanded from 34 to 38 tests.
- Public API version increased to `0.2.3`; Effect Definition schema remains version `1`.


## 0.2.3-dev

### Added
- `weakness` component with grouped PF2e weakness type and positive integer value.
- Builder method `addWeakness()`.
- Central weakness-type catalog backed by `CONFIG.PF2E.weaknessTypes`.
- Public `api.weaknessTypes` catalog helpers.
- Effect Forge editor card and component-menu entry for weakness.
- Validation codes `WEAKNESS_TYPE_INVALID`, `WEAKNESS_VALUE_INVALID`, and `WEAKNESS_DUPLICATE_TYPE`.
- Compiler support for native PF2e `Weakness` Rule Elements.
- Builder, catalog, validation, and compiler regression tests for weakness.
- `docs/WEAKNESS_TYPES.md`.

### Changed
- Automated suite expanded from 30 to 34 tests.
- Public API version increased to `0.2.2`; Effect Definition schema remains version `1`.

## 0.2.2-dev

### Added
- Reusable Effect Forge view-state helper for capturing and restoring marked scroll containers across ApplicationV2 re-renders.
- Regression tests for exact scroll restoration, bottom anchoring, and shrinking content.

### Fixed
- Editor, component-list, validation, and preview scroll positions no longer reset when the component menu is opened, a component is added or removed, an image is selected, or validation/compilation refreshes the window.
- A component list already near its lower edge remains pinned there after appending a component, keeping the new card in view.

### Changed
- Automated suite expanded from 27 to 30 tests.
- Public API version remains `0.2.1`; Effect Definition schema remains version `1`.

## 0.2.1-dev

### Added
- `resistance` component with grouped resistance type and positive integer value.
- Builder method `addResistance()`.
- Central resistance-type catalog backed by `CONFIG.PF2E.resistanceTypes`, with standard damage-type and category fallbacks.
- Public `api.resistanceTypes` catalog helpers.
- Effect Forge editor card and component-menu entry for resistance.
- Stable validation codes for invalid resistance type, invalid resistance value, and duplicate resistance types.
- Compiler support for PF2e `Resistance` Rule Elements.
- Builder, catalog, validation, and compiler regression tests for resistance.
- `docs/RESISTANCE_TYPES.md`.

### Changed
- Automated suite expanded from 23 to 27 tests.
- Public API version increased to `0.2.1`; Effect Definition schema remains version `1`.

## 0.2.0-dev

### Added
- `persistentDamage` component with formula, damage type, and optional recovery DC.
- Builder method `addPersistentDamage()`.
- Central damage-type catalog backed by `CONFIG.PF2E.damageTypes` with grouped GUI options and fallbacks.
- Public `api.damageTypes` catalog helpers.
- Effect Forge editor card and component-menu entry for persistent damage.
- Stable validation codes for missing formula, invalid damage type, invalid recovery DC, and duplicate persistent-damage types.
- Compiler support for PF2e `persistent-damage` and `pd-recovery-dc` GrantItem alterations.
- Persistent-damage Builder, catalog, validation, and compiler tests.
- `docs/DAMAGE_TYPES.md`.

### Changed
- Component handlers may return structured validation entries with stable codes while legacy string errors remain supported.
- Automated suite expanded from 18 to 23 tests.
- Public API version increased to `0.2.0`; Effect Definition schema remains version `1`.

## 0.1.12-dev

### Added
- Dependency-free automated test suite based on the Node test runner.
- Builder tests for normalization, cloning, immutability, component operations, and invalid input.
- Validation tests for schema short-circuiting, selector diagnostics, frightened stacking, non-valued conditions, and target context.
- Catalog tests for dynamic PF2e skills and valued condition metadata.
- Compiler tests for `GrantItem`, `FlatModifier`, PF2e Item source data, flags, and invalid definitions.
- `docs/TESTING.md` with test structure, commands, mocks, and extension guidelines.

### Changed
- Refreshed README and all developer documentation to match the current API and compiler behavior.
- Expanded API return shapes, error behavior, component contracts, validation codes, and complete usage examples.
- Updated schema examples to use a circumstance penalty where stacking with frightened is intended.

## 0.1.11-dev

- Added a central PF2e condition catalog backed by `pf2e.conditionitems`.
- Condition value fields are shown only for valued conditions.
- Non-valued conditions no longer receive an invalid `badge-value` GrantItem alteration.
- Added `api.conditions` metadata helpers.
- Added validation warning `CONDITION_VALUE_IGNORED` for legacy definitions.


## 0.1.10-dev

### Added
- Central Selector Catalog shared by GUI, Validation Engine, and public API.
- Grouped selector choices using HTML option groups.
- Complete PF2e skill list loaded dynamically from `CONFIG.PF2E.skills`.
- Attribute-based, attack, defense/DC, movement, health, and damage selector groups.
- Custom selector input with syntax validation and informational diagnostics.
- Selector API and `docs/SELECTORS.md`.

### Changed
- Frightened stacking validation now uses selector metadata from the central catalog.

## 0.1.9-dev

### Changed
- Rebuilt the Effect Forge UI to match the approved two-panel design.
- Added localized dropdowns for PF2e conditions, common selectors, and modifier types.
- Added effect ID editing, image preview and picker, description counter, and unlimited duration toggle.
- Added grouped validation results with status summary.
- Added copy-to-clipboard actions for Effect Definition and PF2e Item data.
- Preserved the fixed action bar, independent scrolling areas, and resizable window.

### Fixed
- Added all previously missing localization keys.
- Increased spacing between component fields to prevent controls from touching.

## 0.1.8-dev

### Changed
- Made the Effect Forge window resizable.
- Added an independent vertical scrollbar to the component list.
- Kept the action bar outside all scrolling regions so components cannot overlap it.
- Added stable scrolling for the preview and validation sidebar.
- Added minimum window dimensions and responsive single-column behavior.

## 0.1.7-dev

### Changed
- Reworked Effect Forge into a component-based editor.
- Added dynamic condition and modifier cards with add/remove controls.
- Added persistent form state across re-renders.
- Added Effect Definition and compiled PF2e Item previews.
- Moved validation feedback into a dedicated sidebar panel.

## 0.1.6-dev

### Added
- Structured Validation Engine with errors, warnings, hints, and information.
- Stable validation codes and localization keys.
- Separate schema, PF2e rule, and target compatibility validators.
- Stacking analysis for Frightened plus status or circumstance penalties.
- Validation report panel in the Effect Forge UI.
- Public `api.effects.analyze()` method.
- Validation developer documentation.

### Changed
- The reference Will penalty now defaults to a circumstance penalty.
- Legacy `validate()` remains available as a compatibility wrapper.

## 0.1.5-dev

### Added
- Public fluent Effect Builder API.
- Builder support for IDs, names, descriptions, images, durations, metadata, applications, conditions, modifiers, and arbitrary components.
- `EffectBuilder.from()` support for cloning and editing existing definitions.
- Deeply frozen Builder output.

### Changed
- The Effect Forge GUI now constructs definitions exclusively through the public Builder API.

## 0.1.4-dev

### Changed
- Split the Effect compiler into focused compiler services.
- Separated component compilation, Rule Element collection, duration translation, flag creation, and PF2e Item assembly.
- Preserved the public API and existing Effect Forge behavior.

## 0.1.3-dev

### Fixed
- Added Foundry 13/14 compatible Item Directory integration through both `renderItemDirectory` and `renderSidebarTab`.
- Added immediate injection when the Items tab is already rendered.
- Added a documented API fallback for opening Effect Forge without a sidebar button.
- Added diagnostic logging when no suitable sidebar target is found.

## 0.1.2-dev

### Added
- Rudimentary Effect Forge test form.
- Editable effect name, description, image, and global duration.
- Optional condition and modifier components.
- Validation, compilation, world Item creation, and selected-token application from form data.
- Console output of definitions and compiled PF2e Item sources for diagnostics.

## 0.1.1-dev

### Added
- Concrete PF2e Effect Item source compiler.
- Condition compilation through PF2e `GrantItem`.
- Modifier compilation through PF2e `FlatModifier`.
- World Item creation through the public API.
- Application to one or more Actor or Token targets.
- Removal by Effect Definition ID.
- Effect Forge test buttons for creating and applying the reference effect.
- Localized reference effect.

### Fixed
- The public API no longer attempts to add properties after being frozen.

## 0.1.0-dev

### Added
- Initial module architecture.
- Always-loaded Effect Engine and public API.
- Separate world settings for the Effect Forge UI and Critical Forge.
- Versioned effect-definition schema.
- Component registry.
- Initial condition and modifier components.
- Validation and abstract compilation.
- Minimal GM-only Effect Forge window and Items Directory button.
- German and English localization.
- Initial API, schema, architecture, and examples documentation.
