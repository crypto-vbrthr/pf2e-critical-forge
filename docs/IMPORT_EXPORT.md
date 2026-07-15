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
    "moduleVersion": "0.3.3-dev",
    "apiVersion": "0.3.1",
    "schemaVersion": 1
  },
  "definition": {},
  "unmanagedRules": []
}
```

`definition` is the complete Effect Definition. `unmanagedRules` contains advanced or third-party PF2e Rule Elements that were preserved while editing an existing Item.

## Import

The GUI accepts imports from a JSON file or from the clipboard. Importing:

1. parses the export envelope or a raw Effect Definition;
2. checks the export and schema versions;
3. runs the Validation Engine;
4. opens the result as a new, unsaved effect;
5. preserves any exported unmanaged Rule Elements.

The imported effect is deliberately detached from the Item that may have produced the export. Use **Create new Item** to save it in the current world.

Raw Effect Definitions remain accepted for developer workflows:

```json
{
  "schemaVersion": 1,
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
      "value": 5
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
```

`parseImport()` does not run the Validation Engine. API consumers should call `api.effects.analyze(imported.definition)` before applying or storing imported data.

## Compatibility

The export envelope and the Effect Definition schema are versioned separately. A future schema migration service can therefore migrate definitions without changing the outer transfer format.
