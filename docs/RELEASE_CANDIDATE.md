> Historical document for the Effect Forge 0.4.0 release-candidate line. The current 0.5.6 development line adds Critical Forge diagnostics, configurable result cards, and manual GM effect application.

# Release Candidate 0.4.0-rc.2

`rc.2` corrects the release-hygiene check so it can be run from a normal Git checkout. Root development directories are ignored by the source-tree scan; they remain excluded from the distributed ZIP.

## Scope

This candidate freezes the feature set of the Effect Engine and Effect Forge. It is intended to find regressions, compatibility issues, missing localization, and awkward workflows before the first stable Effect Forge release.

Critical Forge card generation is not part of this candidate. Its world setting remains reserved for forward compatibility and is disabled by default.

## Compatibility target

- Foundry VTT: 14
- Pathfinder Second Edition system: 8.1.2 or newer
- Node.js for development tests: 20 or newer
- Effect Definition schema: 1
- Public API: 0.4.0

## Automated gate

Run from the module root:

```bash
npm run release:check
```

This command executes the complete test suite and then verifies:

- synchronized module, package, and runtime versions;
- Foundry and PF2e manifest compatibility;
- existence of every manifest-referenced file;
- identical German and English localization key trees;
- absence of common build, secret, and operating-system artifacts;
- JavaScript syntax for every `.js` and `.mjs` file;
- matching version entries in README and changelog.

## Manual candidate matrix

The following workflows should be exercised in a clean test world before the stable tag:

| Area | Candidate check |
|---|---|
| Startup | Enable the module in a Foundry 14 PF2e world and confirm a clean console startup. |
| Permissions | Confirm the Effect Forge entry point is available to the GM and does not expose write actions to players. |
| Localization | Open the interface once in German and once in English; verify no raw localization keys appear. |
| Components | Create and apply one effect using every built-in component type. |
| Conditions | Verify one valued condition and one non-valued condition. |
| Editing | Load a world Effect Item, update it, and create a copy. |
| Drag and drop | Drop world, Actor-embedded, and compendium Effect Items into the editor. |
| Preservation | Update an Item containing an unsupported Rule Element and verify that rule survives. |
| Transfer | Export to file and clipboard, then import both forms into a clean world. |
| Migration | Import a legacy schema-0 fixture and save it as schema 1. |
| Application | Apply an effect to one and multiple selected tokens, then remove it through the API. |
| Window state | Resize and move the window, reopen it, and verify position and size restoration. |
| Dirty state | Attempt to close, reset, load, or import with unsaved changes and verify the confirmation guard. |

## Known limitations

- Critical Forge cards and chat integration are not implemented yet.
- Target-aware compatibility validation is still a prepared extension point. Definition-level validation is complete, but actor immunities and creature-state interactions are not yet analyzed automatically.
- Unsupported and third-party Rule Elements are preserved losslessly but cannot be edited through dedicated GUI cards.
- Most numeric components intentionally accept fixed integer values. Persistent damage is the current built-in component with a dice formula.
- This candidate declares Foundry 14 compatibility only. Earlier Foundry generations are outside the release target.

## Candidate policy

During the RC phase, changes should be limited to:

- bug fixes;
- compatibility corrections;
- localization repairs;
- documentation corrections;
- tests that reproduce candidate defects.

New component types and Critical Forge functionality should wait until after the stable Effect Forge release.
