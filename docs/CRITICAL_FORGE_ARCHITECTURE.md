# Critical Forge Architecture

Version 0.5.6 adds a thin, manual presentation and application layer around the headless Critical Forge domain and PF2e Context Adapter. It deliberately contains no automatic roll hooks or automatic card choice.

```text
Manual Chat Diagnostic UI ── explicit message input
        │
        ▼
PF2e Context Adapter
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
User-confirmed effect application (future)
        │
        ▼
Effect Engine
```

## Subsystems

```text
critical-forge/
├─ adapters/pf2e/       PF2e data readers and diagnostic context adapter
├─ diagnostics/          manual message resolution, diagnostic service, and workbench UI
├─ presentation/         effect summaries, ChatMessage publication, visibility, and manual application
├─ core/                 bundled architecture test pack
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
- The selector never reads Foundry documents directly.
- Card registration is independent from the Critical Forge world setting.
- Localization happens only when a consumer asks for presentation data.
- Mechanical consequences remain Effect Definitions and are handled by the Effect Engine.
- The manual diagnostic UI evaluates candidates but performs no weighted selection.
- The preview publisher renders one explicitly chosen candidate into a ChatMessage.
- Preview ChatMessages store structured card and Effect Definition flags, not application state.
- No effect is applied automatically or manually in this milestone.

## Adapter boundary

The PF2e adapter may inspect only documents explicitly supplied by its caller. It normalizes PF2e roll outcomes, weapon data, NPC melee damage, traits, actor metadata, and roll options into neutral data. It never selects a card, registers a hook, renders HTML, or applies an effect. Further spell- or skill-specific readers can extend this adapter without adding PF2e document knowledge to the card domain.

## Presentation boundary

The preview service accepts a card plus neutral context, adapter metadata, and an optional source ChatMessage. It materializes the card's existing Effect Definition, creates localized human-readable summaries, and renders a dedicated Handlebars template. The rendered HTML is never parsed back into mechanics. Future application controls will read the structured module flags stored on the preview ChatMessage.
