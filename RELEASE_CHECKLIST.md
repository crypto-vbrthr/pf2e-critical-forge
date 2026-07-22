# PF2E Critical Forge Release Checklist

## Before tagging

- [ ] Run `npm run release:check` with Node.js 20 or newer.
- [ ] Complete the manual matrix in `docs/RELEASE_CANDIDATE.md` in a clean Foundry 14 PF2e world.
- [ ] Confirm the current version matches in `module.json`, `package.json`, and `scripts/constants.js`.
- [ ] Confirm API and schema versions are intentionally unchanged or documented.
- [ ] Review all `Added`, `Changed`, and `Fixed` entries in `CHANGELOG.md`.
- [ ] Search the repository for raw localization keys, stale version strings, `TODO`, and `FIXME` markers.
- [ ] Verify German and English UI paths.
- [ ] Verify JSON file export in the Foundry desktop client.
- [ ] Copy a protected core card into a custom pack, edit its effect in Effect Forge, save it, export/import the pack, and confirm the card can still be drawn and applied.
- [ ] Disable and re-enable that custom pack through **Paket aktivieren** and verify selection changes immediately while the pack remains editable.
- [ ] Register a test extension through `api.extensions.forModule(moduleId, { requirements })`, add two Multi-Deck packs and all three provider types, replace one owned resource, call `unregisterAll()`, and confirm core, unowned, and unrelated resources remain untouched.
- [ ] Open Critical Diagnostics and confirm the toolbar shows `Schlachtfeldanalyse · 0.9.4-dev.7.1`, the three pipeline phases, session history, replay buttons, runtime-context summary, requested deck, and raw snapshot.
- [ ] Diagnose one attack and one saving throw; confirm the rolling Actor is `source`, the hostile opponent/origin is `target`, and HP/level data matches the current Actors.
- [ ] Place Party and Opposition tokens at 5-foot and extended melee reach, diagnose a roll, and confirm the threat count and selected Strike are correct.
- [ ] Verify an ally, neutral token, dead/defeated enemy, ranged-only enemy, out-of-reach enemy, undetected/unnoticed roller, and wall-blocked enemy are rejected with the expected diagnostic reason.
- [ ] Verify concealed and hidden rollers still count as threatened, while an invisible roller without an explicit relative state does not.
- [ ] Verify Tiny, Large, and elevated tokens use occupied spaces rather than token centers.
- [ ] Open an editable pack and verify all five deck tabs (`Standard`, `Angriff`, `Zähigkeit`, `Reflex`, `Wille`) show independent card counts and lists.
- [ ] Move or create one card in each specialized deck; verify attack cards cannot retain a saving-throw category and save-deck cards cannot retain an attack category.
- [ ] Draw an attack, Fortitude, Reflex, and Will result; verify each specialized deck is isolated, and verify a legacy `cards`-only pack remains eligible through its default deck.
- [ ] Remove a specialized deck from one pack and confirm only that pack falls back to its default deck while other specialized and legacy packs remain eligible.
- [ ] Open an editable card, enable conditions, create a nested `all`/`any` tree, change field types and operators, save, reopen, and confirm the tree is identical.
- [ ] Test a provider-defined custom path once as a number and once as text; confirm the configured type and value survive rerendering and JSON export/import.
- [ ] Run the condition test workbench with matching, failing, and unavailable values; confirm no Actor, Token, Combat, or Item data changes.
- [ ] Create contradictory constraints in an `all` group and confirm the editor warns without blocking deliberately unusual cards.
- [ ] Verify the editor target-role hints identify `source` as acting/saving Actor and `target` as hostile opponent/origin.
- [ ] Register a temporary higher-priority Context Provider under a unique id, resolve it explicitly, remove it, and confirm the protected `core-pf2e` provider remains available.
- [ ] Register a typed Condition Provider and confirm its number and enum fields appear in the visual Card Editor with the supplied fallback labels.
- [ ] Register one successful and one deliberately failing Diagnostic Provider; confirm both appear in the Diagnostics GUI and the failing provider does not block card analysis.
- [ ] Attempt a foreign pack/provider replacement and a core condition-field collision; confirm the registries remain unchanged and `extension.diagnostics.list({ status: "error" })` contains stable conflict codes.
- [ ] Verify an incompatible capability requirement fails before any pack or provider is registered.
- [ ] Verify world Item update, copy, Actor application, and unmanaged-rule preservation.
- [ ] Build an effect with inherited and overridden component durations; verify world creation, Actor application, opening either segment, updating the bundle, expiration, and definition-based removal.
- [ ] Create the ZIP with a single top-level `pf2e-critical-forge/` directory.
- [ ] Test the ZIP with `unzip -t` or an equivalent archive test.
- [ ] Install the exact ZIP in a clean user-data directory and repeat the startup smoke test.

## Publication metadata

The repository URLs for `url`, `manifest`, and `download` should be added to `module.json` only when the final hosting locations are known. Do not publish placeholder URLs.

## After tagging

- [ ] Attach the exact tested ZIP to the release.
- [ ] Point the hosted manifest at the same tagged version and archive.
- [ ] Record known limitations in the release notes.
- [ ] Keep the previous stable archive available for rollback.

- [ ] Simulate one eligible mechanical card and confirm no Actor, Token, Item, ChatMessage, combat, or setting is modified.
- [ ] Repeat the stored snapshot and confirm an unchanged report is marked reproducible.
- [ ] Change an Actor value, re-evaluate the current state, and confirm differences are listed.
- [ ] Copy a report and verify the JSON contains report version, phases, candidates, simulation/application, and replay fields.
- [ ] Confirm closing/reloading the client clears the session-only diagnostic history.
