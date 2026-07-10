import { MODULE_ID } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EffectForgeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pf2e-critical-forge-effect-forge",
    classes: ["pf2e-critical-forge", "effect-forge"],
    tag: "form",
    window: {
      title: "PF2E_CRITICAL_FORGE.EffectForge.Title",
      icon: "fa-solid fa-hammer"
    },
    position: {
      width: 560,
      height: "auto"
    },
    actions: {
      validateExample: EffectForgeApp.#validateExample,
      compileExample: EffectForgeApp.#compileExample,
      closeWindow: EffectForgeApp.#closeWindow
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/effect-forge/effect-forge-app.hbs`
    }
  };

  async _prepareContext() {
    const api = game.modules.get(MODULE_ID)?.api;
    return {
      apiReady: Boolean(api),
      apiVersion: api?.version ?? "—",
      schemaVersion: api?.schemaVersion ?? "—",
      components: api?.components.list() ?? []
    };
  }

  static #exampleDefinition() {
    return {
      schemaVersion: 1,
      id: "pf2e-critical-forge.example.shaken-nerves",
      name: "Erschütterte Nerven",
      duration: { value: 2, unit: "rounds", expiry: "turn-end" },
      components: [
        { type: "condition", slug: "frightened", value: 2 },
        {
          type: "modifier",
          selector: "will",
          value: -1,
          modifierType: "status"
        }
      ]
    };
  }

  static #validateExample() {
    const api = game.modules.get(MODULE_ID)?.api;
    const result = api.effects.validate(this.#exampleDefinition());

    const key = result.valid
      ? "PF2E_CRITICAL_FORGE.EffectForge.ValidationSuccess"
      : "PF2E_CRITICAL_FORGE.EffectForge.ValidationFailure";

    ui.notifications.info(game.i18n.localize(key));
    console.log(`${MODULE_ID} | Validation result`, result);
  }

  static async #compileExample() {
    const api = game.modules.get(MODULE_ID)?.api;
    try {
      const result = await api.effects.compile(this.#exampleDefinition());
      console.log(`${MODULE_ID} | Compiled example`, result);
      ui.notifications.info(game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.ValidationSuccess"));
    } catch (error) {
      console.error(`${MODULE_ID} | Compilation failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static #closeWindow() {
    this.close();
  }
}
