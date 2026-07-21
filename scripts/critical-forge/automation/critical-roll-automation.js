import { MODULE_ID, SETTINGS } from "../../constants.js";
import { criticalCardSelector } from "../critical-forge.js";
import { resolveDiagnosticMessageInput } from "../diagnostics/chat-message-resolver.js";
import { diagnosePf2eCriticalInput } from "../diagnostics/critical-diagnostic-service.js";
import { publishCriticalCardPreview } from "../presentation/critical-card-preview.js";
import { configuredCardProfile } from "../profile/card-profile.js";

export const CRITICAL_ROLL_AUTOMATION_VERSION = 1;

const processedMessages = new Set();
const processingMessages = new Set();
let initialized = false;

export function initializeCriticalRollAutomation() {
  if (initialized) return;
  initialized = true;
  Hooks.on("createChatMessage", onCreateChatMessage);
  console.info(`${MODULE_ID} | Critical roll automation initialized.`);
}

export async function processCriticalChatMessage(message, {
  user = globalThis.game?.user,
  users = globalThis.game?.users,
  resolveMessageInput = resolveDiagnosticMessageInput,
  diagnose = diagnosePf2eCriticalInput,
  selector = criticalCardSelector,
  publishPreview = publishCriticalCardPreview,
  promptForCard = defaultPromptForCard,
  random = Math.random,
  profile = configuredCardProfile(),
  recentHistory = null,
  recordHistory = recordRecentCard,
  updateSourceMessage = updateAutomationFlag,
  notify = globalThis.ui?.notifications
} = {}) {
  const messageId = String(message?.id ?? message?._id ?? message?.uuid ?? "");
  if (!messageId) return failure("CRITICAL_AUTOMATION_MESSAGE_INVALID");
  if (!isPrimaryAutomationUser(user, users)) return failure("CRITICAL_AUTOMATION_NOT_PRIMARY_GM");
  if (isCriticalForgeMessage(message)) return failure("CRITICAL_AUTOMATION_OWN_MESSAGE");
  if (processedMessages.has(messageId) || hasAutomationFlag(message)) {
    return failure("CRITICAL_AUTOMATION_ALREADY_PROCESSED");
  }
  if (processingMessages.has(messageId)) return failure("CRITICAL_AUTOMATION_IN_PROGRESS");

  processingMessages.add(messageId);
  try {
    const authorTargets = messageAuthorTargets(message, users);
    const resolved = await resolveMessageInput(message, {
      targetTokens: authorTargets,
      user: null
    });
    const report = diagnose(resolved.input);

    if (!isSupportedCriticalReport(report, resolved.input)) {
      return failure("CRITICAL_AUTOMATION_UNSUPPORTED_ROLL", { report, resolverDiagnostics: resolved.diagnostics });
    }

    const trigger = report.trigger;
    if (!trigger?.matched) {
      processedMessages.add(messageId);
      await safeUpdateSource(updateSourceMessage, message, automationData({
        status: "ignored",
        reason: trigger?.reason ?? "trigger-not-matched",
        report
      }));
      return failure("CRITICAL_AUTOMATION_TRIGGER_NOT_MATCHED", { report, trigger });
    }

    if (trigger.action === "prompt") {
      const accepted = await promptForCard({ message, report, resolverDiagnostics: resolved.diagnostics });
      if (!accepted) {
        processedMessages.add(messageId);
        await safeUpdateSource(updateSourceMessage, message, automationData({
          status: "dismissed",
          reason: "gm-declined",
          report
        }));
        return failure("CRITICAL_AUTOMATION_DECLINED", { report, trigger });
      }
    }

    const history = Array.isArray(recentHistory) ? recentHistory.map(String) : readRecentHistory();
    let selection = selector.select(report.context, {
      excludeCardIds: history,
      random,
      profile,
      snapshot: report.snapshot ?? null
    });
    if (!selection.selected) {
      selection = selector.select(report.context, { random, profile, snapshot: report.snapshot ?? null });
    }
    if (!selection.selected) {
      processedMessages.add(messageId);
      await safeUpdateSource(updateSourceMessage, message, automationData({
        status: "no-card",
        reason: "no-eligible-card",
        report
      }));
      notify?.warn?.(localize(
        "PF2E_CRITICAL_FORGE.CriticalAutomation.Errors.NoEligibleCard",
        "Critical Forge found no eligible card for this roll."
      ));
      return failure("CRITICAL_AUTOMATION_NO_ELIGIBLE_CARD", { report, selection });
    }

    const previewResult = await publishPreview(selection.selected, {
      sourceMessage: message,
      context: report.context,
      metadata: report.metadata,
      runtimeSnapshot: report.snapshot ?? null,
      profile,
      drawHistory: history
    });
    await recordHistory(selection.selected.id);
    processedMessages.add(messageId);
    await safeUpdateSource(updateSourceMessage, message, automationData({
      status: "published",
      reason: trigger.action,
      report,
      cardId: selection.selected.id,
      previewMessageUuid: previewResult.message?.uuid ?? null
    }));

    return Object.freeze({
      valid: true,
      code: null,
      report,
      trigger,
      selection,
      preview: previewResult
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Critical roll automation failed`, error);
    notify?.error?.(localize(
      "PF2E_CRITICAL_FORGE.CriticalAutomation.Errors.Failed",
      "Critical Forge could not process the critical roll. See the console for details."
    ));
    return failure("CRITICAL_AUTOMATION_FAILED", { error });
  } finally {
    processingMessages.delete(messageId);
  }
}

export function isSupportedCriticalReport(report, input = {}) {
  const category = report?.context?.category;
  if (!report?.valid || ![
    "criticalHit",
    "criticalFumble",
    "spellCriticalHit",
    "spellCriticalFumble",
    "savingThrowCriticalSuccess",
    "savingThrowCriticalFailure"
  ].includes(category)) return false;

  if (category.startsWith("savingThrow")) return isSavingThrowReport(report, input);
  return isAttackCriticalReport(report, input);
}

export function isAttackCriticalReport(report, input = {}) {
  if (!report?.valid || ![
    "criticalHit",
    "criticalFumble",
    "spellCriticalHit",
    "spellCriticalFumble"
  ].includes(report.context?.category)) return false;

  const messageContextType = normalize(input?.message?.flags?.pf2e?.context?.type);
  const rollType = normalize(report.metadata?.roll?.type);
  const rollFamily = normalize(report.metadata?.roll?.family);
  const itemType = normalize(input?.item?.type);
  const action = normalize(report.metadata?.roll?.action);
  const identifier = normalize(report.metadata?.roll?.identifier);
  const rollOptions = Array.isArray(report.metadata?.rollOptions) ? report.metadata.rollOptions : [];

  if ([messageContextType, rollType].some((value) => value.includes("damage"))) return false;
  if (["attack", "spellattack", "spell-attack"].includes(rollFamily)) return true;
  if ([messageContextType, rollType].some((value) => value.includes("attack"))) return true;
  if ([action, identifier].some((value) => value === "strike" || value.includes("attack"))) return true;
  if (["weapon", "melee", "spell"].includes(itemType) && ![messageContextType, rollType].some((value) => value.includes("damage"))) {
    return true;
  }
  return rollOptions.some((option) => {
    const value = normalize(option);
    return value === "action:slug:strike"
      || value.startsWith("check:statistic:attack")
      || value.includes("attack-roll")
      || value === "item:type:spell";
  });
}

export function isSavingThrowReport(report, input = {}) {
  if (!report?.valid || !report.context?.category?.startsWith("savingThrow")) return false;
  const messageContextType = normalize(input?.message?.flags?.pf2e?.context?.type);
  const rollType = normalize(report.metadata?.roll?.type);
  const rollFamily = normalize(report.metadata?.roll?.family);
  const identifier = normalize(report.metadata?.roll?.identifier);
  const saveTypes = report.context?.saveTypes ?? [];
  const rollOptions = Array.isArray(report.metadata?.rollOptions) ? report.metadata.rollOptions : [];

  if (rollFamily === "savingthrow" || rollFamily === "saving-throw") return true;
  if ([messageContextType, rollType].some((value) => value.includes("saving-throw") || value.includes("savingthrow"))) return true;
  if (["fortitude", "reflex", "will"].includes(identifier) || saveTypes.length > 0) return true;
  return rollOptions.some((option) => {
    const value = normalize(option);
    return value.includes("saving-throw")
      || value.startsWith("check:statistic:fortitude")
      || value.startsWith("check:statistic:reflex")
      || value.startsWith("check:statistic:will");
  });
}

export function isPrimaryAutomationUser(user = globalThis.game?.user, users = globalThis.game?.users) {
  if (!user?.isGM || user?.active === false) return false;
  const activeGM = users?.activeGM;
  if (activeGM) return String(activeGM.id) === String(user.id);
  const activeGms = collectionContents(users)
    .filter((candidate) => candidate?.isGM && candidate?.active !== false)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return activeGms.length === 0 || String(activeGms[0].id) === String(user.id);
}

export function getCriticalRollAutomationData(message) {
  return message?.flags?.[MODULE_ID]?.criticalRollAutomation
    ?? message?.getFlag?.(MODULE_ID, "criticalRollAutomation")
    ?? null;
}

async function onCreateChatMessage(message) {
  // Foundry dispatches document hooks to every connected client. Only the primary
  // active GM processes a message, which prevents duplicate cards in multi-GM worlds.
  await processCriticalChatMessage(message);
}

async function defaultPromptForCard({ report }) {
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.confirm) throw new Error("Foundry DialogV2.confirm is unavailable.");
  const category = report.context.category;
  const title = localize(
    `PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.${category}.Title`,
    categoryFallback(category)
  );
  const source = escapeHtml(report.metadata?.source?.name ?? "—");
  const target = escapeHtml(report.metadata?.target?.name ?? "—");
  const item = escapeHtml(report.metadata?.attack?.name ?? "—");
  const content = `
    <div class="pf2e-critical-forge-automation-prompt">
      <p>${escapeHtml(localize(
        `PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.${category}.Question`,
        "Draw a Critical Forge card for this result?"
      ))}</p>
      <dl>
        <dt>${escapeHtml(localize("PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.Source", "Source"))}</dt><dd>${source}</dd>
        <dt>${escapeHtml(localize("PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.Target", "Target"))}</dt><dd>${target}</dd>
        <dt>${escapeHtml(localize("PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.Attack", "Attack"))}</dt><dd>${item}</dd>
      </dl>
    </div>`;
  return Boolean(await DialogV2.confirm({
    window: { title },
    content,
    yes: {
      label: localize("PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.Draw", "Draw Card"),
      icon: "fa-solid fa-clone"
    },
    no: {
      label: localize("PF2E_CRITICAL_FORGE.CriticalAutomation.Prompt.Ignore", "Ignore"),
      icon: "fa-solid fa-xmark"
    },
    rejectClose: false,
    modal: true
  }));
}

function isCriticalForgeMessage(message) {
  return Boolean(message?.flags?.[MODULE_ID]?.criticalCardPreview);
}

function hasAutomationFlag(message) {
  return Boolean(getCriticalRollAutomationData(message));
}

function messageAuthorTargets(message, users) {
  const author = message?.author ?? message?.user ?? users?.get?.(message?.user?.id ?? message?.user);
  return author?.targets ?? [];
}

function automationData({ status, reason, report, cardId = null, previewMessageUuid = null }) {
  return {
    version: CRITICAL_ROLL_AUTOMATION_VERSION,
    status,
    reason,
    category: report?.context?.category ?? null,
    cardId,
    previewMessageUuid,
    processedAt: new Date().toISOString(),
    processedBy: globalThis.game?.user?.id ?? null
  };
}

async function updateAutomationFlag(message, data) {
  if (typeof message?.setFlag === "function") {
    return message.setFlag(MODULE_ID, "criticalRollAutomation", data);
  }
  if (typeof message?.update === "function") {
    return message.update({ [`flags.${MODULE_ID}.criticalRollAutomation`]: data });
  }
  return null;
}

async function safeUpdateSource(updateFn, message, data) {
  try {
    await updateFn(message, data);
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not persist critical automation state on source message.`, error);
  }
}

function readRecentHistory() {
  try {
    const value = globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_RECENT_HISTORY);
    return Array.isArray(value?.cardIds) ? value.cardIds.map(String) : [];
  } catch (_error) {
    return [];
  }
}

async function recordRecentCard(cardId) {
  const next = [...readRecentHistory(), String(cardId)].slice(-historySize());
  try {
    await globalThis.game?.settings?.set?.(MODULE_ID, SETTINGS.CRITICAL_CARD_RECENT_HISTORY, { cardIds: next });
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not persist recent critical-card history.`, error);
  }
  return next;
}

function historySize() {
  try {
    const value = Number(globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_HISTORY_SIZE));
    return Number.isInteger(value) && value > 0 ? value : 10;
  } catch (_error) {
    return 10;
  }
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function collectionContents(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return [...collection];
  if (Array.isArray(collection.contents)) return [...collection.contents];
  if (typeof collection.values === "function") return [...collection.values()];
  if (typeof collection[Symbol.iterator] === "function") return [...collection];
  return [];
}

function escapeHtml(value) {
  const helper = globalThis.foundry?.utils?.escapeHTML;
  if (typeof helper === "function") return helper(String(value ?? ""));
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
}

function categoryFallback(category) {
  return ({
    criticalHit: "Critical Hit",
    criticalFumble: "Critical Fumble",
    spellCriticalHit: "Critical Spell Hit",
    spellCriticalFumble: "Critical Spell Fumble",
    savingThrowCriticalSuccess: "Critical Saving Throw Success",
    savingThrowCriticalFailure: "Critical Saving Throw Failure"
  })[category] ?? "Critical Result";
}

function failure(code, extra = {}) {
  return Object.freeze({ valid: false, code, ...extra });
}
