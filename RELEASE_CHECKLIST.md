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
- [ ] Verify world Item update, copy, Actor application, and unmanaged-rule preservation.
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
