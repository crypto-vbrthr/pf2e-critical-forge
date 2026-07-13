# Changelog

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
