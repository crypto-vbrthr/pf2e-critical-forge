import { MODULE_ID } from "../../constants.js";
import { applyEffectToTargets } from "../../effect-engine/effect-application.js";
import { analyzeEffectDefinition } from "../../effect-engine/validation/validation-engine.js";
import { resolveDiagnosticMessageInput } from "../diagnostics/chat-message-resolver.js";
import { criticalDiagnosticHistory } from "../diagnostics/diagnostic-history.js";
import { withDiagnosticApplication } from "../diagnostics/diagnostic-report.js";

export const CRITICAL_CARD_APPLICATION_STATUSES = Object.freeze({
  PENDING: "pending",
  APPLYING: "applying",
  APPLIED: "applied",
  NOT_APPLICABLE: "not-applicable"
});

const applicationLocks = new Set();
let initialized = false;

export function initializeCriticalCardApplicationUi() {
  if (initialized) return;
  initialized = true;
  Hooks.on("renderChatMessageHTML", renderCriticalCardApplication);
  console.info(`${MODULE_ID} | Critical card application UI initialized.`);
}

export function getCriticalCardPreviewData(message) {
  return message?.flags?.[MODULE_ID]?.criticalCardPreview
    ?? message?.getFlag?.(MODULE_ID, "criticalCardPreview")
    ?? null;
}

export async function resolveCriticalCardEffectTarget(previewData, {
  fromUuidFn = defaultFromUuid,
  actors = globalThis.game?.actors,
  resolveMessageInputFn = resolveDiagnosticMessageInput
} = {}) {
  const role = previewData?.effect?.target;
  if (!role || !["source", "target"].includes(role)) {
    return Object.freeze({ actor: null, role, reference: null, code: "CRITICAL_CARD_TARGET_ROLE_INVALID" });
  }

  const storedTarget = await resolveStoredActor(previewData?.metadata?.[role], {
    role,
    fromUuidFn,
    actors
  });

  if (role === "source" && String(previewData?.category ?? "").startsWith("savingThrow")) {
    // A save card targeting "source" must affect the creature that rolled the
    // save. The stored participant snapshot is authoritative unless it
    // collapses onto the recorded origin as well, which signals stale or
    // ambiguous PF2e chat metadata. Only then re-read the source message.
    const storedOrigin = await resolveStoredActor(previewData?.metadata?.target, {
      role: "target",
      fromUuidFn,
      actors
    });
    if (storedTarget.actor && !sameActor(storedTarget.actor, storedOrigin.actor)) return storedTarget;

    const liveRoller = await resolveSavingThrowRoller(previewData, {
      fromUuidFn,
      actors,
      resolveMessageInputFn
    });
    if (liveRoller?.actor && !sameActor(liveRoller.actor, storedOrigin.actor)) return liveRoller;
    if (storedTarget.actor) return storedTarget;
    if (liveRoller?.actor) return liveRoller;
  } else if (storedTarget.actor) {
    return storedTarget;
  }

  return Object.freeze({
    actor: null,
    role,
    reference: storedTarget.reference,
    code: "CRITICAL_CARD_TARGET_UNRESOLVED"
  });
}

async function resolveStoredActor(metadata = {}, { role, fromUuidFn, actors }) {
  const references = [metadata?.token, metadata?.uuid].filter(Boolean);
  for (const reference of references) {
    try {
      const document = await fromUuidFn(reference);
      const actor = resolveActor(document);
      if (actor) return Object.freeze({ actor, role, reference, code: null, resolvedBy: "preview-metadata" });
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not resolve Critical Forge target reference ${reference}`, error);
    }
  }

  const actor = metadata?.id ? actors?.get?.(metadata.id) ?? null : null;
  if (actor) {
    return Object.freeze({
      actor,
      role,
      reference: actor.uuid ?? metadata.uuid ?? metadata.id,
      code: null,
      resolvedBy: "preview-metadata"
    });
  }

  return Object.freeze({
    actor: null,
    role,
    reference: references[0] ?? metadata?.id ?? null,
    code: "CRITICAL_CARD_TARGET_UNRESOLVED"
  });
}

export async function inspectCriticalCardApplication(message, {
  user = globalThis.game?.user,
  fromUuidFn = defaultFromUuid,
  analyzeFn = analyzeEffectDefinition
} = {}) {
  const previewData = getCriticalCardPreviewData(message);
  if (!previewData) return applicationFailure("CRITICAL_CARD_PREVIEW_MISSING");
  if (!previewData.effect?.definition) return applicationFailure("CRITICAL_CARD_EFFECT_MISSING", { previewData });
  if (!user?.isGM) return applicationFailure("CRITICAL_CARD_APPLY_GM_ONLY", { previewData });

  const status = previewData.application?.status ?? CRITICAL_CARD_APPLICATION_STATUSES.PENDING;
  if (status === CRITICAL_CARD_APPLICATION_STATUSES.APPLIED) {
    return applicationFailure("CRITICAL_CARD_ALREADY_APPLIED", { previewData });
  }

  const target = await resolveCriticalCardEffectTarget(previewData, { fromUuidFn });
  if (!target.actor) return applicationFailure(target.code, { previewData, target });

  const validation = analyzeFn(previewData.effect.definition, { target: target.actor });
  if (!validation?.valid) {
    return applicationFailure("CRITICAL_CARD_EFFECT_INVALID", {
      previewData,
      target,
      validation
    });
  }

  return Object.freeze({
    valid: true,
    code: null,
    previewData,
    target,
    actor: target.actor,
    definition: previewData.effect.definition,
    validation
  });
}

export async function applyCriticalCardEffect(message, {
  user = globalThis.game?.user,
  fromUuidFn = defaultFromUuid,
  analyzeFn = analyzeEffectDefinition,
  applyEffectFn = applyEffectToTargets,
  updateMessageFn = defaultUpdateMessage,
  now = () => Date.now()
} = {}) {
  const messageId = message?.uuid ?? message?.id ?? message?._id ?? "unknown";
  if (applicationLocks.has(messageId)) {
    return applicationFailure("CRITICAL_CARD_APPLICATION_IN_PROGRESS");
  }

  applicationLocks.add(messageId);
  try {
    const inspection = await inspectCriticalCardApplication(message, { user, fromUuidFn, analyzeFn });
    if (!inspection.valid) {
      recordApplicationDiagnostic(
        inspection.previewData ?? getCriticalCardPreviewData(message),
        { valid: false, code: inspection.code, status: "failed", appliedAt: now() }
      );
      return inspection;
    }

    const created = await applyEffectFn(inspection.definition, inspection.actor, {
      context: { target: inspection.actor }
    });
    const createdDocuments = Array.isArray(created) ? created : [created].filter(Boolean);
    const application = {
      status: CRITICAL_CARD_APPLICATION_STATUSES.APPLIED,
      appliedAt: now(),
      appliedBy: {
        id: user?.id ?? null,
        name: user?.name ?? null
      },
      targetActorUuid: inspection.actor?.uuid ?? inspection.target.reference ?? null,
      targetActorName: inspection.actor?.name ?? null,
      createdEffectIds: createdDocuments
        .map((document) => document?.uuid ?? document?.id)
        .filter(Boolean)
    };

    await updateMessageFn(message, application);
    recordApplicationDiagnostic(inspection.previewData, {
      valid: true,
      code: null,
      status: application.status,
      appliedAt: application.appliedAt,
      appliedBy: application.appliedBy,
      targetActorUuid: application.targetActorUuid,
      targetActorName: application.targetActorName,
      createdEffectIds: application.createdEffectIds
    });
    return Object.freeze({
      valid: true,
      code: null,
      actor: inspection.actor,
      validation: inspection.validation,
      application: Object.freeze(application),
      created: createdDocuments
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Critical card effect application failed`, error);
    recordApplicationDiagnostic(getCriticalCardPreviewData(message), {
      valid: false,
      code: "CRITICAL_CARD_APPLICATION_FAILED",
      status: "failed",
      appliedAt: now()
    });
    return applicationFailure("CRITICAL_CARD_APPLICATION_FAILED", { error });
  } finally {
    applicationLocks.delete(messageId);
  }
}

export function renderCriticalCardApplication(message, html) {
  const previewData = getCriticalCardPreviewData(message);
  if (!previewData) return;

  const root = elementLike(html) ? html : html?.[0];
  if (!elementLike(root)) return;
  const card = root.matches?.(".pf2e-critical-card-preview")
    ? root
    : root.querySelector?.(".pf2e-critical-card-preview");
  if (!card) return;

  const container = card.querySelector?.("[data-critical-card-application]");
  const button = card.querySelector?.('[data-action="apply-critical-card-effect"]');
  const statusElement = card.querySelector?.("[data-critical-card-application-status]");
  if (!container) return;

  const application = previewData.application ?? {};
  const status = application.status ?? CRITICAL_CARD_APPLICATION_STATUSES.PENDING;
  updateApplicationPresentation({ container, button, statusElement, status, application });

  if (!globalThis.game?.user?.isGM) {
    button?.remove?.();
    return;
  }
  if (!button || status !== CRITICAL_CARD_APPLICATION_STATUSES.PENDING) return;
  if (button.dataset?.criticalForgeBound === "true") return;
  if (button.dataset) button.dataset.criticalForgeBound = "true";

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    setStatusText(statusElement, localize("PF2E_CRITICAL_FORGE.CriticalPreview.Application.Applying", "Applying effect…"));

    const result = await applyCriticalCardEffect(message);
    if (result.valid) {
      updateApplicationPresentation({
        container,
        button,
        statusElement,
        status: CRITICAL_CARD_APPLICATION_STATUSES.APPLIED,
        application: result.application
      });
      globalThis.ui?.notifications?.info?.(format(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Application.AppliedNotification",
        { target: result.actor?.name ?? "" },
        `Effect applied to ${result.actor?.name ?? "target"}.`
      ));
      return;
    }

    button.disabled = false;
    setStatusText(statusElement, applicationErrorText(result.code));
    const notifier = result.code === "CRITICAL_CARD_ALREADY_APPLIED" ? "warn" : "error";
    globalThis.ui?.notifications?.[notifier]?.(applicationErrorText(result.code));
  });
}

function updateApplicationPresentation({ container, button, statusElement, status, application }) {
  container.dataset.applicationStatus = status;
  if (status === CRITICAL_CARD_APPLICATION_STATUSES.APPLIED) {
    if (button) {
      button.disabled = true;
      button.innerHTML = `<i class="fa-solid fa-check"></i><span>${escapeHtml(localize(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Application.Applied",
        "Applied"
      ))}</span>`;
    }
    setStatusText(statusElement, format(
      "PF2E_CRITICAL_FORGE.CriticalPreview.Application.AppliedStatus",
      {
        target: application?.targetActorName ?? "",
        user: application?.appliedBy?.name ?? ""
      },
      `Applied to ${application?.targetActorName ?? "target"}.`
    ));
    return;
  }

  if (status === CRITICAL_CARD_APPLICATION_STATUSES.NOT_APPLICABLE) {
    button?.remove?.();
    setStatusText(statusElement, "");
    return;
  }

  setStatusText(statusElement, localize(
    "PF2E_CRITICAL_FORGE.CriticalPreview.Application.Pending",
    "Not yet applied"
  ));
}

async function resolveSavingThrowRoller(previewData, { fromUuidFn, actors, resolveMessageInputFn }) {
  const sourceMessageUuid = previewData?.sourceMessageUuid;
  if (!sourceMessageUuid || typeof fromUuidFn !== "function" || typeof resolveMessageInputFn !== "function") return null;

  try {
    const sourceMessage = await fromUuidFn(sourceMessageUuid);
    if (!sourceMessage) return null;
    const resolved = await resolveMessageInputFn(sourceMessage, {
      fromUuidFn,
      actors,
      targetTokens: [],
      user: null
    });
    const actor = resolved?.input?.sourceActor ?? resolved?.input?.sourceToken?.actor ?? null;
    if (!actor) return null;
    const token = resolved?.input?.sourceToken ?? null;
    return Object.freeze({
      actor,
      role: "source",
      reference: token?.uuid ?? actor.uuid ?? actor.id ?? null,
      code: null,
      resolvedBy: "source-message-roller"
    });
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not re-resolve the saving-throw roller from ${sourceMessageUuid}`, error);
    return null;
  }
}

function resolveActor(document) {
  if (!document) return null;
  if (document.documentName === "Actor") return document;
  if (document.actor?.documentName === "Actor") return document.actor;
  if (document.document?.actor?.documentName === "Actor") return document.document.actor;
  return null;
}

function sameActor(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  const leftUuid = left.uuid ?? null;
  const rightUuid = right.uuid ?? null;
  if (leftUuid && rightUuid) return String(leftUuid) === String(rightUuid);
  const leftId = left.id ?? left._id ?? null;
  const rightId = right.id ?? right._id ?? null;
  return Boolean(leftId && rightId && String(leftId) === String(rightId));
}

function recordApplicationDiagnostic(previewData, actual) {
  const sourceMessageUuid = previewData?.sourceMessageUuid;
  const existing = criticalDiagnosticHistory.findBySourceMessageUuid(sourceMessageUuid);
  if (!existing) return null;
  const updated = withDiagnosticApplication(existing, actual);
  return criticalDiagnosticHistory.record(updated);
}

function applicationFailure(code, extra = {}) {
  return Object.freeze({ valid: false, code, ...extra });
}

function applicationErrorText(code) {
  const key = `PF2E_CRITICAL_FORGE.CriticalPreview.Application.Errors.${code}`;
  return localize(key, code ?? "Critical Forge application failed.");
}

function setStatusText(element, text) {
  if (element) element.textContent = text ?? "";
}

function localize(key, fallback) {
  const localized = globalThis.game?.i18n?.localize?.(key);
  return localized && localized !== key ? localized : fallback;
}

function format(key, data, fallback) {
  const localized = globalThis.game?.i18n?.format?.(key, data);
  return localized && localized !== key ? localized : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function elementLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.querySelector === "function");
}

function defaultFromUuid(uuid) {
  if (typeof globalThis.fromUuid !== "function") return null;
  return globalThis.fromUuid(uuid);
}

function defaultUpdateMessage(message, application) {
  if (typeof message?.update !== "function") throw new Error("ChatMessage is not writable.");
  return message.update({
    [`flags.${MODULE_ID}.criticalCardPreview.application`]: application
  });
}
