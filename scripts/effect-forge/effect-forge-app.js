import { MODULE_ID } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EffectForgeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  validationReport = null;
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
      components: api?.components.list() ?? [],
      validationReport: this.validationReport
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
    const builder = this.constructor.#api().builders
      .effect()
      .setId(`pf2e-critical-forge.custom.${foundry.utils.randomID()}`)
      .setName(data.effectName)
      .setDescription(
        `<p>${foundry.utils.escapeHTML(String(data.description ?? "").trim())}</p>`
      )
      .setImage(data.img)
      .setMetadata({
        originModule: MODULE_ID,
        originFeature: "effect-forge-test-ui"
      });

    const durationUnit = String(data.durationUnit ?? "rounds");
    if (durationUnit === "unlimited") {
      builder.setDuration(-1, "unlimited", null);
    } else {
      builder.setDuration(
        Number(data.durationValue),
        durationUnit,
        String(data.durationExpiry ?? "turn-end")
      );
    }

    if (data.conditionEnabled === "on") {
      const rawValue = String(data.conditionValue ?? "").trim();
      builder.addCondition(
        String(data.conditionSlug ?? "").trim(),
        rawValue === "" ? undefined : Number.parseInt(rawValue, 10)
      );
    }

    if (data.modifierEnabled === "on") {
      builder.addModifier({
        selector: String(data.modifierSelector ?? "").trim(),
        value: Number(data.modifierValue),
        modifierType: String(data.modifierType ?? "status")
      });
    }

    return builder.build();
  }

  #localizeIssue(issue) {
    const text = issue.message
      ?? (issue.messageKey
        ? game.i18n.format(`PF2E_CRITICAL_FORGE.${issue.messageKey}`, issue.data ?? {})
        : issue.data?.message ?? issue.code);

    return {
      ...issue,
      text,
      icon: {
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        hint: "fa-lightbulb",
        info: "fa-circle-info"
      }[issue.severity] ?? "fa-circle-info"
    };
  }

  #reportValidation(result) {
    this.validationReport = {
      valid: result.valid,
      issues: result.issues.map((issue) => this.#localizeIssue(issue))
    };

    if (result.valid) {
      ui.notifications.info(
        game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.ValidationSuccess")
      );
    } else {
      const message = this.validationReport.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.text)
        .join("\n");
      ui.notifications.error(message);
    }

    this.render({ force: true });
  }

  static #validateEffect() {
    try {
      const definition = this.#readForm();
      const result = this.constructor.#api().effects.analyze(definition);
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
