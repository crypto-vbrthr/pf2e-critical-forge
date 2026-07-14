# Changelog

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
