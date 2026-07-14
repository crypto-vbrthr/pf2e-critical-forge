import { MODULE_ID } from "../constants.js";
import {
  initializeConditionCatalog,
  isValuedCondition
} from "../effect-engine/catalogs/condition-catalog.js";
import { getDamageTypeGroups } from "../effect-engine/catalogs/damage-type-catalog.js";
import { getResistanceTypeGroups } from "../effect-engine/catalogs/resistance-type-catalog.js";
import { getWeaknessTypeGroups } from "../effect-engine/catalogs/weakness-type-catalog.js";
import { getImmunityTypeGroups } from "../effect-engine/catalogs/immunity-type-catalog.js";
import { getBaseSpeedTypeGroups, getMovementTypeGroups } from "../effect-engine/catalogs/movement-type-catalog.js";
import { captureScrollState, restoreScrollState } from "./view-state.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const FALLBACK_CONDITIONS = [
  "blinded", "clumsy", "concealed", "confused", "controlled", "dazzled",
  "deafened", "doomed", "drained", "dying", "encumbered", "enfeebled",
  "fascinated", "fatigued", "fleeing", "frightened", "grabbed", "hidden",
  "immobilized", "invisible", "off-guard", "paralyzed",
  "prone", "quickened", "restrained", "sickened", "slowed", "stunned",
  "stupefied", "unconscious", "undetected", "wounded"
];


const MODIFIER_TYPE_DEFINITIONS = [
  ["status", "PF2E_CRITICAL_FORGE.EffectForge.ModifierTypes.Status"],
  ["circumstance", "PF2E_CRITICAL_FORGE.EffectForge.ModifierTypes.Circumstance"],
  ["item", "PF2E_CRITICAL_FORGE.EffectForge.ModifierTypes.Item"],
  ["untyped", "PF2E_CRITICAL_FORGE.EffectForge.ModifierTypes.Untyped"]
];

const VALIDATION_GROUPS = [
  ["error", "PF2E_CRITICAL_FORGE.EffectForge.Validation.Errors", "fa-circle-xmark"],
  ["warning", "PF2E_CRITICAL_FORGE.EffectForge.Validation.Warnings", "fa-triangle-exclamation"],
  ["hint", "PF2E_CRITICAL_FORGE.EffectForge.Validation.Hints", "fa-circle-info"],
  ["info", "PF2E_CRITICAL_FORGE.EffectForge.Validation.Information", "fa-circle-info"]
];

export class EffectForgeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  validationReport = null;
  definitionPreview = null;
  compiledPreview = null;
  componentMenuOpen = false;
  preservedScrollState = new Map();

  state = {
    effectId: "example.shaken-nerves",
    effectName: "",
    description: "",
    img: "icons/svg/terror.svg",
    durationValue: 2,
    durationUnit: "rounds",
    durationExpiry: "turn-end",
    components: [
      { type: "condition", slug: "frightened", value: 2 },
      { type: "modifier", selector: "will", value: -1, modifierType: "circumstance" }
    ]
  };

  static DEFAULT_OPTIONS = {
    id: "pf2e-critical-forge-effect-forge",
    classes: ["pf2e-critical-forge", "effect-forge"],
    tag: "form",
    window: {
      title: "PF2E_CRITICAL_FORGE.EffectForge.WindowTitle",
      icon: "fa-solid fa-hammer",
      resizable: true
    },
    position: {
      width: 1220,
      height: 820
    },
    actions: {
      toggleComponentMenu: EffectForgeApp.#toggleComponentMenu,
      addCondition: EffectForgeApp.#addCondition,
      addModifier: EffectForgeApp.#addModifier,
      addPersistentDamage: EffectForgeApp.#addPersistentDamage,
      addResistance: EffectForgeApp.#addResistance,
      addWeakness: EffectForgeApp.#addWeakness,
      addImmunity: EffectForgeApp.#addImmunity,
      addFastHealing: EffectForgeApp.#addFastHealing,
      addRegeneration: EffectForgeApp.#addRegeneration,
      addTemporaryHitPoints: EffectForgeApp.#addTemporaryHitPoints,
      addMovement: EffectForgeApp.#addMovement,
      addBaseSpeed: EffectForgeApp.#addBaseSpeed,
      removeComponent: EffectForgeApp.#removeComponent,
      browseImage: EffectForgeApp.#browseImage,
      validateEffect: EffectForgeApp.#validateEffect,
      compileEffect: EffectForgeApp.#compileEffect,
      createItem: EffectForgeApp.#createItem,
      applySelected: EffectForgeApp.#applySelected,
      copyDefinition: EffectForgeApp.#copyDefinition,
      copyCompiled: EffectForgeApp.#copyCompiled,
      closeWindow: EffectForgeApp.#closeWindow
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/effect-forge/effect-forge-app.hbs`
    }
  };

  constructor(options = {}) {
    super(options);
    this.state.effectName = game.i18n.localize(
      "PF2E_CRITICAL_FORGE.Examples.ShakenNerves.Name"
    );
    this.state.description = game.i18n.localize(
      "PF2E_CRITICAL_FORGE.Examples.ShakenNerves.PlainDescription"
    );
  }

  async _prepareContext() {
    const api = game.modules.get(MODULE_ID)?.api;
    await initializeConditionCatalog();
    await this.#ensurePreviewData();

    return {
      apiReady: Boolean(api),
      apiVersion: api?.version ?? "—",
      schemaVersion: api?.schemaVersion ?? "—",
      state: this.state,
      descriptionLength: this.state.description.length,
      unlimitedDuration: this.state.durationUnit === "unlimited",
      componentMenuOpen: this.componentMenuOpen,
      components: this.state.components.map((component, index) =>
        this.#prepareComponent(component, index)
      ),
      validationReport: this.validationReport,
      definitionPreview: this.definitionPreview,
      compiledPreview: this.compiledPreview
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    const description = root.querySelector('textarea[name="description"]');
    const counter = root.querySelector("[data-description-counter]");
    description?.addEventListener("input", () => {
      if (counter) counter.textContent = `${description.value.length} / 1000`;
    });

    const unlimited = root.querySelector('input[name="unlimitedDuration"]');
    const durationControls = root.querySelectorAll("[data-duration-control]");
    const updateDurationState = () => {
      const disabled = Boolean(unlimited?.checked);
      for (const control of durationControls) control.disabled = disabled;
    };
    unlimited?.addEventListener("change", updateDurationState);
    updateDurationState();

    const customValue = this.constructor.#api().selectors.customValue;
    for (const conditionChoice of root.querySelectorAll("[data-condition-choice]")) {
      const card = conditionChoice.closest(".effect-forge-component-card");
      const valueField = card?.querySelector("[data-condition-value-field]");
      const valueInput = valueField?.querySelector("input");

      const updateConditionValue = () => {
        const selected = conditionChoice.selectedOptions?.[0];
        const isValued = selected?.dataset.valued === "true";
        if (valueField) valueField.hidden = !isValued;
        if (valueInput) {
          valueInput.disabled = !isValued;
          if (isValued && valueInput.value === "") valueInput.value = "1";
          if (!isValued) valueInput.value = "";
        }
      };

      conditionChoice.addEventListener("change", updateConditionValue);
      updateConditionValue();
    }

    for (const selectorChoice of root.querySelectorAll("[data-selector-choice]")) {
      const card = selectorChoice.closest(".effect-forge-component-card");
      const customField = card?.querySelector("[data-custom-selector-field]");
      const customInput = customField?.querySelector("input");

      const updateCustomSelector = () => {
        const custom = selectorChoice.value === customValue;
        if (customField) customField.hidden = !custom;
        if (customInput) {
          customInput.disabled = !custom;
          customInput.required = custom;
        }
      };

      selectorChoice.addEventListener("change", updateCustomSelector);
      updateCustomSelector();
    }

    this.#restoreScrollPositions();
  }

  #captureScrollPositions() {
    const root = this.element;
    this.preservedScrollState = root instanceof HTMLElement
      ? captureScrollState(root)
      : new Map();
  }

  #restoreScrollPositions() {
    if (!(this.preservedScrollState instanceof Map) || this.preservedScrollState.size === 0) {
      return;
    }

    const state = this.preservedScrollState;
    this.preservedScrollState = new Map();

    const restore = () => {
      const root = this.element;
      if (root instanceof HTMLElement) restoreScrollState(root, state);
    };

    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(restore);
    } else {
      globalThis.setTimeout(restore, 0);
    }
  }

  #renderPreservingScroll() {
    this.#captureScrollPositions();
    return this.render({ force: true });
  }

  static #api() {
    const api = game.modules.get(MODULE_ID)?.api;
    if (!api) throw new Error("Effect Engine API is unavailable.");
    return api;
  }

  #prepareComponent(component, index) {
    const base = {
      ...component,
      index,
      number: index + 1,
      isCondition: component.type === "condition",
      isModifier: component.type === "modifier",
      isPersistentDamage: component.type === "persistentDamage",
      isResistance: component.type === "resistance",
      isWeakness: component.type === "weakness",
      isImmunity: component.type === "immunity",
      isFastHealing: component.type === "fastHealing",
      isRegeneration: component.type === "regeneration",
      isTemporaryHitPoints: component.type === "temporaryHitPoints",
      isMovement: component.type === "movement",
      isBaseSpeed: component.type === "baseSpeed"
    };

    if (base.isCondition) {
      base.isValuedCondition = isValuedCondition(component.slug);
      base.value = base.isValuedCondition ? (component.value ?? 1) : undefined;
      base.conditionOptions = this.#conditionOptions(component.slug);
    }

    if (base.isModifier) {
      const selectorApi = this.constructor.#api().selectors;
      base.selectorGroups = selectorApi.groups(component.selector);
      base.usesCustomSelector = !selectorApi.has(component.selector);
      base.customSelector = base.usesCustomSelector ? component.selector : "";
      base.modifierTypeOptions = MODIFIER_TYPE_DEFINITIONS.map(([value, key]) => ({
        value,
        label: game.i18n.localize(key),
        selected: component.modifierType === value
      }));
    }

    if (base.isPersistentDamage) {
      base.damageTypeGroups = getDamageTypeGroups(component.damageType);
      base.dc = component.dc ?? "";
    }

    if (base.isResistance) {
      base.resistanceTypeGroups = getResistanceTypeGroups(component.resistanceType);
    }

    if (base.isWeakness) {
      base.weaknessTypeGroups = getWeaknessTypeGroups(component.weaknessType);
    }

    if (base.isImmunity) {
      base.immunityTypeGroups = getImmunityTypeGroups(component.immunityType);
    }

    if (base.isRegeneration) {
      base.damageTypeGroups = getDamageTypeGroups(component.deactivatedBy ?? []);
    }

    if (base.isMovement) {
      base.movementTypeGroups = getMovementTypeGroups(component.movementType);
      base.modifierTypeOptions = MODIFIER_TYPE_DEFINITIONS.map(([value, key]) => ({
        value,
        label: game.i18n.localize(key),
        selected: component.modifierType === value
      }));
    }

    if (base.isBaseSpeed) {
      base.baseSpeedTypeGroups = getBaseSpeedTypeGroups(component.movementType);
    }

    return base;
  }

  #conditionOptions(selected) {
    const configured = CONFIG.PF2E?.conditionTypes ?? {};
    const entries = Object.entries(configured)
      .filter(([value]) => value !== "persistent-damage" || value === selected)
      .map(([value, label]) => ({
        value,
        label: game.i18n.localize(label),
        isValued: isValuedCondition(value)
      }));

    const source = entries.length > 0
      ? entries
      : FALLBACK_CONDITIONS.map((value) => ({
          value,
          label: value,
          isValued: isValuedCondition(value)
        }));

    if (selected && !source.some((option) => option.value === selected)) {
      source.push({
        value: selected,
        label: selected,
        isValued: isValuedCondition(selected)
      });
    }

    return source
      .map((option) => ({ ...option, selected: option.value === selected }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
  }

  #syncStateFromForm() {
    const form = this.element;
    if (!(form instanceof HTMLFormElement)) return;

    const data = new FormData(form);
    this.state.effectId = String(data.get("effectId") ?? "").trim();
    this.state.effectName = String(data.get("effectName") ?? "");
    this.state.description = String(data.get("description") ?? "").slice(0, 1000);
    this.state.img = String(data.get("img") ?? "icons/svg/aura.svg");

    const unlimited = data.get("unlimitedDuration") === "on";
    this.state.durationValue = Number(data.get("durationValue") ?? 0);
    this.state.durationUnit = unlimited
      ? "unlimited"
      : String(data.get("durationUnit") ?? "rounds");
    this.state.durationExpiry = String(data.get("durationExpiry") ?? "turn-end");

    this.state.components = this.state.components.map((component, index) => {
      const prefix = `components.${index}`;
      if (component.type === "condition") {
        const raw = String(data.get(`${prefix}.value`) ?? "").trim();
        return {
          type: "condition",
          slug: String(data.get(`${prefix}.slug`) ?? "").trim(),
          value: raw === "" ? undefined : Number.parseInt(raw, 10)
        };
      }

      if (component.type === "persistentDamage") {
        const rawDc = String(data.get(`${prefix}.dc`) ?? "").trim();
        return {
          type: "persistentDamage",
          formula: String(data.get(`${prefix}.formula`) ?? "").trim(),
          damageType: String(data.get(`${prefix}.damageType`) ?? "").trim(),
          dc: rawDc === "" ? undefined : Number(rawDc)
        };
      }

      if (component.type === "resistance") {
        return {
          type: "resistance",
          resistanceType: String(data.get(`${prefix}.resistanceType`) ?? "").trim(),
          value: Number(data.get(`${prefix}.value`) ?? 0)
        };
      }

      if (component.type === "weakness") {
        return {
          type: "weakness",
          weaknessType: String(data.get(`${prefix}.weaknessType`) ?? "").trim(),
          value: Number(data.get(`${prefix}.value`) ?? 0)
        };
      }

      if (component.type === "immunity") {
        return {
          type: "immunity",
          immunityType: String(data.get(`${prefix}.immunityType`) ?? "").trim()
        };
      }

      if (component.type === "fastHealing") {
        return {
          type: "fastHealing",
          value: Number(data.get(`${prefix}.value`) ?? 0)
        };
      }

      if (component.type === "regeneration") {
        return {
          type: "regeneration",
          value: Number(data.get(`${prefix}.value`) ?? 0),
          deactivatedBy: data.getAll(`${prefix}.deactivatedBy`)
            .map((entry) => String(entry).trim())
            .filter(Boolean)
        };
      }

      if (component.type === "temporaryHitPoints") {
        return {
          type: "temporaryHitPoints",
          value: Number(data.get(`${prefix}.value`) ?? 0)
        };
      }

      if (component.type === "movement") {
        return {
          type: "movement",
          movementType: String(data.get(`${prefix}.movementType`) ?? "land").trim(),
          value: Number(data.get(`${prefix}.value`) ?? 0),
          modifierType: String(data.get(`${prefix}.modifierType`) ?? "status")
        };
      }

      if (component.type === "baseSpeed") {
        return {
          type: "baseSpeed",
          movementType: String(data.get(`${prefix}.movementType`) ?? "fly").trim(),
          value: Number(data.get(`${prefix}.value`) ?? 0)
        };
      }

      const selectorChoice = String(
        data.get(`${prefix}.selectorChoice`) ?? component.selector ?? ""
      ).trim();
      const selector = selectorChoice === this.constructor.#api().selectors.customValue
        ? String(data.get(`${prefix}.customSelector`) ?? "").trim()
        : selectorChoice;

      return {
        type: "modifier",
        selector,
        value: Number(data.get(`${prefix}.value`) ?? 0),
        modifierType: String(data.get(`${prefix}.modifierType`) ?? "status")
      };
    });
  }

  #buildDefinition({ sync = true } = {}) {
    if (sync) this.#syncStateFromForm();

    const builder = this.constructor.#api().builders
      .effect()
      .setId(this.state.effectId || `pf2e-critical-forge.custom.${foundry.utils.randomID()}`)
      .setName(this.state.effectName)
      .setDescription(
        `<p>${foundry.utils.escapeHTML(this.state.description.trim())}</p>`
      )
      .setImage(this.state.img)
      .setMetadata({
        originModule: MODULE_ID,
        originFeature: "effect-forge-ui"
      });

    if (this.state.durationUnit === "unlimited") {
      builder.setDuration(-1, "unlimited", null);
    } else {
      builder.setDuration(
        this.state.durationValue,
        this.state.durationUnit,
        this.state.durationExpiry
      );
    }

    for (const component of this.state.components) {
      if (component.type === "condition") {
        builder.addCondition(component.slug, component.value);
      } else if (component.type === "modifier") {
        builder.addModifier(component);
      } else if (component.type === "persistentDamage") {
        builder.addPersistentDamage(component);
      } else if (component.type === "resistance") {
        builder.addResistance(component);
      } else if (component.type === "weakness") {
        builder.addWeakness(component);
      } else if (component.type === "immunity") {
        builder.addImmunity(component);
      } else if (component.type === "fastHealing") {
        builder.addFastHealing(component);
      } else if (component.type === "regeneration") {
        builder.addRegeneration(component);
      } else if (component.type === "temporaryHitPoints") {
        builder.addTemporaryHitPoints(component);
      } else if (component.type === "movement") {
        builder.addMovement(component);
      } else if (component.type === "baseSpeed") {
        builder.addBaseSpeed(component);
      }
    }

    return builder.build();
  }

  #localizeIssue(issue) {
    const text = issue.message
      ?? (issue.messageKey
        ? game.i18n.format(`PF2E_CRITICAL_FORGE.${issue.messageKey}`, issue.data ?? {})
        : issue.data?.message ?? issue.code);

    return { ...issue, text };
  }

  #setValidationReport(result) {
    const localized = result.issues.map((issue) => this.#localizeIssue(issue));
    const groups = VALIDATION_GROUPS.map(([severity, labelKey, icon]) => {
      const issues = localized.filter((issue) => issue.severity === severity);
      return {
        severity,
        label: game.i18n.localize(labelKey),
        icon,
        count: issues.length,
        issues,
        hasIssues: issues.length > 0
      };
    }).filter((group) => group.hasIssues);

    const errorCount = localized.filter((issue) => issue.severity === "error").length;
    const warningCount = localized.filter((issue) => issue.severity === "warning").length;

    this.validationReport = {
      valid: result.valid,
      issueCount: localized.length,
      errorCount,
      warningCount,
      groups,
      hasIssues: localized.length > 0,
      statusClass: errorCount > 0 ? "invalid" : "valid",
      statusIcon: errorCount > 0 ? "fa-circle-xmark" : "fa-circle-check",
      statusText: game.i18n.localize(
        errorCount > 0
          ? "PF2E_CRITICAL_FORGE.EffectForge.Validation.HasErrors"
          : "PF2E_CRITICAL_FORGE.EffectForge.Validation.NoErrors"
      )
    };
  }

  async #ensurePreviewData() {
    if (this.definitionPreview !== null && this.validationReport !== null) return;

    try {
      const definition = this.#buildDefinition({ sync: false });
      const validation = this.constructor.#api().effects.analyze(definition);
      this.#setValidationReport(validation);
      this.definitionPreview = JSON.stringify(definition, null, 2);

      if (this.compiledPreview === null) {
        const compiled = await this.constructor.#api().effects.toItemSource(definition);
        this.compiledPreview = JSON.stringify(compiled, null, 2);
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Initial preview could not be prepared`, error);
    }
  }

  #invalidatePreviews() {
    this.validationReport = null;
    this.definitionPreview = null;
    this.compiledPreview = null;
  }

  static #toggleComponentMenu() {
    this.#syncStateFromForm();
    this.componentMenuOpen = !this.componentMenuOpen;
    this.#renderPreservingScroll();
  }

  static #addCondition() {
    this.#syncStateFromForm();
    this.state.components.push({ type: "condition", slug: "frightened", value: 1 });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addModifier() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "circumstance"
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addPersistentDamage() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "persistentDamage",
      formula: "1d6",
      damageType: "bleed",
      dc: undefined
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addResistance() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "resistance",
      resistanceType: "fire",
      value: 5
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addWeakness() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "weakness",
      weaknessType: "fire",
      value: 5
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addImmunity() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "immunity",
      immunityType: "fire"
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addFastHealing() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "fastHealing",
      value: 2
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addRegeneration() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "regeneration",
      value: 5,
      deactivatedBy: ["acid", "fire"]
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addTemporaryHitPoints() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "temporaryHitPoints",
      value: 5
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addMovement() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "movement",
      movementType: "land",
      value: 10,
      modifierType: "status"
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #addBaseSpeed() {
    this.#syncStateFromForm();
    this.state.components.push({
      type: "baseSpeed",
      movementType: "fly",
      value: 30
    });
    this.componentMenuOpen = false;
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static #removeComponent(event, target) {
    this.#syncStateFromForm();
    const index = Number(target.dataset.index);
    if (Number.isInteger(index) && index >= 0 && index < this.state.components.length) {
      this.state.components.splice(index, 1);
    }
    this.#invalidatePreviews();
    this.#renderPreservingScroll();
  }

  static async #browseImage() {
    this.#syncStateFromForm();

    const Picker = globalThis.FilePicker
      ?? foundry.applications?.apps?.FilePicker?.implementation;

    if (!Picker) {
      ui.notifications.warn(
        game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.ImagePickerUnavailable")
      );
      return;
    }

    const picker = new Picker({
      type: "image",
      current: this.state.img,
      callback: (path) => {
        this.state.img = path;
        this.#invalidatePreviews();
        this.#renderPreservingScroll();
      }
    });

    await picker.browse();
  }

  static #validateEffect() {
    try {
      const definition = this.#buildDefinition();
      const result = this.constructor.#api().effects.analyze(definition);
      this.#setValidationReport(result);
      this.definitionPreview = JSON.stringify(definition, null, 2);
      this.compiledPreview = null;
      this.#renderPreservingScroll();
    } catch (error) {
      console.error(`${MODULE_ID} | Validation failed`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #compileEffect() {
    try {
      const definition = this.#buildDefinition();
      const validation = this.constructor.#api().effects.analyze(definition);
      const result = await this.constructor.#api().effects.toItemSource(definition);
      this.#setValidationReport(validation);
      this.definitionPreview = JSON.stringify(definition, null, 2);
      this.compiledPreview = JSON.stringify(result, null, 2);
      this.#renderPreservingScroll();
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
      const definition = this.#buildDefinition();
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
      const definition = this.#buildDefinition();
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

  static async #copyText(text) {
    if (!text) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (game.clipboard?.copyPlainText) {
      game.clipboard.copyPlainText(text);
    } else {
      throw new Error("Clipboard API is unavailable.");
    }

    ui.notifications.info(
      game.i18n.localize("PF2E_CRITICAL_FORGE.EffectForge.Copied")
    );
  }

  static async #copyDefinition() {
    await this.constructor.#copyText(this.definitionPreview);
  }

  static async #copyCompiled() {
    await this.constructor.#copyText(this.compiledPreview);
  }

  static #closeWindow() {
    this.close();
  }
}
