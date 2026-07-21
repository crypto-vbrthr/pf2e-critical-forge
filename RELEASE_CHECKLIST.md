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
- [ ] Register two external test packs through `api.cards.extensions.forModule(moduleId).registerPacks()`, replace one, call `unregisterAll()`, and confirm core and unrelated packs remain untouched.
- [ ] Open Critical Diagnostics and confirm the toolbar shows `Bedingungs-Engine · 0.9.4-dev.2`, the runtime-context summary, and the raw snapshot.
- [ ] Diagnose one attack and one saving throw; confirm the rolling Actor is `source`, the hostile opponent/origin is `target`, and HP/level data matches the current Actors.
- [ ] Register a temporary higher-priority Context Provider under a unique id, resolve it explicitly, remove it, and confirm the protected `core-pf2e` provider remains available.
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
