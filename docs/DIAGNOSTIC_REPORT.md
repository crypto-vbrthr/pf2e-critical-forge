# Diagnostic Evaluation Report

## Version

```js
report.reportVersion === 1
```

The report schema is additive and separate from all card and effect schemas.

## Shape

```js
{
  reportVersion: 1,
  id: "critical-diagnostic-...",
  createdAt: 0,
  moduleVersion: "0.9.4-dev.6",
  origin: "manual",
  source: {
    messageId: null,
    messageUuid: null,
    label: null
  },
  valid: true,
  context: {},
  metadata: {},
  snapshot: {},
  phases: {
    context: {
      status: "ready",
      diagnostics: [],
      provider: "core-pf2e",
      snapshotVersion: 1
    },
    selection: {
      status: "ready",
      trigger: {},
      triggerPolicy: {},
      profile: {},
      counts: { eligible: 0, rejected: 0, diagnostics: 0 },
      totalWeight: 0,
      eligible: [],
      rejected: [],
      method: "analysis",
      selected: null,
      previewMessageUuid: null
    },
    application: {
      status: "not-run",
      simulation: null,
      actual: null
    }
  },
  replay: null
}
```

## Design guarantees

- JSON serializable;
- deeply immutable when returned by the core services;
- no live Foundry document instances;
- stable card IDs and source UUIDs rather than object references;
- candidate evidence preserved for later comparison;
- simulation explicitly records `mutatedDocuments: false`;
- legacy cards and extension packs require no report-schema awareness.

## Extension diagnostics

Version `0.9.4-dev.6` adds two extension-facing diagnostic channels.

Diagnostic Providers contribute serializable report evidence under:

```js
report.extensions.diagnostics
report.phases.context.extensionProviders
```

A provider result contains its id, version, source module, `ok`/`error` status, data, and isolated error metadata. The Diagnostics GUI renders each result in a collapsible section.

Registration conflicts are recorded separately in the session-only extension journal exposed through `api.extensions.diagnostics` and bound controller `extension.diagnostics`. These entries are not persisted in world settings.
