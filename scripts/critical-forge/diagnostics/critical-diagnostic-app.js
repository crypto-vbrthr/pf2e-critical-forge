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
import { prepareDiagnosticConditionEvaluation } from "./diagnostic-condition-view.js";
import {
  compareDiagnosticEvaluations,
  createDiagnosticEvaluationReport,
  createDiagnosticReportExport,
  serializeDiagnosticEvaluationReport,
  withDiagnosticReplay,
  withDiagnosticSimulation
} from "./diagnostic-report.js";
import { criticalDiagnosticHistory } from "./diagnostic-history.js";
import { replayDiagnosticSnapshot } from "./diagnostic-replay.js";
import { simulateDiagnosticCard } from "./diagnostic-simulation.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DIAGNOSTIC_ICONS = Object.freeze({
  error: "fa-circle-xmark",
  warning: "fa-triangle-exclamation",
  info: "fa-circle-info"
});

export class CriticalDiagnosticApp extends HandlebarsApplicationMixin(ApplicationV2) {
  selectedMessageId = "";
  selectedHistoryId = "";
  sourceMessage = null;
  analysisInput = null;
  evaluationReport = null;
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
    position: { width: 1240, height: 820 },
    actions: {
      analyzeSelected: CriticalDiagnosticApp.#analyzeSelected,
      analyzeLatest: CriticalDiagnosticApp.#analyzeLatest,
      clearReport: CriticalDiagnosticApp.#clearReport,
      copyReport: CriticalDiagnosticApp.#copyReport,
      exportReport: CriticalDiagnosticApp.#exportReport,
      previewCard: CriticalDiagnosticApp.#previewCard,
      simulateCard: CriticalDiagnosticApp.#simulateCard,
      replaySnapshot: CriticalDiagnosticApp.#replaySnapshot,
      replayCurrent: CriticalDiagnosticApp.#replayCurrent,
      loadHistory: CriticalDiagnosticApp.#loadHistory,
      clearHistory: CriticalDiagnosticApp.#clearHistory,
      closeWindow: CriticalDiagnosticApp.#closeWindow
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/critical-forge/critical-diagnostic-app.hbs` }
  };

  async analyzeMessage(message, {
    render = true,
    origin = "manual",
    comparisonBase = null
  } = {}) {
    const resolved = await resolveDiagnosticMessageInput(message);
    const diagnostic = diagnosePf2eCriticalInput(resolved.input);
    let evaluation = createDiagnosticEvaluationReport(diagnostic, {
      sourceMessage: message,
      resolverDiagnostics: resolved.diagnostics,
      origin
    });
    if (comparisonBase) {
      evaluation = withDiagnosticReplay(
        evaluation,
        compareDiagnosticEvaluations(comparisonBase, evaluation, { mode: "current" })
      );
    }

    this.sourceMessage = message;
    this.analysisInput = resolved.input;
    this.selectedMessageId = message.id ?? message._id ?? "";
    this.selectedHistoryId = evaluation.id;
    this.evaluationReport = criticalDiagnosticHistory.record(evaluation);
    this.report = this.#prepareReport(this.evaluationReport);
    if (render) await this.render({ force: true });
    return this.report;
  }

  async _prepareContext() {
    const messages = listDiagnosticMessages();
    const selectedId = this.selectedMessageId || this.sourceMessage?.id || "";
    const targets = normalizeTargets(game.user?.targets);
    const history = criticalDiagnosticHistory.list().map((entry) => ({
      id: entry.id,
      selected: entry.id === this.selectedHistoryId,
      label: entry.source?.label ?? entry.source?.messageId ?? entry.id,
      origin: this.#localizeOrigin(entry.origin),
      time: formatTime(entry.createdAt),
      statusClass: entry.valid ? "valid" : "invalid",
      eligibleCount: entry.phases?.selection?.counts?.eligible ?? 0,
      selectedCard: entry.phases?.selection?.selected?.title ?? entry.phases?.selection?.selected?.id ?? ""
    }));

    return {
      messages: messages.map((entry) => ({ ...entry, selected: entry.id === selectedId })),
      hasMessages: messages.length > 0,
      selectedMessageId: selectedId,
      report: this.report,
      hasReport: Boolean(this.report),
      history,
      hasHistory: history.length > 0,
      historyCount: history.length,
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
    dropZone.addEventListener("dragenter", (event) => { event.preventDefault(); setActive(true); });
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

  #prepareReport(evaluation) {
    const selection = evaluation.phases.selection;
    const runtimeView = prepareRuntimeContextView(evaluation.snapshot);
    const diagnostics = evaluation.phases.context.diagnostics.map((entry) => this.#localizeDiagnostic(entry));
    const simulation = evaluation.phases.application.simulation;
    const actual = evaluation.phases.application.actual;
    const replay = evaluation.replay;

    return {
      reportId: evaluation.id,
      reportVersion: evaluation.reportVersion,
      createdAt: formatTime(evaluation.createdAt),
      originLabel: this.#localizeOrigin(evaluation.origin),
      valid: evaluation.valid,
      sourceMessageId: evaluation.source.messageId ?? "",
      sourceMessageUuid: evaluation.source.messageUuid ?? "",
      sourceMessageLabel: evaluation.source.label ?? "",
      statusClass: evaluation.valid ? "valid" : "invalid",
      statusIcon: evaluation.valid ? "fa-circle-check" : "fa-circle-xmark",
      statusText: game.i18n.localize(evaluation.valid
        ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ContextValid"
        : "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ContextInvalid"),
      context: evaluation.context,
      metadata: evaluation.metadata,
      snapshot: evaluation.snapshot,
      contextJson: JSON.stringify(evaluation.context, null, 2),
      metadataJson: JSON.stringify(evaluation.metadata, null, 2),
      snapshotJson: JSON.stringify(evaluation.snapshot, null, 2),
      reportJson: serializeDiagnosticEvaluationReport(evaluation),
      diagnostics,
      hasDiagnostics: diagnostics.length > 0,
      eligible: selection.eligible.map((entry) => this.#prepareCandidate(entry)),
      rejected: selection.rejected.map((entry) => this.#prepareCandidate(entry)),
      eligibleCount: selection.counts.eligible,
      rejectedCount: selection.counts.rejected,
      totalWeight: selection.totalWeight,
      requestedDeckType: selection.requestedDeckType ?? evaluation.context.deckType ?? "default",
      requestedDeckLabel: this.#localizeDeck(selection.requestedDeckType ?? evaluation.context.deckType ?? "default"),
      profileId: selection.profile?.id ?? null,
      profileLabel: this.#localizeProfile(selection.profile?.id),
      triggerAction: this.#localizeTrigger("Behavior", selection.trigger?.behavior),
      triggerScope: this.#localizeTrigger("Scope", selection.trigger?.scope),
      triggerMatched: selection.trigger?.matched
        ? game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.TriggerMatched")
        : game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.TriggerNotMatched"),
      hasEligible: selection.eligible.length > 0,
      hasRejected: selection.rejected.length > 0,
      category: this.#localizeCategory(evaluation.context.category),
      outcome: evaluation.metadata.outcome || "—",
      damageTypes: evaluation.context.damageTypes ?? [],
      weaponGroups: evaluation.context.weaponGroups ?? [],
      attackTraits: evaluation.context.attackTraits ?? [],
      saveTypes: evaluation.context.saveTypes ?? [],
      spellTraditions: evaluation.context.spellTraditions ?? [],
      spellTraits: evaluation.context.spellTraits ?? [],
      sourceTraits: evaluation.context.sourceTraits ?? [],
      targetTraits: evaluation.context.targetTraits ?? [],
      contextPhaseStatus: this.#localizePhaseStatus(evaluation.phases.context.status),
      selectionPhaseStatus: this.#localizePhaseStatus(selection.status),
      applicationPhaseStatus: this.#localizePhaseStatus(evaluation.phases.application.status),
      selectedCard: selection.selected?.title ?? selection.selected?.id ?? "—",
      selectionMethod: selection.method ?? "—",
      simulation: this.#prepareSimulation(simulation),
      hasSimulation: Boolean(simulation),
      actualApplication: this.#prepareActualApplication(actual),
      hasActualApplication: Boolean(actual),
      replay: this.#prepareReplay(replay),
      hasReplay: Boolean(replay),
      canReplayCurrent: Boolean(evaluation.source.messageId || evaluation.source.messageUuid),
      ...runtimeView
    };
  }

  #prepareCandidate(entry) {
    return {
      id: entry.id,
      packId: entry.packId,
      title: entry.title,
      description: entry.description,
      specificity: entry.specificity,
      baseWeight: entry.baseWeight,
      effectiveWeight: entry.effectiveWeight,
      unprofiledWeight: entry.unprofiledWeight,
      profileId: entry.profileId,
      profileMultiplier: entry.profileMultiplier,
      tone: entry.tone,
      toneLabel: this.#localizeCardAttribute("Tones", entry.tone),
      impact: entry.impact,
      impactLabel: this.#localizeCardAttribute("Impacts", entry.impact),
      deckType: entry.deckType ?? "default",
      deckLabel: this.#localizeDeck(entry.deckType ?? "default"),
      activeDeckType: entry.activeDeckType ?? null,
      activeDeckLabel: this.#localizeDeck(entry.activeDeckType ?? "default"),
      requestedDeckType: entry.requestedDeckType ?? "default",
      requestedDeckLabel: this.#localizeDeck(entry.requestedDeckType ?? "default"),
      conditionEvaluation: prepareDiagnosticConditionEvaluation(entry.conditionEvaluation),
      hasConditions: Boolean(entry.conditionEvaluation?.configured),
      matchedFilters: entry.matchedFilters.map((match) => ({
        label: this.#localizeFilter(match.filter),
        values: match.values.join(", ")
      })),
      rejectedReasons: entry.rejectedBy.map((reason) => this.#localizeFilter(reason)),
      hasMatches: entry.matchedFilters.length > 0,
      hasRejections: entry.rejectedBy.length > 0
    };
  }

  #prepareSimulation(simulation) {
    if (!simulation) return null;
    return {
      ...simulation,
      statusLabel: this.#localizePhaseStatus(simulation.status),
      targetLabel: simulation.targetActorName ?? simulation.targetActorUuid ?? "—",
      duration: simulation.summary?.duration ?? "—",
      components: simulation.summary?.components ?? [],
      hasComponents: (simulation.summary?.components?.length ?? 0) > 0,
      validationIssues: simulation.validation?.issues ?? [],
      hasValidationIssues: (simulation.validation?.issues?.length ?? 0) > 0
    };
  }

  #prepareActualApplication(actual) {
    if (!actual) return null;
    return {
      ...actual,
      statusLabel: this.#localizePhaseStatus(actual.status),
      statusClass: actual.valid ? "valid" : "invalid",
      targetLabel: actual.targetActorName ?? actual.targetActorUuid ?? "—",
      effectIds: actual.createdEffectIds ?? [],
      hasEffectIds: (actual.createdEffectIds?.length ?? 0) > 0,
      appliedByLabel: actual.appliedBy?.name ?? actual.appliedBy?.id ?? "—",
      appliedAtLabel: actual.appliedAt ? formatTime(actual.appliedAt) : "—"
    };
  }

  #prepareReplay(replay) {
    if (!replay) return null;
    return {
      ...replay,
      modeLabel: replay.mode === "current"
        ? game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReplayCurrent")
        : game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReplaySnapshot"),
      statusClass: replay.matched ? "valid" : "warning",
      statusText: game.i18n.localize(replay.matched
        ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReplayMatched"
        : "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReplayChanged"),
      changes: (replay.changes ?? []).map((change) => ({
        field: change.field,
        before: JSON.stringify(change.before),
        after: JSON.stringify(change.after)
      }))
    };
  }

  #localizePhaseStatus(status) {
    const key = `PF2E_CRITICAL_FORGE.CriticalDiagnostic.PhaseStatuses.${status}`;
    const localized = game.i18n.localize(key);
    return localized === key ? status ?? "—" : localized;
  }

  #localizeOrigin(origin) {
    const key = `PF2E_CRITICAL_FORGE.CriticalDiagnostic.Origins.${origin}`;
    const localized = game.i18n.localize(key);
    return localized === key ? origin ?? "—" : localized;
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
    return { ...entry, icon: DIAGNOSTIC_ICONS[entry.severity] ?? DIAGNOSTIC_ICONS.info, text: localized === key ? entry.code : localized };
  }

  #localizeDeck(deckType) {
    const suffix = String(deckType ?? "default").charAt(0).toUpperCase() + String(deckType ?? "default").slice(1);
    const key = `PF2E_CRITICAL_FORGE.CardEditor.DeckTypes.${suffix}`;
    const localized = game.i18n.localize(key);
    return localized === key ? deckType ?? "default" : localized;
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

  async #resolveSourceMessage() {
    if (this.sourceMessage) return this.sourceMessage;
    const source = this.evaluationReport?.source;
    if (source?.messageId) {
      const message = game.messages?.get?.(source.messageId);
      if (message) return message;
    }
    if (source?.messageUuid && typeof globalThis.fromUuid === "function") {
      return globalThis.fromUuid(source.messageUuid);
    }
    return null;
  }

  static async #analyzeSelected() {
    const id = this.#selectedMessageIdFromForm();
    const message = game.messages?.get?.(id) ?? listDiagnosticMessages().find((entry) => entry.id === id)?.message;
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
    this.evaluationReport = null;
    this.analysisInput = null;
    this.sourceMessage = null;
    this.selectedMessageId = "";
    this.selectedHistoryId = "";
    return this.render({ force: true });
  }

  static async #copyReport() {
    if (!this.evaluationReport) return;
    try {
      await navigator.clipboard.writeText(serializeDiagnosticEvaluationReport(this.evaluationReport));
      ui.notifications.info(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReportCopied"));
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not copy diagnostic report`, error);
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.CopyFailed"));
    }
  }

  static #exportReport() {
    if (!this.evaluationReport) return;
    try {
      const exported = createDiagnosticReportExport(this.evaluationReport);
      const blob = new Blob([exported.content], { type: exported.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exported.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      ui.notifications.info(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReportExported"));
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not export diagnostic report`, error);
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ExportFailed"));
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
        context: this.evaluationReport.context,
        metadata: this.evaluationReport.metadata,
        runtimeSnapshot: this.evaluationReport.snapshot,
        sourceMessage: await this.#resolveSourceMessage()
      });
      ui.notifications.info(game.i18n.format("PF2E_CRITICAL_FORGE.CriticalPreview.Posted", { title: candidate.title }));
    } catch (error) {
      console.error(`${MODULE_ID} | Could not publish Critical Forge card preview`, error);
      ui.notifications.error(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalPreview.PublishFailed"));
    }
  }

  static async #simulateCard(_event, target) {
    const cardId = String(target?.dataset?.cardId ?? "");
    if (!cardId || !this.evaluationReport) return;
    let input = this.analysisInput;
    if (!input) {
      const message = await this.#resolveSourceMessage();
      if (message) input = (await resolveDiagnosticMessageInput(message)).input;
    }
    const simulation = await simulateDiagnosticCard(cardId, { input: input ?? {} });
    this.evaluationReport = withDiagnosticSimulation(this.evaluationReport, simulation);
    criticalDiagnosticHistory.record(this.evaluationReport);
    this.report = this.#prepareReport(this.evaluationReport);
    await this.render({ force: true });
  }

  static async #replaySnapshot() {
    if (!this.evaluationReport) return;
    const { repeated } = replayDiagnosticSnapshot(this.evaluationReport);
    this.evaluationReport = criticalDiagnosticHistory.record(repeated);
    this.selectedHistoryId = repeated.id;
    this.report = this.#prepareReport(repeated);
    await this.render({ force: true });
  }

  static async #replayCurrent() {
    if (!this.evaluationReport) return;
    const message = await this.#resolveSourceMessage();
    if (!message) {
      ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.ReplaySourceMissing"));
      return;
    }
    await this.analyzeMessage(message, { origin: "current-replay", comparisonBase: this.evaluationReport });
  }

  static async #loadHistory(_event, target) {
    const reportId = String(target?.dataset?.reportId ?? "");
    const evaluation = criticalDiagnosticHistory.get(reportId);
    if (!evaluation) return;
    this.evaluationReport = evaluation;
    this.selectedHistoryId = evaluation.id;
    this.selectedMessageId = evaluation.source?.messageId ?? "";
    this.sourceMessage = null;
    this.analysisInput = null;
    this.report = this.#prepareReport(evaluation);
    await this.render({ force: true });
  }

  static async #clearHistory() {
    criticalDiagnosticHistory.clear();
    this.selectedHistoryId = "";
    await this.render({ force: true });
  }

  static #closeWindow() { return this.close(); }
}

function normalizeTargets(targets) {
  if (!targets) return [];
  if (targets instanceof Set) return [...targets];
  if (Array.isArray(targets)) return targets;
  if (typeof targets[Symbol.iterator] === "function") return [...targets];
  return [];
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp));
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
