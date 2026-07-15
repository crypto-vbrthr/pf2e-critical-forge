import { MODULE_ID, SETTINGS } from "../../constants.js";
import { criticalCardSelector } from "../critical-forge.js";
import { configuredCardProfile, resolveCardProfile } from "../profile/card-profile.js";
import { prepareCriticalCardPreview } from "./critical-card-preview.js";
import { getCriticalCardPreviewData } from "./critical-card-application.js";

const CHAT_TEMPLATE = `modules/${MODULE_ID}/templates/critical-forge/critical-card-preview.hbs`;
const locks = new Set();
let initialized = false;

export function initializeCriticalCardRedrawUi() {
  if (initialized) return;
  initialized = true;
  Hooks.on("renderChatMessageHTML", renderCriticalCardRedraw);
  console.info(`${MODULE_ID} | Critical card redraw UI initialized.`);
}

export async function redrawCriticalCard(message, {
  user = globalThis.game?.user,
  selector = criticalCardSelector,
  random = Math.random,
  renderTemplateFn = defaultRenderTemplate,
  updateMessageFn = defaultUpdateMessage,
  profile = null
} = {}) {
  const messageId = message?.uuid ?? message?.id ?? "unknown";
  if (locks.has(messageId)) return failure("CRITICAL_CARD_REDRAW_IN_PROGRESS");
  locks.add(messageId);
  try {
    const data = getCriticalCardPreviewData(message);
    if (!data) return failure("CRITICAL_CARD_PREVIEW_MISSING");
    if (!user?.isGM) return failure("CRITICAL_CARD_REDRAW_GM_ONLY");
    if (!allowRedraw()) return failure("CRITICAL_CARD_REDRAW_DISABLED");
    if (data.application?.status === "applied") return failure("CRITICAL_CARD_ALREADY_APPLIED");

    const configured = profile ?? data.draw?.profileId ?? configuredCardProfile();
    const resolvedProfile = resolveCardProfile(configured);
    const history = Array.isArray(data.draw?.history) ? data.draw.history.map(String) : [data.cardId].filter(Boolean);
    let selection = selector.select(data.context, { excludeCardIds: history, random, profile: resolvedProfile });
    if (!selection.selected) {
      selection = selector.select(data.context, { excludeCardIds: [data.cardId], random, profile: resolvedProfile });
    }
    if (!selection.selected) return failure("CRITICAL_CARD_REDRAW_NO_ALTERNATIVE");

    const preview = prepareCriticalCardPreview(selection.selected, {
      context: data.context,
      metadata: data.metadata
    });
    const content = await renderTemplateFn(CHAT_TEMPLATE, {
      ...preview,
      sourceMessageLabel: data.sourceMessageLabel ?? preview.sourceMessageLabel,
      hasSourceMessage: Boolean(data.sourceMessageLabel ?? preview.sourceMessageLabel)
    });
    const maxHistory = historySize();
    const nextHistory = [...history, selection.selected.id].slice(-maxHistory);
    const nextData = {
      ...data,
      cardId: preview.cardId,
      packId: preview.packId,
      category: preview.category,
      effect: preview.effect ? { target: preview.effect.target, definition: structuredClone(preview.effect.definition) } : null,
      draw: { profileId: resolvedProfile.id, history: nextHistory },
      application: {
        status: preview.effect ? "pending" : "not-applicable",
        appliedAt: null,
        appliedBy: null,
        targetActorUuid: null,
        targetActorName: null,
        createdEffectIds: []
      }
    };
    await updateMessageFn(message, { title: preview.title, content, previewData: nextData });
    return Object.freeze({ valid: true, code: null, selected: selection.selected, preview, history: nextHistory });
  } catch (error) {
    console.error(`${MODULE_ID} | Critical card redraw failed`, error);
    return failure("CRITICAL_CARD_REDRAW_FAILED", { error });
  } finally {
    locks.delete(messageId);
  }
}

export function renderCriticalCardRedraw(message, html) {
  const data = getCriticalCardPreviewData(message);
  if (!data) return;
  const root = elementLike(html) ? html : html?.[0];
  if (!elementLike(root)) return;
  const card = root.matches?.(".pf2e-critical-card-preview") ? root : root.querySelector?.(".pf2e-critical-card-preview");
  const button = card?.querySelector?.('[data-action="redraw-critical-card"]');
  if (!button) return;
  if (!globalThis.game?.user?.isGM || !allowRedraw() || data.application?.status === "applied") {
    button.remove?.();
    return;
  }
  if (button.dataset?.criticalForgeBound === "true") return;
  if (button.dataset) button.dataset.criticalForgeBound = "true";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    const result = await redrawCriticalCard(message);
    if (!result.valid) {
      button.disabled = false;
      globalThis.ui?.notifications?.warn?.(localize(`PF2E_CRITICAL_FORGE.CriticalPreview.Redraw.Errors.${result.code}`, result.code));
      return;
    }
    globalThis.ui?.notifications?.info?.(localize("PF2E_CRITICAL_FORGE.CriticalPreview.Redraw.Success", "A new card was drawn."));
  });
}

function allowRedraw() {
  try {
    return globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_ALLOW_REDRAW) !== false;
  } catch (_error) {
    return true;
  }
}

function historySize() {
  try {
    const value = Number(globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_HISTORY_SIZE));
    return Number.isInteger(value) && value > 0 ? value : 10;
  } catch (_error) {
    return 10;
  }
}

function failure(code, extra = {}) {
  return Object.freeze({ valid: false, code, ...extra });
}

function elementLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.querySelector === "function");
}

function defaultRenderTemplate(path, data) {
  const renderer = globalThis.foundry?.applications?.handlebars?.renderTemplate;
  if (typeof renderer !== "function") throw new Error("Foundry renderTemplate is unavailable.");
  return renderer(path, data);
}

function defaultUpdateMessage(message, { title, content, previewData }) {
  if (typeof message?.update !== "function") throw new Error("ChatMessage is not writable.");
  return message.update({
    title,
    content,
    [`flags.${MODULE_ID}.criticalCardPreview`]: previewData
  });
}

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
}
