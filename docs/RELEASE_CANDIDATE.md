# Release Candidate 0.8.0-rc.1

This candidate freezes the combined Effect Forge and Critical Forge feature set. The objective is to find regressions, PF2e context mismatches, permission issues, localization gaps, and awkward table workflows before the stable `0.8.0` tag.

## Compatibility target

- Foundry VTT: 14
- Pathfinder Second Edition system: 8.1.2 or newer
- Node.js for development tests: 20 or newer
- Public API: 0.7.0
- Effect Definition schema: 1
- Critical Card schema: 1
- Critical Card Pack schema: 1

## Frozen scope

- Effect Engine and Effect Forge with all existing effect components
- world Item editing, copying, import/export, migration, and unmanaged-rule preservation
- 96 localized core cards
- critical weapon attacks and fumbles
- critical spell attacks and spell fumbles
- critically successful and critically failed saving throws
- independent prompt, automatic, disabled, and natural-roll trigger settings
- redraw history and profile weighting
- GM-confirmed effect application
- Card Pack Editor with Effect Forge handoff, JSON transfer, and **Paket aktivieren**
- public registration API for optional third-party or companion-module card packs

No new effect component, card category, automation family, or editor subsystem should enter during this candidate line.

## Automated gate

Run from the module root:

```bash
npm run release:check
```

The command runs the complete Node suite and verifies synchronized version metadata, manifest paths, Foundry/PF2e compatibility, localization parity, archive hygiene, JavaScript syntax, README/changelog version references, and API/schema metadata.

## Manual candidate matrix

| Area | Candidate check |
|---|---|
| Startup | Install the exact candidate ZIP in a clean Foundry 14 PF2e world and confirm a clean console startup. |
| Permissions | Confirm Effect Forge, Critical diagnostics, Card Pack Editor, redraw, and effect application remain GM-controlled. |
| Localization | Exercise the primary workflows once in German and once in English; confirm no raw localization keys appear. |
| Effect components | Create, compile, and apply at least one effect using every built-in component type. |
| Item editing | Load a world Effect Item, update it, create a copy, and preserve an unsupported Rule Element. |
| Effect transfer | Export and import through file and clipboard, including one legacy schema-0 fixture. |
| Attack automation | Test critical weapon hits and fumbles in prompt and automatic modes. |
| Spell automation | Test critical spell hits and fumbles, including one trait-specific card pool. |
| Saving throws | Test critical success and failure for Reflex, Fortitude, and Will. |
| Natural results | Confirm natural 20/1 modes require both the natural die and the matching final critical degree. |
| Visibility | Publish one card in blind, GM-only, public, and self modes. |
| Redraw | Redraw several times, confirm recent-history avoidance, then apply an effect and confirm redraw is blocked. |
| Effect application | Apply source-targeted and target-targeted effects and verify duplicate protection. |
| Card editor | Copy a protected core card, edit text and filters, edit its effect in Effect Forge, and save the world pack. |
| Pack activation | Disable the custom pack with **Paket aktivieren**, confirm its cards stop appearing, then re-enable it. |
| Pack transfer | Export the custom pack, delete it, import it again, save it, draw a card, and apply its effect. |
| Protected packs | Confirm core and external packs remain read-only and can only be copied into world-managed packs. |
| Multiple GMs | With two active GMs, confirm only the primary active GM processes automatic critical rolls. |
| Upgrade | Upgrade a world containing custom packs from `0.7.1-dev`; confirm packs, enabled states, cards, and effects survive. |

## Known limitations

- Critical effects are never applied automatically. A GM must confirm application from the result card.
- The Context Adapter depends on PF2e chat metadata. Unusual third-party roll producers may provide incomplete source, target, spell, or save information.
- External packs are registered by their providing module. The core module does not manage installation, updates, or activation settings for separate companion modules.
- Unsupported and third-party Rule Elements are preserved but do not receive dedicated Effect Forge component editors.
- This candidate declares Foundry 14 compatibility only.

## Candidate policy

Allowed changes during the RC phase:

- bug fixes
- compatibility corrections
- localization repairs
- documentation corrections
- tests reproducing candidate defects
- narrowly scoped defensive checks that preserve the frozen behavior

Deferred until after `0.8.0`:

- new card categories
- new automatic roll families
- new effect component types
- large card-library expansions
- companion card-pack modules
