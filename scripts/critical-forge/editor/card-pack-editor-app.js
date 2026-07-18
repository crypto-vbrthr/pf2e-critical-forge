import { MODULE_ID } from "../../constants.js";
import { openEffectForgeDefinition } from "../../effect-forge/effect-forge.js";
import { localizeCard } from "../localization/card-localizer.js";
import { normalizePackDefinition } from "../schema/card-normalizer.js";
import { validatePackDefinition } from "../schema/card-validator.js";
import { deepClone } from "../utils.js";
import {
  cloneCardToPack,
  createEditableCard,
  createEditablePack,
  formatDelimitedList,
  isEditorManagedPack,
  parseDelimitedList,
  sanitizeIdentifier,
  userLocalizationKey
} from "./card-editor-model.js";
import {
  buildCardPackExportFilename,
  CardPackTransferError,
  downloadCardPackExport,
  parseCardPackImport,
  readCardPackImportFile,
  serializeCardPackExport
} from "./card-pack-transfer.js";
import {
  deleteCustomCardPack,
  hydrateRegisteredPack,
  isCustomCardPack,
  listHydratedRegisteredPacks,
  saveCustomCardPack
} from "./card-pack-store.js";
import { cardEffectToForgeDefinition, forgeDefinitionToCardEffect } from "./card-effect-bridge.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const FILTER_FIELDS = Object.freeze([
  "damageTypes",
  "weaponGroups",
  "attackTraits",
  "excludedAttackTraits",
  "saveTypes",
  "spellTraditions",
  "spellTraits",
  "sourceTraits",
  "targetTraits",
  "excludedSourceTraits",
  "excludedTargetTraits"
]);

const IMPORT_ERROR_KEYS = Object.freeze({
  CARD_PACK_IMPORT_EMPTY: "Empty",
  CARD_PACK_IMPORT_JSON_INVALID: "InvalidJson",
  CARD_PACK_IMPORT_OBJECT_REQUIRED: "ObjectRequired",
  CARD_PACK_IMPORT_FORMAT_UNSUPPORTED: "UnsupportedFormat",
  CARD_PACK_IMPORT_VERSION_UNSUPPORTED: "UnsupportedVersion",
  CARD_PACK_IMPORT_FILE_INVALID: "InvalidFile",
  CARD_PACK_IMPORT_FILE_TOO_LARGE: "FileTooLarge",
  CARD_PACK_NORMALIZATION_FAILED: "NormalizationFailed",
  CARD_PACK_VALIDATION_FAILED: "ValidationFailed"
});

export class CardPackEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  selectedPackId = "core";
  selectedCardId = "";
  draftPack = null;
  originalPackId = null;
  isDirty = false;
  cleanSnapshot = "";
  allowCloseWithoutPrompt = false;

  static DEFAULT_OPTIONS = {
    id: "pf2e-critical-forge-card-pack-editor",
    classes: ["pf2e-critical-forge", "card-pack-editor"],
    tag: "form",
    window: {
      title: "PF2E_CRITICAL_FORGE.CardEditor.WindowTitle",
      icon: "fa-solid fa-layer-group",
      resizable: true
    },
    position: { width: 1280, height: 820 },
    actions: {
      selectPack: CardPackEditorApp.#selectPack,
      newPack: CardPackEditorApp.#newPack,
      duplicatePack: CardPackEditorApp.#duplicatePack,
      savePack: CardPackEditorApp.#savePack,
      deletePack: CardPackEditorApp.#deletePack,
      importFile: CardPackEditorApp.#importFile,
      importClipboard: CardPackEditorApp.#importClipboard,
      exportPack: CardPackEditorApp.#exportPack,
      copyPack: CardPackEditorApp.#copyPack,
      selectCard: CardPackEditorApp.#selectCard,
      newCard: CardPackEditorApp.#newCard,
      duplicateCard: CardPackEditorApp.#duplicateCard,
      deleteCard: CardPackEditorApp.#deleteCard,
      editEffect: CardPackEditorApp.#editEffect,
      clearEffect: CardPackEditorApp.#clearEffect,
      closeWindow: CardPackEditorApp.#closeWindow
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/critical-forge/card-pack-editor.hbs` }
  };

  constructor(options = {}) {
    super(options);
    const initial = hydrateRegisteredPack("core") ?? listHydratedRegisteredPacks()[0] ?? null;
    this.selectedPackId = initial?.id ?? "";
    this.selectedCardId = initial?.cards?.[0]?.id ?? "";
    this.#markClean();
  }

  async _prepareContext() {
    const registered = listHydratedRegisteredPacks();
    const visiblePacks = [...registered];
    if (this.draftPack && !visiblePacks.some((pack) => pack.id === this.draftPack.id)) {
      visiblePacks.push(this.draftPack);
    }

    const currentPack = this.#currentPack();
    const editable = Boolean(currentPack && isEditorManagedPack(currentPack));
    const currentCard = currentPack?.cards?.find((card) => card.id === this.selectedCardId)
      ?? currentPack?.cards?.[0]
      ?? null;
    if (currentCard && currentCard.id !== this.selectedCardId) this.selectedCardId = currentCard.id;

    const validation = currentPack ? this.#validateCurrentPack({ sync: false }) : null;
    const localizedCard = currentCard ? localizeCard(currentCard) : null;

    return {
      packs: visiblePacks
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((pack) => ({
          id: pack.id,
          title: localizeText(pack.titleKey, pack.fallbackTitle, pack.id),
          description: localizeText(pack.descriptionKey, pack.fallbackDescription, ""),
          cardCount: pack.cards?.length ?? 0,
          selected: pack.id === this.selectedPackId,
          editable: isEditorManagedPack(pack),
          enabled: pack.enabled !== false
        })),
      hasPack: Boolean(currentPack),
      pack: currentPack,
      packEditable: editable,
      packReadonly: Boolean(currentPack && !editable),
      packStatusLabel: editable
        ? game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.Editable")
        : game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.Readonly"),
      cards: (currentPack?.cards ?? []).map((card) => ({
        id: card.id,
        title: localizeCard(card).title,
        category: card.category,
        tone: card.tone,
        impact: card.impact,
        selected: card.id === currentCard?.id,
        hasEffect: Boolean(card.effect)
      })),
      hasCards: (currentPack?.cards?.length ?? 0) > 0,
      card: currentCard ? this.#prepareCard(currentCard, localizedCard) : null,
      hasCard: Boolean(currentCard),
      isDirty: this.isDirty,
      validation: prepareValidation(validation),
      canSave: editable && Boolean(currentPack),
      canDeletePack: editable && Boolean(currentPack),
      canEditCard: editable && Boolean(currentCard),
      exportFilename: currentPack ? buildCardPackExportFilename(currentPack) : ""
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    const markDirty = () => {
      if (!this.#currentPack() || !isEditorManagedPack(this.#currentPack())) return;
      this.isDirty = true;
      const indicator = root.querySelector("[data-dirty-indicator]");
      indicator?.classList.add("dirty");
      indicator?.classList.remove("clean");
      const text = indicator?.querySelector("[data-dirty-text]");
      if (text) text.textContent = game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.Unsaved");
    };
    root.addEventListener("input", markDirty);
    root.addEventListener("change", markDirty);
  }

  async close(options = {}) {
    if (!this.allowCloseWithoutPrompt && !await this.#confirmDiscard()) return this;
    this.allowCloseWithoutPrompt = false;
    return super.close(options);
  }

  #currentPack() {
    if (this.draftPack && this.draftPack.id === this.selectedPackId) return this.draftPack;
    return hydrateRegisteredPack(this.selectedPackId);
  }

  #currentCard() {
    return this.#currentPack()?.cards?.find((card) => card.id === this.selectedCardId) ?? null;
  }

  #prepareCard(card, localized) {
    return {
      ...card,
      localizedTitle: localized?.title ?? card.fallbackTitle ?? card.id,
      tagsText: formatDelimitedList(card.tags),
      filters: Object.fromEntries(FILTER_FIELDS.map((field) => [field, formatDelimitedList(card.filters?.[field])])),
      effectTarget: card.effect?.target ?? "target",
      effectNameKey: card.effect?.nameKey ?? userLocalizationKey(card.id, "EffectName"),
      effectFallbackName: card.effect?.fallbackName ?? card.fallbackTitle ?? "",
      effectSummary: card.effect
        ? game.i18n.format("PF2E_CRITICAL_FORGE.CardEditor.EffectSummary", {
            count: card.effect.definition?.components?.length ?? 0,
            target: localizeEffectTarget(card.effect.target)
          })
        : game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.NoEffect"),
      categoryOptions: optionList(["criticalHit", "criticalFumble", "spellCriticalHit", "spellCriticalFumble", "savingThrowCriticalSuccess", "savingThrowCriticalFailure"], card.category, "Categories"),
      toneOptions: optionList(["neutral", "serious", "dramatic", "humorous"], card.tone, "Tones"),
      impactOptions: optionList(["narrative", "light", "moderate", "strong"], card.impact, "Impacts"),
      effectTargetOptions: optionList(["target", "source"], card.effect?.target ?? "target", "EffectTargets")
    };
  }

  #syncFromForm() {
    const form = this.element;
    const pack = this.#currentPack();
    if (!(form instanceof HTMLFormElement) || !pack || !isEditorManagedPack(pack)) return;
    const data = new FormData(form);
    const oldId = pack.id;
    pack.id = sanitizeIdentifier(data.get("pack.id"), oldId || "my-critical-cards");
    pack.titleKey = String(data.get("pack.titleKey") ?? pack.titleKey ?? "").trim();
    pack.descriptionKey = String(data.get("pack.descriptionKey") ?? pack.descriptionKey ?? "").trim();
    pack.fallbackTitle = String(data.get("pack.fallbackTitle") ?? "").trim();
    pack.fallbackDescription = String(data.get("pack.fallbackDescription") ?? "").trim();
    pack.version = String(data.get("pack.version") ?? "1.0.0").trim();
    pack.priority = Number(data.get("pack.priority") ?? 0);
    pack.enabled = data.get("pack.enabled") === "on";
    if (pack.id !== oldId) {
      for (const card of pack.cards ?? []) card.packId = pack.id;
      this.selectedPackId = pack.id;
    }

    const card = pack.cards?.find((entry) => entry.id === this.selectedCardId);
    if (!card) return;
    card.id = sanitizeIdentifier(data.get("card.id"), card.id);
    card.packId = pack.id;
    this.selectedCardId = card.id;
    card.category = String(data.get("card.category") ?? "criticalHit");
    card.tone = String(data.get("card.tone") ?? "neutral");
    card.impact = String(data.get("card.impact") ?? "narrative");
    card.titleKey = String(data.get("card.titleKey") ?? "").trim();
    card.descriptionKey = String(data.get("card.descriptionKey") ?? "").trim();
    card.fallbackTitle = String(data.get("card.fallbackTitle") ?? "").trim();
    card.fallbackDescription = String(data.get("card.fallbackDescription") ?? "").trim();
    card.weight = Number(data.get("card.weight") ?? 1);
    card.tags = parseDelimitedList(data.get("card.tags"));
    card.filters ??= {};
    for (const field of FILTER_FIELDS) card.filters[field] = parseDelimitedList(data.get(`card.filters.${field}`));

    if (card.effect) {
      card.effect.target = String(data.get("card.effect.target") ?? "target");
      card.effect.nameKey = String(data.get("card.effect.nameKey") ?? "").trim();
      card.effect.fallbackName = String(data.get("card.effect.fallbackName") ?? "").trim();
    }
  }

  #validateCurrentPack({ sync = true } = {}) {
    if (sync) this.#syncFromForm();
    const pack = this.#currentPack();
    if (!pack) return null;
    try {
      return validatePackDefinition(normalizePackDefinition(pack));
    } catch (error) {
      return {
        valid: false,
        issues: [{ severity: "error", code: "CARD_PACK_NORMALIZATION_FAILED", data: { message: error.message } }],
        errors: [],
        warnings: []
      };
    }
  }

  #markClean() {
    this.cleanSnapshot = JSON.stringify(this.draftPack ?? null);
    this.isDirty = false;
  }

  async #confirmDiscard() {
    if (!this.isDirty) return true;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    const title = game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.DiscardTitle");
    const content = `<p>${game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.DiscardPrompt")}</p>`;
    if (DialogV2?.confirm) return Boolean(await DialogV2.confirm({ window: { title }, content, modal: true }));
    return globalThis.confirm?.(game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.DiscardPrompt")) ?? false;
  }

  async #loadPack(packId) {
    const pack = hydrateRegisteredPack(packId);
    this.selectedPackId = packId;
    this.selectedCardId = pack?.cards?.[0]?.id ?? "";
    this.draftPack = pack && isEditorManagedPack(pack) ? deepClone(pack) : null;
    this.originalPackId = this.draftPack?.id ?? null;
    this.#markClean();
    await this.render({ force: true });
  }

  static async #selectPack(_event, target) {
    this.#syncFromForm();
    if (!await this.#confirmDiscard()) return;
    await this.#loadPack(String(target.dataset.packId ?? ""));
  }

  static async #newPack() {
    this.#syncFromForm();
    if (!await this.#confirmDiscard()) return;
    const ids = new Set(listHydratedRegisteredPacks().map((pack) => pack.id));
    let id = "my-critical-cards";
    let index = 2;
    while (ids.has(id)) id = `my-critical-cards-${index++}`;
    this.draftPack = createEditablePack({ id });
    this.selectedPackId = id;
    this.selectedCardId = "";
    this.originalPackId = null;
    this.isDirty = true;
    await this.render({ force: true });
  }

  static async #duplicatePack() {
    this.#syncFromForm();
    const source = this.#currentPack();
    if (!source) return;
    if (!await this.#confirmDiscard()) return;
    const ids = new Set(listHydratedRegisteredPacks().map((pack) => pack.id));
    let id = `${sanitizeIdentifier(source.id)}-copy`;
    let index = 2;
    while (ids.has(id)) id = `${sanitizeIdentifier(source.id)}-copy-${index++}`;
    const pack = createEditablePack({ id, title: `${source.fallbackTitle ?? source.id} Copy` });
    pack.fallbackDescription = source.fallbackDescription ?? "";
    const usedIds = new Set();
    pack.cards = (source.cards ?? []).map((card) => {
      const clone = cloneCardToPack(card, id, { usedIds });
      usedIds.add(clone.id);
      return clone;
    });
    this.draftPack = pack;
    this.selectedPackId = id;
    this.selectedCardId = pack.cards[0]?.id ?? "";
    this.originalPackId = null;
    this.isDirty = true;
    await this.render({ force: true });
  }

  static async #savePack() {
    this.#syncFromForm();
    const pack = this.#currentPack();
    if (!pack || !isEditorManagedPack(pack)) return;
    const validation = this.#validateCurrentPack({ sync: false });
    if (!validation?.valid) {
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.ValidationFailed"));
      await this.render({ force: true });
      return;
    }
    try {
      const saved = await saveCustomCardPack(pack, { previousId: this.originalPackId });
      this.draftPack = hydrateRegisteredPack(saved.id);
      this.selectedPackId = saved.id;
      this.originalPackId = saved.id;
      this.#markClean();
      await this.render({ force: true });
      ui.notifications.info(game.i18n.format("PF2E_CRITICAL_FORGE.CardEditor.PackSaved", { name: saved.fallbackTitle ?? saved.id }));
    } catch (error) {
      console.error(`${MODULE_ID} | Could not save card pack`, error);
      ui.notifications.error(error.message);
    }
  }

  static async #deletePack() {
    const pack = this.#currentPack();
    if (!pack || !isEditorManagedPack(pack)) return;
    const confirmed = await confirmAction(
      "PF2E_CRITICAL_FORGE.CardEditor.DeletePackTitle",
      "PF2E_CRITICAL_FORGE.CardEditor.DeletePackPrompt"
    );
    if (!confirmed) return;
    await deleteCustomCardPack(pack.id);
    this.draftPack = null;
    this.originalPackId = null;
    this.isDirty = false;
    await this.#loadPack("core");
  }

  static async #importFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await this.#loadImportedPack(await readCardPackImportFile(file));
      } catch (error) {
        this.#notifyImportError(error);
      }
    }, { once: true });
    input.click();
  }

  static async #importClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      await this.#loadImportedPack(parseCardPackImport(text));
    } catch (error) {
      this.#notifyImportError(error);
    }
  }

  async #loadImportedPack(imported) {
    this.#syncFromForm();
    if (!await this.#confirmDiscard()) return;
    let pack = deepClone(imported);
    const existing = hydrateRegisteredPack(pack.id);
    if (existing && !isCustomCardPack(existing)) {
      const originalId = pack.id;
      let id = `${sanitizeIdentifier(originalId)}-imported`;
      let index = 2;
      const ids = new Set(listHydratedRegisteredPacks().map((entry) => entry.id));
      while (ids.has(id)) id = `${sanitizeIdentifier(originalId)}-imported-${index++}`;
      pack = {
        ...createEditablePack({ id, title: pack.fallbackTitle ?? pack.id }),
        ...pack,
        id,
        titleKey: userLocalizationKey(id, "Pack.Title"),
        descriptionKey: userLocalizationKey(id, "Pack.Description"),
        sourceModule: `${MODULE_ID}:world`,
        metadata: { ...(pack.metadata ?? {}), managedBy: MODULE_ID, importedFrom: originalId },
        cards: (() => {
          const usedIds = new Set();
          return (pack.cards ?? []).map((card) => {
            const clone = cloneCardToPack(card, id, { titleSuffix: "", usedIds });
            usedIds.add(clone.id);
            return clone;
          });
        })()
      };
      this.originalPackId = null;
    } else {
      pack.metadata = { ...(pack.metadata ?? {}), managedBy: MODULE_ID, editorVersion: 1 };
      pack.sourceModule = `${MODULE_ID}:world`;
      this.originalPackId = existing && isCustomCardPack(existing) ? pack.id : null;
    }
    this.draftPack = pack;
    this.selectedPackId = pack.id;
    this.selectedCardId = pack.cards?.[0]?.id ?? "";
    this.isDirty = true;
    await this.render({ force: true });
    ui.notifications.info(game.i18n.format("PF2E_CRITICAL_FORGE.CardEditor.PackImported", { count: pack.cards?.length ?? 0 }));
  }

  #notifyImportError(error) {
    console.warn(`${MODULE_ID} | Card pack import failed`, error);
    const suffix = IMPORT_ERROR_KEYS[error?.code] ?? "Unknown";
    const key = `PF2E_CRITICAL_FORGE.CardEditor.ImportErrors.${suffix}`;
    const localized = game.i18n.localize(key);
    ui.notifications.error(localized === key ? error.message : localized);
  }

  static #exportPack() {
    this.#syncFromForm();
    const pack = this.#currentPack();
    if (!pack) return;
    try {
      downloadCardPackExport(pack);
      ui.notifications.info(game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.PackExported"));
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #copyPack() {
    this.#syncFromForm();
    const pack = this.#currentPack();
    if (!pack) return;
    try {
      await navigator.clipboard.writeText(serializeCardPackExport(pack));
      ui.notifications.info(game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.PackCopied"));
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #selectCard(_event, target) {
    this.#syncFromForm();
    this.selectedCardId = String(target.dataset.cardId ?? "");
    await this.render({ force: true });
  }

  static async #newCard() {
    this.#syncFromForm();
    const pack = this.#currentPack();
    if (!pack || !isEditorManagedPack(pack)) return;
    const card = createEditableCard({
      packId: pack.id,
      usedIds: pack.cards.map((entry) => entry.id)
    });
    pack.cards.push(card);
    this.selectedCardId = card.id;
    this.isDirty = true;
    await this.render({ force: true });
  }

  static async #duplicateCard() {
    this.#syncFromForm();
    const source = this.#currentCard();
    if (!source) return;
    let pack = this.#currentPack();
    if (!pack || !isEditorManagedPack(pack)) {
      const existing = listHydratedRegisteredPacks().find((entry) => isEditorManagedPack(entry));
      pack = existing ? deepClone(existing) : createEditablePack();
      this.draftPack = pack;
      this.selectedPackId = pack.id;
      this.originalPackId = existing?.id ?? null;
    }
    const card = cloneCardToPack(source, pack.id, {
      usedIds: pack.cards.map((entry) => entry.id)
    });
    pack.cards.push(card);
    this.selectedCardId = card.id;
    this.isDirty = true;
    await this.render({ force: true });
  }

  static async #deleteCard() {
    this.#syncFromForm();
    const pack = this.#currentPack();
    if (!pack || !isEditorManagedPack(pack)) return;
    const index = pack.cards.findIndex((card) => card.id === this.selectedCardId);
    if (index < 0) return;
    pack.cards.splice(index, 1);
    this.selectedCardId = pack.cards[Math.max(0, index - 1)]?.id ?? "";
    this.isDirty = true;
    await this.render({ force: true });
  }

  static async #editEffect() {
    this.#syncFromForm();
    const card = this.#currentCard();
    const pack = this.#currentPack();
    if (!card || !pack || !isEditorManagedPack(pack)) return;
    const target = card.effect?.target ?? "target";
    const nameKey = card.effect?.nameKey ?? userLocalizationKey(card.id, "EffectName");
    const fallbackName = card.effect?.fallbackName ?? card.fallbackTitle ?? "Critical Card Effect";
    await openEffectForgeDefinition(cardEffectToForgeDefinition(card), {
      fallbackName,
      onCommit: async (definition) => {
        card.effect = forgeDefinitionToCardEffect(card, definition, { target, nameKey, fallbackName });
        card.impact = card.impact === "narrative" ? "light" : card.impact;
        this.isDirty = true;
        await this.render({ force: true });
        this.bringToFront?.();
      }
    });
  }

  static async #clearEffect() {
    this.#syncFromForm();
    const card = this.#currentCard();
    const pack = this.#currentPack();
    if (!card || !pack || !isEditorManagedPack(pack)) return;
    card.effect = null;
    card.impact = "narrative";
    this.isDirty = true;
    await this.render({ force: true });
  }

  static #closeWindow() {
    return this.close();
  }
}

function localizeText(key, fallback, finalFallback) {
  const localized = key ? game.i18n.localize(key) : "";
  return localized && localized !== key ? localized : (fallback || finalFallback);
}

function localizeEffectTarget(target) {
  const suffix = target === "source" ? "Source" : "Target";
  return game.i18n.localize(`PF2E_CRITICAL_FORGE.CardEditor.EffectTargets.${suffix}`);
}

function prepareValidation(validation) {
  if (!validation) return null;
  return {
    valid: validation.valid,
    count: validation.issues?.length ?? 0,
    issues: (validation.issues ?? []).map((issue) => ({
      ...issue,
      text: localizeIssue(issue)
    }))
  };
}

function localizeIssue(issue) {
  const key = `PF2E_CRITICAL_FORGE.CardEditor.ValidationCodes.${issue.code}`;
  const localized = game.i18n.format(key, issue.data ?? {});
  return localized === key ? issue.code : localized;
}

async function confirmAction(titleKey, promptKey) {
  const DialogV2 = foundry.applications?.api?.DialogV2;
  const content = `<p>${game.i18n.localize(promptKey)}</p>`;
  if (DialogV2?.confirm) {
    return Boolean(await DialogV2.confirm({
      window: { title: game.i18n.localize(titleKey) },
      content,
      modal: true
    }));
  }
  return globalThis.confirm?.(game.i18n.localize(promptKey)) ?? false;
}

function optionList(values, selected, group) {
  return values.map((value) => {
    const suffix = value.charAt(0).toUpperCase() + value.slice(1);
    const key = `PF2E_CRITICAL_FORGE.CardEditor.${group}.${suffix}`;
    const localized = game.i18n.localize(key);
    return { value, selected: value === selected, label: localized === key ? value : localized };
  });
}
