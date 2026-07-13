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
      width: 680,
      height: "auto"
    },
    actions: {
      validateEffect: EffectForgeApp.#validateEffect,
      compileEffect: EffectForgeApp.#compileEffect,
      createItem: EffectForgeApp.#createItem,
      applySelected: EffectForgeApp.#applySelected,
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

  static #api() {
    const api = game.modules.get(MODULE_ID)?.api;
    if (!api) throw new Error("Effect Engine API is unavailable.");
    return api;
  }

  #readForm() {
    const form = this.element;
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Effect Forge form is unavailable.");
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const components = [];

    if (data.conditionEnabled === "on") {
      const condition = {
        type: "condition",
        slug: String(data.conditionSlug ?? "").trim()
      };

      const rawValue = String(data.conditionValue ?? "").trim();
      if (rawValue !== "") condition.value = Number.parseInt(rawValue, 10);
      components.push(condition);
    }

    if (data.modifierEnabled === "on") {
      components.push({
        type: "modifier",
        selector: String(data.modifierSelector ?? "").trim(),
        value: Number(data.modifierValue),
        modifierType: String(data.modifierType ?? "status")
      });
    }

    const durationUnit = String(data.durationUnit ?? "rounds");
    const duration = durationUnit === "unlimited"
      ? { value: -1, unit: "unlimited", expiry: null }
      : {
          value: Number(data.durationValue),
          unit: durationUnit,
          expiry: String(data.durationExpiry ?? "turn-end")
        };

    return {
      schemaVersion: 1,
      id: `pf2e-critical-forge.custom.${foundry.utils.randomID()}`,
      name: String(data.effectName ?? "").trim(),
      description: `<p>${foundry.utils.escapeHTML(String(data.description ?? "").trim())}</p>`,
      img: String(data.img ?? "icons/svg/aura.svg").trim() || "icons/svg/aura.svg",
      duration,
      components,
      metadata: {
        originModule: MODULE_ID,
        originFeature: "effect-forge-test-ui"
      }
    };
  }

  #reportValidation(result) {
    if (result.valid) {
      ui.notifications.info(
        game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.ValidationSuccess")
      );
      return;
    }

    const message = result.errors.join("\n");
    ui.notifications.error(message);
  }

  static #validateEffect() {
    try {
      const definition = this.#readForm();
      const result = this.constructor.#api().effects.validate(definition);
      this.#reportValidation(result);
      console.log(`${MODULE_ID} | Effect definition`, definition);
      console.log(`${MODULE_ID} | Validation result`, result);
    } catch (error) {
      console.error(`${MODULE_ID} | Validation failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #compileEffect() {
    try {
      const definition = this.#readForm();
      const result = await this.constructor.#api().effects.toItemSource(definition);
      console.log(`${MODULE_ID} | Effect definition`, definition);
      console.log(`${MODULE_ID} | PF2e Item source`, result);
      ui.notifications.info(
        game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.CompileSuccess")
      );
    } catch (error) {
      console.error(`${MODULE_ID} | Compilation failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #createItem() {
    try {
      const definition = this.#readForm();
      const item = await this.constructor.#api().effects.createItem(definition, {
        renderSheet: true
      });

      if (item) {
        ui.notifications.info(game.i18n.format(
          "PF2E_CRITICAL_FORGE.EffectForge.ItemCreated",
          { name: item.name }
        ));
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Item creation failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #applySelected() {
    const targets = canvas?.tokens?.controlled ?? [];
    if (targets.length === 0) {
      ui.notifications.warn(
        game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.NoSelectedTokens")
      );
      return;
    }

    try {
      const definition = this.#readForm();
      const created = await this.constructor.#api().effects.apply(definition, targets);
      ui.notifications.info(game.i18n.format(
        "PF2E_CRITICAL_FORGE.EffectForge.Applied",
        { count: created.length }
      ));
    } catch (error) {
      console.error(`${MODULE_ID} | Effect application failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static #closeWindow() {
    this.close();
  }
}
