import { MODULE_ID, MODULE_VERSION } from "../../constants.js";
import { diagnosePf2eCriticalInput } from "./critical-diagnostic-service.js";
import { publishCriticalCardPreview } from "../presentation/critical-card-preview.js";
import {
  getChatMessageDragData,
  listDiagnosticMessages,
  resolveDiagnosticMessageInput,
  resolveDroppedChatMessage
} from "./chat-message-resolver.js";
import { prepareRuntimeContextView } from "./diagnostic-runtime-view.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DIAGNOSTIC_ICONS = Object.freeze({
  error: "fa-circle-xmark",
  warning: "fa-triangle-exclamation",
  info: "fa-circle-info"
});

export class CriticalDiagnosticApp extends HandlebarsApplicationMixin(ApplicationV2) {
  selectedMessageId = "";
  sourceMessage = null;
  report = null;

  static DEFAULT_OPTIONS = {
    id: "pf2e-critical-forge-diagnostics",
    classes: ["pf2e-critical-forge", "critical-diagnostic"],
    tag: "form",
    window: {
      title: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.WindowTitle",
      icon: "fa-solid fa-microscope",
      resizable: true
    },
    position: {
      width: 1160,
      height: 780
    },
    actions: {
      analyzeSelected: CriticalDiagnosticApp.#analyzeSelected,
      analyzeLatest: CriticalDiagnosticApp.#analyzeLatest,
      clearReport: CriticalDiagnosticApp.#clearReport,
      copyReport: CriticalDiagnosticApp.#copyReport,
      previewCard: CriticalDiagnosticApp.#previewCard,
      closeWindow: CriticalDiagnosticApp.#closeWindow
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/critical-forge/critical-diagnostic-app.hbs`
    }
  };

  async analyzeMessage(message, { render = true } = {}) {
    const resolved = await resolveDiagnosticMessageInput(message);
    const diagnostic = diagnosePf2eCriticalInput(resolved.input);

    this.sourceMessage = message;
    this.selectedMessageId = message.id ?? message._id ?? "";
    this.report = this.#prepareReport(diagnostic, resolved.diagnostics);
    if (render) await this.render({ force: true });
    return this.report;
  }

  async _prepareContext() {
    const messages = listDiagnosticMessages();
    const selectedId = this.selectedMessageId || this.sourceMessage?.id || "";
    const targets = normalizeTargets(game.user?.targets);

    return {
      messages: messages.map((entry) => ({
        ...entry,
        selected: entry.id === selectedId
      })),
      hasMessages: messages.length > 0,
      selectedMessageId: selectedId,
      report: this.report,
      hasReport: Boolean(this.report),
      targetCount: targets.length,
      targetNames: targets.map((token) => token.name ?? token.actor?.name ?? token.id).join(", "),
      targetStatusKey: targets.length === 1
        ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.OneTargetSelected"
        : targets.length > 1
          ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.MultipleTargetsSelected"
          : "PF2E_CRITICAL_FORGE.CriticalDiagnostic.NoTargetSelected",
      moduleVersion: MODULE_VERSION
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    const dropZone = root.querySelector("[data-chat-message-drop-zone]");
    if (!dropZone) return;

    const setActive = (active) => dropZone.classList.toggle("drag-active", active);
    dropZone.addEventListener("dragenter", (event) => {
      event.preventDefault();
      setActive(true);
    });
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setActive(true);
    });
    dropZone.addEventListener("dragleave", (event) => {
      if (!dropZone.contains(event.relatedTarget)) setActive(false);
    });
    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      setActive(false);
      try {
        const data = getChatMessageDragData(event);
        const message = await resolveDroppedChatMessage(data);
        await this.analyzeMessage(message);
      } catch (error) {
        console.warn(`${MODULE_ID} | Critical diagnostic drop failed`, error);
        const key = error.code === "CRITICAL_DIAGNOSTIC_DROP_NOT_CHAT_MESSAGE"
          ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.DropNotMessage"
          : "PF2E_CRITICAL_FORGE.CriticalDiagnostic.DropUnresolved";
        ui.notifications.warn(game.i18n.localize(key));
      }
    });
  }

  #prepareReport(diagnostic, resolverDiagnostics) {
    const snapshot = diagnostic.snapshot ?? null;
    const runtimeView = prepareRuntimeContextView(snapshot);
    const diagnostics = [
      ...resolverDiagnostics,
      ...diagnostic.diagnostics
    ].map((entry) => this.#localizeDiagnostic(entry));

    return {
      valid: diagnostic.valid,
      sourceMessageId: this.sourceMessage?.id ?? "",
      sourceMessageUuid: this.sourceMessage?.uuid ?? "",
      sourceMessageLabel: this.sourceMessage?.speaker?.alias
        ?? this.sourceMessage?.actor?.name
        ?? this.sourceMessage?.id
        ?? "",
      statusClass: diagnostic.valid ? "valid" : "invalid",
      statusIcon: diagnostic.valid ? "fa-circle-check" : "fa-circle-xmark",
      statusText: game.i18n.localize(
        diagnostic.valid
          ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ContextValid"
          : "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ContextInvalid"
      ),
      context: diagnostic.context,
      metadata: diagnostic.metadata,
      snapshot,
      contextJson: JSON.stringify(diagnostic.context, null, 2),
      metadataJson: JSON.stringify(diagnostic.metadata, null, 2),
      snapshotJson: JSON.stringify(snapshot, null, 2),
      reportJson: JSON.stringify({
        valid: diagnostic.valid,
        context: diagnostic.context,
        metadata: diagnostic.metadata,
        snapshot,
        diagnostics: [...resolverDiagnostics, ...diagnostic.diagnostics],
        eligible: diagnostic.eligible.map((entry) => ({
          id: entry.card.id,
          title: entry.localized.title,
          specificity: entry.specificity,
          baseWeight: entry.baseWeight,
          effectiveWeight: entry.effectiveWeight,
          unprofiledWeight: entry.unprofiledWeight,
          profileId: entry.profileId,
          profileMultiplier: entry.profileMultiplier,
          tone: entry.card.tone,
          impact: entry.card.impact,
          matchedFilters: entry.matchedFilters
        })),
        rejected: diagnostic.rejected.map((entry) => ({
          id: entry.card.id,
          title: entry.localized.title,
          rejectedBy: entry.rejectedBy
        }))
      }, null, 2),
      diagnostics,
      hasDiagnostics: diagnostics.length > 0,
      eligible: diagnostic.eligible.map((entry) => this.#prepareCandidate(entry)),
      rejected: diagnostic.rejected.map((entry) => this.#prepareCandidate(entry)),
      eligibleCount: diagnostic.eligible.length,
      rejectedCount: diagnostic.rejected.length,
      totalWeight: diagnostic.totalWeight,
      profileId: diagnostic.profile?.id ?? null,
      profileLabel: this.#localizeProfile(diagnostic.profile?.id),
      triggerAction: this.#localizeTrigger("Behavior", diagnostic.trigger?.behavior),
      triggerScope: this.#localizeTrigger("Scope", diagnostic.trigger?.scope),
      triggerMatched: diagnostic.trigger?.matched
        ? game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.TriggerMatched")
        : game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.TriggerNotMatched"),
      hasEligible: diagnostic.eligible.length > 0,
      hasRejected: diagnostic.rejected.length > 0,
      category: this.#localizeCategory(diagnostic.context.category),
      outcome: diagnostic.metadata.outcome || "—",
      damageTypes: diagnostic.context.damageTypes,
      weaponGroups: diagnostic.context.weaponGroups,
      attackTraits: diagnostic.context.attackTraits,
      saveTypes: diagnostic.context.saveTypes,
      spellTraditions: diagnostic.context.spellTraditions,
      spellTraits: diagnostic.context.spellTraits,
      sourceTraits: diagnostic.context.sourceTraits,
      targetTraits: diagnostic.context.targetTraits,
      ...runtimeView
    };
  }

  #prepareCandidate(entry) {
    return {
      id: entry.card.id,
      packId: entry.card.packId,
      title: entry.localized.title,
      description: entry.localized.description,
      specificity: entry.specificity,
      baseWeight: entry.baseWeight,
      effectiveWeight: entry.effectiveWeight,
      unprofiledWeight: entry.unprofiledWeight,
      profileId: entry.profileId,
      profileMultiplier: entry.profileMultiplier,
      tone: entry.card.tone,
      toneLabel: this.#localizeCardAttribute("Tones", entry.card.tone),
      impact: entry.card.impact,
      impactLabel: this.#localizeCardAttribute("Impacts", entry.card.impact),
      matchedFilters: entry.matchedFilters.map((match) => ({
        label: this.#localizeFilter(match.filter),
        values: match.values.join(", ")
      })),
      rejectedReasons: entry.rejectedBy.map((reason) => this.#localizeFilter(reason)),
      hasMatches: entry.matchedFilters.length > 0,
      hasRejections: entry.rejectedBy.length > 0
    };
  }



  #localizeTrigger(group, value) {
    const suffixes = {
      Behavior: { disabled: "Disabled", prompt: "Prompt", automatic: "Automatic", ignore: "Disabled" },
      Scope: { all: "All", natural: "Natural" }
    };
    const setting = group === "Behavior" ? "CriticalHitBehavior" : "CriticalHitTrigger";
    const suffix = suffixes[group]?.[value];
    const key = suffix ? `PF2E_CRITICAL_FORGE.Settings.${setting}.Choices.${suffix}` : "";
    const localized = key ? game.i18n.localize(key) : value;
    return localized && localized !== key ? localized : value ?? "—";
  }

  #localizeProfile(profile) {
    if (!profile) return "—";
    const suffix = { relaxed: "Relaxed", balanced: "Balanced", dramatic: "Dramatic", brutal: "Brutal", custom: "Custom" }[profile];
    const key = suffix ? `PF2E_CRITICAL_FORGE.Settings.CriticalCardProfile.Choices.${suffix}` : "";
    const localized = key ? game.i18n.localize(key) : profile;
    return localized && localized !== key ? localized : profile;
  }

  #localizeCategory(category) {
    if (!category) return "—";
    const suffix = category.charAt(0).toUpperCase() + category.slice(1);
    const key = `PF2E_CRITICAL_FORGE.CardEditor.Categories.${suffix}`;
    const localized = game.i18n.localize(key);
    return localized && localized !== key ? localized : category;
  }

  #localizeCardAttribute(group, value) {
    const key = `PF2E_CRITICAL_FORGE.CriticalPreview.${group}.${value}`;
    const localized = game.i18n.localize(key);
    return localized && localized !== key ? localized : value;
  }

  #localizeDiagnostic(entry) {
    const key = `PF2E_CRITICAL_FORGE.CriticalDiagnostic.Diagnostics.${entry.code}`;
    const localized = game.i18n.format(key, entry.data ?? {});
    return {
      ...entry,
      icon: DIAGNOSTIC_ICONS[entry.severity] ?? DIAGNOSTIC_ICONS.info,
      text: localized === key ? entry.code : localized
    };
  }

  #localizeFilter(filter) {
    const key = `PF2E_CRITICAL_FORGE.CriticalDiagnostic.Filters.${filter}`;
    const localized = game.i18n.localize(key);
    return localized === key ? filter : localized;
  }

  #selectedMessageIdFromForm() {
    const form = this.element;
    if (!(form instanceof HTMLFormElement)) return this.selectedMessageId;
    return String(new FormData(form).get("messageId") ?? this.selectedMessageId ?? "");
  }

  static async #analyzeSelected() {
    const id = this.#selectedMessageIdFromForm();
    const message = game.messages?.get?.(id)
      ?? listDiagnosticMessages().find((entry) => entry.id === id)?.message;
    if (!message) {
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.SelectMessage"));
      return;
    }
    await this.analyzeMessage(message);
  }

  static async #analyzeLatest() {
    const latest = listDiagnosticMessages({ limit: 1 })[0]?.message;
    if (!latest) {
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.NoMessages"));
      return;
    }
    await this.analyzeMessage(latest);
  }

  static #clearReport() {
    this.report = null;
    this.sourceMessage = null;
    this.selectedMessageId = "";
    return this.render({ force: true });
  }

  static async #copyReport() {
    if (!this.report?.reportJson) return;
    try {
      await navigator.clipboard.writeText(this.report.reportJson);
      ui.notifications.info(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReportCopied"));
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not copy diagnostic report`, error);
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.CopyFailed"));
    }
  }

  static async #previewCard(_event, target) {
    const cardId = String(target?.dataset?.cardId ?? "");
    const candidate = this.report?.eligible?.find((entry) => entry.id === cardId);
    if (!candidate) {
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalPreview.CardUnavailable"));
      return;
    }

    try {
      await publishCriticalCardPreview(cardId, {
        context: this.report.context,
        metadata: this.report.metadata,
        sourceMessage: this.sourceMessage
      });
      ui.notifications.info(game.i18n.format(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Posted",
        { title: candidate.title }
      ));
    } catch (error) {
      console.error(`${MODULE_ID} | Could not publish Critical Forge card preview`, error);
      ui.notifications.error(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalPreview.PublishFailed"));
    }
  }

  static #closeWindow() {
    return this.close();
  }
}

function normalizeTargets(targets) {
  if (!targets) return [];
  if (targets instanceof Set) return [...targets];
  if (Array.isArray(targets)) return targets;
  if (typeof targets[Symbol.iterator] === "function") return [...targets];
  return [];
}
