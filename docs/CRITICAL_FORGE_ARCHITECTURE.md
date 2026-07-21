# Critical Forge Architecture

Version 0.7.0 extends the thin Foundry automation shell to weapon attacks, spell attacks, and saving throws. The hook owns only message detection, GM prompting, and publication; context adaptation, card matching, trigger policy, profile weighting, presentation, and effect application remain separate services.

```text
Foundry createChatMessage Hook ── new supported PF2e roll messages
        │
        ├── prompt / automatic policy
        │
Manual Chat Diagnostic UI ── explicit message input
        │
        ▼
Context Provider Registry
        │
        ▼
PF2e Context Adapter
        ├── Runtime Snapshot → Diagnostics
        │
        ▼
Selection Context
        │
        ▼
Card Matcher → Candidate Report → Weighted Selector
        │                         (headless API only)
        ▼
Localized Card / Materialized Effect Definition
        │
        ▼
Manual Preview Publisher → Foundry ChatMessage
        │
        ▼
User-confirmed effect application
        │
        ▼
Effect Engine
```

## Subsystems

```text
critical-forge/
├─ adapters/pf2e/       PF2e data readers, provider, adapter, and snapshot reduction
├─ context/              snapshot builder, provider registry, and resolver
├─ automation/           primary-GM supported-roll pipeline
├─ diagnostics/          manual message resolution, diagnostic service, and workbench UI
├─ editor/               world-managed pack store, transfer, UI, and Effect Forge bridge
├─ extensions/           ownership-safe optional-module pack registration
├─ presentation/         effect summaries, ChatMessage publication, visibility, and manual application
├─ profile/              tone and impact weighting
├─ trigger/              behavior and natural-result policy
├─ core/                 bundled localized test-card library
├─ localization/         key resolution and Effect materialization
├─ registry/             pack and card registries
├─ schema/               normalization and validation
├─ selection/            matching and weighted selection
├─ constants.js
├─ critical-forge.js     singleton composition and registration service
└─ utils.js
```

## Boundary rules

- Cards contain no rendered HTML.
- The selector consumes plain JavaScript data only.
- Existing selection contexts remain the selector's sole input during Phase 1.
- Runtime snapshots are immutable, JSON-serializable observations and never contain Foundry documents.
- Context providers are additive and selected by system, explicit id, and priority.
- The selector never reads Foundry documents directly.
- Card registration is independent from the Critical Forge world setting.
- Optional-module registration is bound to a source module and cannot replace or remove foreign packs.
- Multi-pack extension registration is atomic across the full batch.
- Localization happens only when a consumer asks for presentation data.
- Mechanical consequences remain Effect Definitions and are handled by the Effect Engine.
- The manual diagnostic UI evaluates candidates but performs no weighted selection.
- The preview publisher renders one explicitly chosen candidate into a ChatMessage.
- Preview ChatMessages store structured card and Effect Definition flags, not application state.
- No effect is ever applied automatically. Manual application remains a separate GM-confirmed presentation service.

## Adapter boundary

The PF2e adapter may inspect only documents explicitly supplied by its caller, plus current scene/combat references when reducing a diagnostic snapshot. It normalizes PF2e roll outcomes, weapon and spell data, saving-throw context, NPC melee damage, traits, actor metadata, and roll options into neutral data. It also reduces documents to a plain runtime snapshot. It never selects a card, renders HTML, or applies an effect. The provider registry is the only registration boundary.

## Presentation boundary

The preview service accepts a card plus neutral context, adapter metadata, and an optional source ChatMessage. It materializes the card's existing Effect Definition, creates localized human-readable summaries, and renders a dedicated Handlebars template. The rendered HTML is never parsed back into mechanics. Future application controls will read the structured module flags stored on the preview ChatMessage.

## Trigger and profile layer

Version 0.5.7 introduces two headless services between PF2e context adaptation and card publication:

```text
PF2e Context Adapter
        ↓
Critical Trigger Policy
        ↓
Card Profile Weighting
        ↓
Card Selector
        ↓
Chat Card / Redraw
```

The trigger policy knows behavior (`disabled`, `prompt`, `automatic`) and scope (`all`, `natural`). A separate automation service registers the Foundry hook and delegates every decision to that policy. Natural scope requires both the natural d20 value and the final PF2e degree of success.

The profile service weights `tone` and `impact` metadata. It never compiles effects and never changes eligibility produced by mechanical filters.
