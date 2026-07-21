# Import and Export

Effect Forge can move editable effects between worlds without requiring the source Item to exist in both worlds.

## Export package

The GUI offers two equivalent export actions:

- **Export as JSON file** downloads a portable `.pf2e-critical-forge.json` file.
  The download is handed to Foundry VTT through `foundry.utils.saveDataToFile()`, so the desktop client treats it as a file download rather than trying to open a temporary `blob:` URL.
- **Copy export package** writes the same JSON to the clipboard.

Exports are allowed only for Effect Definitions that pass the Validation Engine. The package contains:

```json
{
  "format": "pf2e-critical-forge.effect",
  "formatVersion": 1,
  "exportedAt": "2026-07-15T08:00:00.000Z",
  "generator": {
    "moduleId": "pf2e-critical-forge",
    "moduleVersion": "0.9.4-dev.3.1",
    "apiVersion": "0.9.4",
    "schemaVersion": 2
  },
  "definition": {},
  "unmanagedRules": []
}
```

`definition` is the complete Effect Definition, including optional component duration overrides. `unmanagedRules` contains advanced or third-party PF2e Rule Elements that were preserved while editing an existing Item.

## Import

The GUI accepts imports from a JSON file or from the clipboard. Importing:

1. parses the export envelope or a raw Effect Definition;
2. checks the export format version;
3. migrates older Effect Definitions to the current schema in memory;
4. rejects unsupported future schema versions;
5. runs the Validation Engine in the GUI workflow;
6. opens the result as a new, unsaved effect;
7. preserves any exported unmanaged Rule Elements.

The imported effect is deliberately detached from the Item that may have produced the export. Use **Create new Item** to save it in the current world.

Raw Effect Definitions remain accepted for developer workflows:

```json
{
  "schemaVersion": 2,
  "id": "example.fire-shield",
  "name": "Fire Shield",
  "description": "<p>Protects against fire.</p>",
  "img": "icons/svg/fire.svg",
  "duration": {
    "value": 10,
    "unit": "minutes",
    "expiry": "turn-end"
  },
  "components": [
    {
      "type": "resistance",
      "resistanceType": "fire",
      "value": 5,
      "duration": {
        "value": 1,
        "unit": "rounds",
        "expiry": "turn-end"
      }
    }
  ],
  "application": {},
  "metadata": {}
}
```

## Public API

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

const packageObject = api.effects.createExport(definition, {
  unmanagedRules
});

const json = api.effects.serializeExport(definition, {
  unmanagedRules
});

const imported = api.effects.parseImport(json);
console.log(imported.definition);
console.log(imported.unmanagedRules);
console.log(imported.migration);
```

`parseImport()` performs schema migration but does not run the Validation Engine. API consumers should call `api.effects.analyze(imported.definition)` before applying or storing imported data.

## Compatibility

The export envelope and the Effect Definition schema are versioned separately. The Migration Engine upgrades older definitions without changing the outer transfer format. Future schema versions are rejected safely until a matching migration path exists.


## Critical Card Pack conditions

Card-pack exports preserve optional `conditions` trees without converting or stripping them. Import normalization validates the tree while leaving Critical Card and Card Pack schema versions at `1`. The Phase-3 Card Pack Editor opens these values in the visual condition builder, preserves explicit custom-field operand types through their serialized values, and exports the canonical tree unchanged.
