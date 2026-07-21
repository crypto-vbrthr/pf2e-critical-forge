# Changelog

## 0.9.4-dev.5

- Added five fixed Critical Card deck types: `default`, `attack`, `fortitude`, `reflex`, and `will`.
- Added per-pack deck resolution before normal card matching: a requested specialized deck is used when populated, otherwise that pack falls back to `default`, and a pack with neither contributes no candidates.
- Preserved complete legacy behavior by normalizing every card without `deckType` and every historical root `cards` array into the `default` deck without changing Critical Card or Card Pack schema version `1`.
- Added optional authoring input through `pack.decks`, accepting either arrays or `{ cards: [...] }` objects, while normalized packs expose one flattened immutable `cards` list plus a deterministic deck index.
- Added fixed deck tabs and deck assignment to the Card Pack Editor. New cards are created in the active deck, and incompatible attack/save categories are corrected to a valid default for that deck.
- Added requested, active, and assigned deck evidence to diagnostics and exported evaluation reports.
- Added public deck discovery and resolution helpers under `api.cards.decks` plus the `multiDeckPacks` capability flag.
- Added validation for unknown deck types, category/deck mismatches, duplicate deck membership, missing indexed cards, and inconsistent normalized deck indexes.
- Updated the Card Schema, Card Packs, selection, editor, diagnostics, extension, import/export, migration, architecture, API, testing, README, changelog, and release-checklist documentation.
- Added Multi-Deck normalization, fallback, isolation, selection, editor, API, diagnostics, import/export, extension, and legacy-regression tests.
- The complete suite contains **291** passing tests.

## 0.9.4-dev.4

- Added Diagnostics 2.0 with versioned, immutable, JSON-serializable evaluation reports.
- Split each report into context-resolution, card-selection, and effect-application phases with explicit status values.
- Added a bounded in-memory session history of up to 100 reports, newest first, with source-message, origin, validity, candidate count, and selected-card summaries.
- Added exact snapshot replay and current-world-state replay with candidate-pool, validity, and total-weight comparisons.
- Added safe per-card application simulation that resolves the configured source/target role, validates the materialized Effect Definition against the Actor, summarizes duration and components, and never creates or updates Foundry documents.
- Added export/copy of the complete report including module/report versions, source references, context, metadata, snapshot, diagnostics, candidates, selection, simulation, actual application audit, and replay comparison.
- Connected automatic card selection and successful GM-confirmed effect application to the session report history.
- Added public Diagnostics 2.0 capabilities and APIs under `api.cards.diagnostics` without removing or changing existing diagnostic methods.
- Kept Critical Card schema `1`, Card Pack schema `1`, Effect Definition schema `2`, and all existing pack/extension APIs unchanged.
- Added report, history, replay, simulation, UI-contract, automation/application integration, and public-API regression tests.
- The complete suite contains **275** passing tests.

## 0.9.4-dev.3.1

- Fixed Card Pack Editor context-condition actions jumping the main workspace back to the top after a rerender.
- Preserved independent scroll positions for the pack list, card list, and card-editing workspace when conditions are enabled, added, grouped, removed, retested, cleared, or changed through a rerendering field.
- Reused the tested scroll-state mechanism already employed by the Effect Forge, including safe clamping when rendered content becomes shorter.
- Added an application-level regression test that replaces the rendered editor DOM and verifies exact scroll restoration across enabling conditions and adding a condition.
- Kept all Critical Card, Card Pack, Effect Definition, public API, and extension compatibility versions unchanged.
- The complete suite contains **261** passing tests.

## 0.9.4-dev.3

- Added Phase 3 of the Critical Context Engine: a visual condition editor inside the Card Pack Editor without changing Critical Card or Card Pack schema version `1`.
- Added an editable nested condition tree with `all`/`any` groups, add/remove controls, a curated runtime-snapshot field catalog, and operator choices constrained by field type.
- Added explicit, optional `valueType` metadata for provider-defined custom field paths so text, numeric, boolean, and text-list operands round-trip without ambiguous coercion, including unary `exists`/`notExists` conditions.
- Added a synthetic condition test workbench for roll category, save type, participant levels, Hit Point ratios, traits, battlefield threat count, DC, round, and turn. Tests evaluate the real Condition Engine without reading or mutating Foundry documents.
- Added non-blocking contradiction warnings for impossible direct constraints in `all` groups, including incompatible equality, existence, containment, and numeric-range combinations.
- Clarified Effect Forge target roles directly in the editor: `source` is the acting or saving Actor, while `target` is the hostile opponent or origin.
- Added the public `api.cards.conditions.editor` catalog, simulator, contradiction analysis, and the `conditionEditor` capability flag; public API version is now `0.9.4`.
- Added Application-level Card Pack Editor tests in addition to pure model, template, API, persistence, import/export, registry, and selection regression coverage.
- Preserved legacy cards and extension packs unchanged: `conditions: null` remains the default, existing condition trees round-trip, no migration runs, and all schema versions remain unchanged.
- Updated the Card Editor, Condition Engine, Context Engine, diagnostics, API, architecture, import/export, migration, extension, testing, README, changelog, and release-checklist documentation.
- The complete suite contains **260** passing tests.

## 0.9.4-dev.2

- Added Phase 2 of the Critical Context Engine without changing Critical Card or Card Pack schema version `1`.
- Added optional card-level `conditions` with deeply nested `all`/`any` groups and the operators `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `notContains`, `exists`, and `notExists`.
- Added normalization, immutable canonical output, structural validation, depth/node safety limits, and protected field-path resolution for condition trees.
- Integrated condition evaluation into matching and weighted selection using the immutable runtime snapshot from Phase 1. Conditions only determine eligibility and do not alter specificity or weight.
- Preserved legacy behavior: cards without `conditions` remain eligible without a snapshot, existing pack data needs no migration, and the schema versions remain unchanged.
- Extended Critical Diagnostics with per-card condition evidence showing field, operator, expected value, actual value, match state, and unavailable snapshot fields for both eligible and rejected cards.
- Stored runtime snapshots in preview flags (preview schema `4`) and reused them during redraws so later HP, position, or combat changes cannot silently change the original draw context. Older preview flags remain readable.
- Added the public `api.cards.conditions` API and set `api.cards.capabilities.contextConditions` to `true`; public API version is now `0.9.3`.
- Ensured the Card Pack Editor, cloning, JSON import/export, world persistence, registry hydration, selection, preview, and compilation preserve condition trees even before the visual condition editor arrives in Phase 3.
- Added Condition Engine, selector integration, diagnostics UI, automation snapshot propagation, redraw snapshot reuse, public API, and full editor-roundtrip regression tests.
- Updated the user, API, schema, selection, diagnostics, automation, preview, editor, extension, architecture, import/export, and testing documentation.

## 0.9.4-dev.1

- Added Phase 1 of the Critical Context Engine without changing Critical Card or Card Pack schema version `1`.
- Added immutable, JSON-serializable runtime snapshots containing roll, item, participant, Hit Point, condition, position, combat, battlefield-placeholder, provenance, and diagnostic data.
- Added the public Context Builder, Context Resolver, prioritized Context Provider Registry, provider replacement/removal operations, and explicit capability flags.
- Registered the built-in `pf2e/core-pf2e` provider and preserved the existing neutral selection context as the only input consumed by current card matching.
- Extended the PF2e adapter with reference-only fallbacks and explicit roller/opponent aliases while preserving the established save convention: the saving Actor is `source`, the hostile origin is `target`.
- Extended the Critical Diagnostic workbench and copied JSON report with provider/version information, roller and opponent summaries, health ratio, save type, battlefield state, and the complete runtime snapshot.
- Added a visible `Kontext-Fundament · 0.9.4-dev.1` build marker to the diagnostic toolbar so the development version is recognizable inside Foundry.
- Added documentation for snapshot schema `1`, provider contracts, capability detection, compatibility guarantees, and the intentionally deferred threat-analysis and condition-engine work.
- Increased the PF2e Context Adapter version to `1.3.0` and the public API version to `0.9.2`; Effect Definition schema remains `2`, and Critical Card/Card Pack schemas remain `1`.
- Added regression coverage for Context Builder normalization, provider priority and replacement, API registration, actor health and conditions, saving-throw participant roles, reference-only contexts, battlefield placeholders, and diagnostic presentation data.
- The complete suite contains **227** passing tests.

## 0.9.4-dev

- Fixed the remaining saving-throw target leak: a correctly resolved rolling Actor is now authoritative over contradictory `flags.pf2e.context` actor or token references.
- Prevented application-time source-message re-resolution from replacing a correct stored saving-throw recipient with the originating caster.
- Save-card application now detects collapsed source/origin metadata and only uses the live-message fallback when the stored participant snapshot is ambiguous.
- Increased the PF2e Context Adapter version to `1.2.2`; public API version remains `0.9.1`, Effect Definition schema remains `2`, and Critical Card/Card Pack schemas remain `1`.
- Added regression tests for contradictory PF2e save references and for preserving a correct stored defender during application.
- The complete suite contains **214** passing tests.

## 0.9.3-dev

- Fixed the live PF2e spell-save layout in which the root chat context and speaker still identify the caster while `flags.pf2e.context.target` identifies the creature that rolled the saving throw.
- Saving-throw participant resolution now distinguishes the rolling creature from the effect origin across root-context, origin, target, selected-token, and speaker fallbacks.
- Added an application-level regression path from a real-shaped PF2e save message through context adaptation to the actor receiving the Critical Forge effect.
- Increased the PF2e Context Adapter version to `1.2.1`; public API version remains `0.9.1`, Effect Definition schema remains `2`, and Critical Card/Card Pack schemas remain `1`.
- The complete suite contains **212** passing tests with **93.41%** measured line coverage.

## 0.9.2-dev

- Fixed PF2e saving-throw actor resolution when a spell-origin message still exposes the caster as its generic speaker, message actor, or message token.
- Saving throws now prefer the actor and token recorded in `flags.pf2e.context` as Critical Forge's `source`, which is the creature that actually rolled the save.
- Positive effects from critically successful saving-throw cards therefore apply to the successful defender rather than the originating caster; critically failed save effects continue to affect the rolling creature as intended.
- Preserved the caster or other originating creature as the saving throw's `target` context for card filtering, preview display, and effects that deliberately reference that role.
- Added a regression test using a spell save whose generic message references point at the caster while the PF2e save context points at the defender.
- The complete suite now contains **210** passing tests with **93.34%** measured line coverage. Module version increased to `0.9.2-dev`; public API remains `0.9.1`; Effect Definition schema remains `2`; Critical Card and Card Pack schema versions remain `1`.

## 0.9.1-dev

- Added the optional Critical Card filter `excludedAttackTraits`. A card is rejected when any listed slug is present in the normalized attack context.
- Allowed positive and negative attack filters to be combined, such as `attackTraits: ["ranged"]` with `excludedAttackTraits: ["spell"]`, to target ranged weapon attacks while excluding spell attacks.
- Extended card normalization, validation, immutable core defaults, the Card Pack Editor, JSON import/export roundtrips, diagnostics, and external extension-pack registration with the new filter.
- Preserved Critical Card schema version `1`; older cards and packs normalize the omitted filter to an empty array and remain compatible.
- Added German and English editor labels, rejection diagnostics, API documentation, and regression tests.
- The complete suite now contains **209** passing tests with **93.31%** measured line coverage. Module version increased to `0.9.1-dev`; public API version increased to `0.9.1`; Effect Definition schema remains `2`; Critical Card and Card Pack schema versions remain `1`.

## 0.9.0-dev

- Increased the Effect Definition schema from `1` to `2` and added optional `duration` overrides to every component type.
- Preserved existing behavior by inheriting the global Effect Definition duration whenever a component omits its own duration.
- Added duration normalization, validation with component-index reporting, compiler duration resolution, and deterministic grouping by effective duration.
- Added `api.effects.toItemSources()` and `api.effects.createItems()` for logical effects that require several native PF2e Effect Items.
- Kept `toItemSource()` strict: it now throws `EffectDurationSplitError` when a definition needs more than one native Item, preventing silent loss of components.
- Compiled differing durations into linked Item bundles with a shared bundle id, segment metadata, the complete source definition, and one Rule Element subset per duration.
- Updated Actor application, world Item creation, Item updates, definition-based removal, unmanaged-rule preservation, and manual Actor drops to treat duration segments as one logical effect.
- Updated Effect Forge with an optional per-component duration panel, inherited-duration summaries, multi-source compilation previews, and plural Item-creation feedback.
- Added schema migration `1 → 2`; older definitions inherit their former global duration automatically, while explicit component overrides are preserved.
- Added documentation and regression coverage for Builder operations, validation, compilation, native source splitting, world and embedded Item creation, bundle updates, Item round trips, migrations, and JSON transfer.
- The complete suite now contains **207** passing tests with **93.29%** measured line coverage. Module version increased to `0.9.0-dev`; public API version increased to `0.9.0`; Effect schema version increased to `2`; Critical Card and Card Pack schema versions remain `1`.

## 0.8.0-rc.2

- Added a dedicated module-bound extension API at `api.cards.extensions.forModule(moduleId)` for optional Critical Forge card-library modules.
- Added atomic registration of one or several external packs through `registerPack()` and `registerPacks()`. A failed batch leaves the previous registry state untouched.
- Forced external ownership metadata from the bound module id so extension packs remain protected and cannot masquerade as world-managed editor packs.
- Prevented an extension from replacing or unregistering the core pack or packs owned by another module, even when `{ replace: true }` is requested.
- Added extension-scoped lookup, listing, single-pack removal, and `unregisterAll()` without exposing unrelated packs.
- Added the `pf2eCriticalForgePacksChanged` hook for integrations that need to react when extension packs enter, leave, or are replaced in the live registry.
- Added complete extension-module documentation and regression coverage for multi-pack registration, ownership enforcement, disabled packs, replacement, rollback safety, change hooks, and clean removal.
- The complete suite now contains 193 passing tests with 92.88% measured line coverage. Module and bundled core-pack versions increased to `0.8.0-rc.2`; public API version increased to `0.8.0`; Effect, Critical Card, and Card Pack schema versions remain unchanged.

## 0.8.0-rc.1

- Froze the feature set after the 96-card attack, spell-attack, and saving-throw expansion.
- Hardened world-managed Card Pack persistence so live registries are updated transactionally and restored if the Foundry world-setting write fails.
- Prevented corrupt stored world data from replacing protected packs or protected card IDs during startup synchronization.
- Added regression coverage for the **Paket aktivieren** switch: disabled packs remain editable and exportable but are excluded from candidates and weighted selection until re-enabled.
- Added an optional-extension-module lifecycle test covering disabled registration, activation through pack replacement, transactional collision rollback, selection, and clean unregistration.
- Replaced the historical release-candidate document with the complete Effect Forge and Critical Forge 0.8.0 manual test matrix.
- Documented the intended architecture for future optional card-library modules without adding a hard dependency or changing the public API.
- The complete suite now contains 187 passing tests with 92.80% measured line coverage. Module and bundled core-pack versions increased to `0.8.0-rc.1`; public API and schema versions remain unchanged.

## 0.7.1-dev

- Added 24 localized playtest cards, increasing the bundled core library from 72 to 96 cards.
- Expanded critical spell hits, critical spell fumbles, critically successful saving throws, and critically failed saving throws from 6 to 12 cards each.
- Added generic spell fallbacks plus focused cards for acid, cold, electricity, fire, light, and mental spell traits.
- Added additional short-lived spell boons, vulnerabilities, sensory effects, control effects, and caster backlash results.
- Added a second focused result for Reflex, Fortitude, and Will in both saving-throw categories.
- Added a spell-specific critically failed saving-throw card for recognized arcane, divine, occult, or primal effects.
- Added regression coverage for generic spell fallback pools, tradition/trait-specific expansion, every save type, and spell-specific save failures.
- The complete suite now contains 183 passing tests with 92.68% measured line coverage.
- Module and bundled core-pack versions increased to `0.7.1-dev` and `0.7.1`; public API and schema versions remain unchanged.

## 0.7.0-dev

- Added four Critical Card categories: `spellCriticalHit`, `spellCriticalFumble`, `savingThrowCriticalSuccess`, and `savingThrowCriticalFailure`.
- Increased PF2e Context Adapter version to `1.2.0`; it now distinguishes weapon attacks, spell attacks, and saving throws while retaining the final degree of success and natural d20 result separately.
- Added normalized saving-throw type, spell-tradition, spell-trait, spell-rank, and roll-family metadata.
- Added independent behavior and trigger-scope settings for critical spell hits, critical spell fumbles, critically successful saves, and critically failed saves.
- Natural trigger scope still requires both a natural 20/1 and the matching final critical result.
- Extended the automatic primary-GM roll pipeline to supported spell attacks and saving throws while continuing to reject ordinary skill checks, damage rolls, and noncritical outcomes.
- Extended the Card Pack Editor and card schema with save-type, spell-tradition, and spell-trait filters.
- Extended diagnostics to display roll family, save type, spell traditions, spell traits, and the configured trigger result.
- Added 24 localized playtest cards: six for each new category, increasing the bundled core library from 48 to 72 cards.
- Added regression tests for spell/save context adaptation, matching, trigger semantics, automation, localization, materialization, and compilation.
- The complete suite now contains 181 passing tests with 92.46% measured line coverage.
- Module and public API versions increased to `0.7.0-dev` and `0.7.0`; Effect, Critical Card, and Card Pack schema versions remain unchanged.

## 0.6.2-dev

- Added deterministic collision handling for newly created and duplicated card IDs, including the deliberately hostile case where Foundry returns the same random suffix repeatedly.
- Card creation, individual duplication, protected-pack duplication, and protected-pack import now share the same explicit set of already-used IDs.
- Added an end-to-end Card Editor regression test covering a protected core-card template, Effect Forge handoff, portable JSON export/import, world-setting persistence, live registry selection, Critical Card preview materialization, and Effect Engine compilation.
- Added regression coverage proving protected cards remain read-only at the source while their editable copies receive world ownership metadata and distinct IDs.
- The complete suite now contains 174 passing tests.
- Module version increased to `0.6.2-dev`; public API and schema versions remain unchanged.

## 0.6.1-dev

- Fixed the Effect Forge card-editing handoff missing its visible **Use for Card** / **Zur Karte übernehmen** action.
- External Effect Forge sessions now show a focused footer with Validate, Compile, return-to-card, and Close actions.
- Hidden unrelated Create Item, Update Item, and Apply to Tokens actions while editing a Critical Card effect.
- Added a template regression test for the external commit control.
- Module version increased to `0.6.1-dev`; public API and schema versions remain unchanged.

## 0.6.0-dev

- Added a GM-only visual Critical Card Pack Editor beside the chat diagnostic launcher.
- Added world-persistent custom card packs stored in a hidden Foundry world setting and synchronized into the live Pack and Card Registries.
- Bundled and external packs remain read-only but can be duplicated or used as templates for editable world packs.
- Added card editing for category, tone, impact, weight, tags, all existing filter groups, fallback text, and optional localization keys.
- Added dedicated Effect Forge handoff mode for creating and editing a card’s mechanical Effect Definition without creating a world Item.
- Added portable `pf2e-critical-forge.card-pack` JSON wrappers plus raw-pack import support, file download, file import, clipboard copy, and clipboard import.
- Added collision protection for protected pack IDs and globally indexed card IDs.
- Added public `api.ui.openCardPackEditor()`, `api.ui.openEffectForgeDefinition()`, and `api.cards.packEditor` helpers.
- Added `docs/CARD_EDITOR.md` and regression tests for editor defaults, card cloning, pack round-trips, transfer errors, delimited fields, and Effect Forge bridging.
- The complete suite now contains 169 passing tests with 91.79% measured line coverage.
- Public API version increased to `0.6.0`; Effect, Critical Card, and Card Pack schema versions remain unchanged.

## 0.5.9-dev

- Replaced the six architecture samples with a localized 48-card core test library.
- Added 30 critical-hit cards: eight each for slashing, piercing, and bludgeoning damage plus six generic results.
- Added 18 critical-fumble cards: six melee, six ranged, and six generic results.
- Distributed cards across neutral, serious, dramatic, and humorous tones and across narrative, light, moderate, and strong impacts so every profile has meaningful choices.
- Added short-lived conditions, movement penalties, attack and AC modifiers, temporary Hit Points, weaknesses, persistent bleed, and narrative-only outcomes while avoiding permanent injuries or automatic item destruction.
- Added stable synthetic `melee`, `ranged`, and `spell` attack traits to PF2e Context Adapter version `1.1.0` for mode-specific card filtering.
- Preserved all six previously published sample card ids for draw-history and API compatibility.
- Split bundled card data into focused files by damage type and fumble mode, backed by a shared core-card factory.
- Added `docs/CORE_CARD_LIBRARY.md` with the library matrix, profile distribution, and content boundaries.
- Added regression tests for card counts, distribution, pack validity, localization coverage, stable ids, attack-mode filtering, and adapter traits. The suite now contains 161 passing tests with 91.86% measured line coverage.
- Module version increased to `0.5.9-dev`; public API and Effect/Card schema versions remain unchanged.

## 0.5.8-dev

- Added the first automatic PF2e attack-roll hook through Foundry's `createChatMessage` document hook.
- Only the primary active GM processes new roll messages, preventing duplicate prompts and cards in multi-GM worlds.
- Critical-hit and critical-fumble behavior settings now operate live: disabled, ask first, or draw automatically.
- Trigger policies continue to support every final critical result or only natural 20/1 rolls that also finish as a critical success/failure.
- Added a localized GM confirmation dialog that shows attacker, target, and attack before drawing a card.
- Added attack-message guards so skill checks, saves, and damage-roll messages do not trigger Critical Forge cards.
- PF2e message resolution now prefers source and target references stored in `flags.pf2e.context`, with the rolling user's current targets as a fallback.
- Added persistent recent-card history for automatic draws, bounded by the existing history-size setting, with safe fallback when the history exhausts all candidates.
- Source roll messages receive an audit flag recording ignored, dismissed, no-card, or published automation outcomes.
- Added public `api.cards.automation` helpers for manual processing, inspection, and attack-report checks.
- Added six regression tests for automatic drawing, prompt dismissal, attack filtering, multi-GM ownership, damage-message rejection, and PF2e flagged-target resolution.
- Public API version increased to `0.5.6`; Effect and card schemas remain unchanged.

## 0.5.7-dev

- Added card `tone` and `impact` metadata with validated values and localized chat-card badges.
- Added relaxed, balanced, dramatic, brutal, and custom card profiles that weight tone and mechanical impact without hard-excluding other eligible cards.
- Added independent critical-hit and critical-fumble behavior settings: disabled, prompt, or automatic.
- Added independent trigger scopes for all critical results or only natural 20/1 results that also finish as a critical success/failure.
- PF2e Context Adapter metadata now exposes the natural d20 result separately from the final degree of success.
- Added headless trigger-policy and profile APIs through `api.cards.triggers` and `api.cards.profiles`.
- Added GM-only **Draw again** controls for unapplied cards, bounded draw history, recent-card avoidance, and fallback selection when the configured history exhausts the candidate pool.
- Redrawing replaces the existing chat card, resets application state, and preserves source/target context and visibility.
- Added world settings for profiles, custom tone/impact preferences, redraw permission, and draw-history size.
- No automatic Foundry roll hook is enabled yet; this version prepares and tests the policy layer first.
- Added regression tests for profile weighting, natural-roll trigger semantics, PF2e d20 extraction, redraw history, and redraw application guards.
- Public API version increased to `0.5.5`; Critical Card Preview format increased to version `3`; Effect and card schemas remain unchanged.

## 0.5.6-dev

- Added configurable Critical Forge card visibility with `GM Blind` as the default and optional GM-only, public, or self-only modes.
- Critical result cards now use Foundry 14 `ChatMessage.applyMode()` semantics before creation.
- Added a manual **Apply effect** control to cards with mechanical consequences.
- Effect application is GM-only, resolves the stored source or target Actor again, and reruns target-aware Effect Engine validation before changing an Actor.
- Added duplicate-application and in-progress protection.
- Successful application records timestamp, GM, target Actor, and created Effect Item ids in ChatMessage flags and updates the card status.
- Public cards hide the apply control from non-GM users.
- Added public visibility and application helpers through `api.cards`.
- Added regression tests for visibility payloads, target resolution, permission checks, validation failures, audit flags, and duplicate prevention.
- The complete suite now contains 141 passing tests with 92.12% measured line coverage.
- Public API version increased to `0.5.4`; Critical Card Preview format increased to version `2`; Effect and card schemas remain unchanged.

## 0.5.5-dev

- Added a manual **Preview in chat** action to every eligible card in Critical Forge Diagnostics.
- Added localized result chat cards with category, narrative description, effect name, effect target, duration, and summaries for all built-in Effect components.
- Preview cards contain no apply controls and perform no Actor, Token, Item, or source-message changes.
- Stored versioned preview data, selection context, adapter metadata, and the materialized Effect Definition in module ChatMessage flags for a future confirmation workflow.
- Added public `api.cards.preparePreview()`, `publishPreview()`, `summarizeEffect()`, and `previewVersion` capabilities.
- Added a dedicated Handlebars chat-card template and chat-safe styling.
- Added `docs/CRITICAL_CARD_PREVIEW.md` and updated diagnostics, API, architecture, testing, and README documentation.
- Added regression tests for localized effect summaries, preview data, ChatMessage payloads, structured flags, and public API exposure.
- The complete suite now contains 136 passing tests with 93.27% measured line coverage.
- Public API version increased to `0.5.3`; Effect, Critical Card, and Card Pack schema versions remain unchanged.

## 0.5.4-dev

- Fixed the Critical Diagnostic launcher being injected twice, including a misplaced copy in the sidebar header.
- Restricted launcher injection to the actual Foundry 14 ChatLog input part.
- Moved the inline launcher below the chat input and hardened its pointer/click handling.
- Diagnostic windows are now brought to the foreground after opening.
- Opening failures now produce a localized notification and a detailed console error.
- Added regression tests preventing parent sidebar applications from being mistaken for ChatLog.

## 0.5.3-dev

- Fixed the Critical Forge diagnostic control not appearing when Foundry 14 had already rendered the ChatLog before the module registered its hooks.
- The diagnostic launcher now resolves the live `ui.chat` ApplicationV2 element after `ready` and reinjects itself when the sidebar DOM is replaced.
- Added Foundry 14-specific `renderChatLog`, `activateChatLog`, and header-control integration with generic ApplicationV2 fallbacks.
- Added a persistent inline launcher near the chat input plus a native ChatLog header control fallback.
- Added regression tests for ChatLog recognition, ApplicationV2 root resolution, input-part placement, and duplicate header-control prevention.

## 0.5.2-dev

- Added a GM-only manual Critical Forge diagnostic workbench without automatic roll hooks.
- Added selection and drag-and-drop loading of existing PF2e chat messages.
- Added real-message resolution for speaker Actors, source Tokens, attack Item UUIDs, the primary roll, and exactly one selected target.
- Added visual inspection of normalized context, adapter metadata, stable diagnostics, eligible cards, rejected cards, matched filters, specificity, and effective weights.
- Added copyable JSON diagnostic reports.
- Added public `api.cards.diagnose()`, `api.cards.diagnostics.listMessages()`, `api.cards.diagnostics.resolveMessageInput()`, and `api.ui.openCriticalDiagnostics()` entry points.
- Added a Chat sidebar button when Critical Forge is enabled. The button performs no analysis until the GM explicitly chooses a message.
- Added headless diagnostic-service and chat-message-resolver tests.
- Added `docs/CRITICAL_DIAGNOSTICS.md` and updated API, adapter, architecture, testing, and README documentation.

## 0.5.1-dev

- Added the first headless PF2e Context Adapter without Foundry hooks or Critical Forge UI integration.
- Added readers for PF2e degree of success, chat flags, weapons, selected versatile/modular damage, NPC melee damage rolls, strikes, actors, tokens, and roll options.
- Added neutral context output for category, damage types, weapon groups, attack traits, source traits, and target traits.
- Added diagnostic metadata for roll, source, target, attack, provenance, and unresolved optional data.
- Added stable adapter diagnostics and non-throwing reports for incomplete input.
- Added public `api.cards.adapters.pf2e.createContext()` and `api.cards.createContext()` entry points.
- Added dedicated PF2e Context Adapter documentation and architecture updates.
- Added regression tests for explicit data, PF2e weapon/actor extraction, versatile damage, NPC melee attacks, roll-option fallback, degree mapping, invalid input, and public API exposure.

## 0.5.0-dev

- Added the first headless Critical Forge architecture without Foundry UI or roll-hook integration.
- Added versioned Critical Card and Card Pack schemas with immutable normalization and structured validation.
- Added transactional Pack Registry and globally indexed Card Registry.
- Added filter matching for damage types, weapon groups, attack traits, source traits, target traits, and exclusions.
- Added transparent candidate reports, specificity weighting, deterministic random injection, and recent-card exclusion.
- Added localization resolution for card titles, descriptions, and effect names with fallback text.
- Added materialization of card effect templates into valid immutable Effect Definitions for the existing Effect Engine.
- Added a small localized `core` test pack covering slashing, piercing, bludgeoning, generic hits, and fumbles.
- Replaced the placeholder public card API with registration, validation, lookup, matching, selection, localization, and materialization functions.
- Added dedicated Critical Forge architecture, card schema, card pack, and selection documentation.
- Added automated tests for card schemas, registries, selection, localization, and effect materialization.

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
