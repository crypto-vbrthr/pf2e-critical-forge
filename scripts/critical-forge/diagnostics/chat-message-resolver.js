import { getPath } from "../adapters/pf2e/context-utils.js";

const CHAT_MESSAGE_TYPES = new Set(["ChatMessage", "chatmessage"]);

export function listDiagnosticMessages({ messages = globalThis.game?.messages, limit = 50 } = {}) {
  const entries = collectionContents(messages)
    .filter(isDiagnosticMessage)
    .sort((a, b) => messageTimestamp(b) - messageTimestamp(a))
    .slice(0, Math.max(1, Number(limit) || 50));

  return entries.map((message) => ({
    message,
    id: message.id ?? message._id ?? "",
    uuid: message.uuid ?? (message.id ? `ChatMessage.${message.id}` : ""),
    label: diagnosticMessageLabel(message),
    timestamp: messageTimestamp(message)
  }));
}

export function isDiagnosticMessage(message) {
  if (!message) return false;
  const rolls = Array.isArray(message.rolls) ? message.rolls : [];
  return rolls.length > 0
    || Boolean(getPath(message, "flags.pf2e.context"))
    || Boolean(getPath(message, "flags.pf2e.damageRoll"));
}

export async function resolveDiagnosticMessageInput(message, {
  sourceToken = null,
  targetToken = null,
  targetTokens = null,
  fromUuidFn = globalThis.fromUuid,
  actors = globalThis.game?.actors,
  canvas = globalThis.canvas,
  user = globalThis.game?.user
} = {}) {
  if (!message) throw new TypeError("A ChatMessage is required for diagnostics.");

  const diagnostics = [];
  const selectedTargets = normalizeTokens(targetTokens ?? user?.targets ?? []);
  let resolvedTargetToken = targetToken;
  if (!resolvedTargetToken && selectedTargets.length === 1) {
    [resolvedTargetToken] = selectedTargets;
  } else if (!resolvedTargetToken && selectedTargets.length > 1) {
    diagnostics.push({
      severity: "warning",
      code: "CRITICAL_DIAGNOSTIC_MULTIPLE_TARGETS",
      data: { count: selectedTargets.length }
    });
  }

  const speaker = message.speaker ?? {};
  const resolvedSourceToken = sourceToken
    ?? message.token
    ?? resolveCanvasToken(speaker.token, canvas)
    ?? null;

  let item = message.item ?? message._strike?.item ?? message._attack?.item ?? null;
  const itemUuid = firstString(
    getPath(message, "flags.pf2e.context.origin.item"),
    getPath(message, "flags.pf2e.context.item"),
    getPath(message, "flags.pf2e.origin.item")
  );
  if (!item && itemUuid && typeof fromUuidFn === "function") {
    try {
      item = await fromUuidFn(itemUuid);
    } catch (error) {
      diagnostics.push({
        severity: "warning",
        code: "CRITICAL_DIAGNOSTIC_ITEM_RESOLUTION_FAILED",
        data: { uuid: itemUuid, message: error.message }
      });
    }
  }

  const sourceActor = message.speakerActor
    ?? message.actor
    ?? resolvedSourceToken?.actor
    ?? item?.actor
    ?? resolveActor(speaker.actor, actors)
    ?? null;
  const targetActor = resolvedTargetToken?.actor ?? null;

  if (!resolvedTargetToken) {
    diagnostics.push({
      severity: "info",
      code: "CRITICAL_DIAGNOSTIC_TARGET_NOT_SELECTED",
      data: {}
    });
  }

  return {
    input: {
      message,
      roll: resolvePrimaryRoll(message),
      item,
      sourceActor,
      targetActor,
      sourceToken: resolvedSourceToken,
      targetToken: resolvedTargetToken
    },
    diagnostics
  };
}

export function getChatMessageDragData(event, { textEditor = null } = {}) {
  const editor = textEditor
    ?? globalThis.foundry?.applications?.ux?.TextEditor?.implementation
    ?? globalThis.foundry?.applications?.ux?.TextEditor
    ?? globalThis.TextEditor;
  const helper = editor?.getDragEventData;
  if (typeof helper === "function") return helper.call(editor, event) ?? {};
  const raw = event?.dataTransfer?.getData?.("text/plain");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function resolveDroppedChatMessage(data, {
  fromUuidFn = globalThis.fromUuid,
  messages = globalThis.game?.messages
} = {}) {
  const type = String(data?.type ?? data?.documentName ?? "");
  const uuid = String(data?.uuid ?? "");
  const id = String(data?.id ?? data?._id ?? "");
  const looksLikeMessage = CHAT_MESSAGE_TYPES.has(type)
    || uuid.startsWith("ChatMessage.");

  if (!looksLikeMessage) {
    const error = new Error("Dropped document is not a ChatMessage.");
    error.code = "CRITICAL_DIAGNOSTIC_DROP_NOT_CHAT_MESSAGE";
    throw error;
  }

  if (uuid && typeof fromUuidFn === "function") {
    const document = await fromUuidFn(uuid);
    if (document) return document;
  }

  const message = collectionGet(messages, id || uuid.split(".").at(-1));
  if (message) return message;

  const error = new Error("Dropped ChatMessage could not be resolved.");
  error.code = "CRITICAL_DIAGNOSTIC_DROP_UNRESOLVED";
  throw error;
}

export function diagnosticMessageLabel(message) {
  const speaker = message.speaker?.alias
    ?? message.alias
    ?? message.actor?.name
    ?? "Chat";
  const itemName = message.item?.name
    ?? getPath(message, "flags.pf2e.context.title")
    ?? getPath(message, "flags.pf2e.context.action")
    ?? getPath(message, "flags.pf2e.context.identifier")
    ?? "Roll";
  const outcome = getPath(message, "flags.pf2e.context.outcome")
    ?? message.rolls?.[0]?.degreeOfSuccess
    ?? "";
  return [speaker, itemName, outcome].filter((part) => part !== "").join(" · ");
}

function resolvePrimaryRoll(message) {
  const rolls = Array.isArray(message?.rolls) ? message.rolls : [];
  return rolls.find((roll) => roll?.degreeOfSuccess != null || roll?.options?.degreeOfSuccess != null)
    ?? rolls[0]
    ?? null;
}

function resolveCanvasToken(id, canvas) {
  if (!id) return null;
  return canvas?.tokens?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.((token) => token.id === id || token.document?.id === id)
    ?? null;
}

function resolveActor(id, actors) {
  if (!id) return null;
  return actors?.get?.(id)
    ?? collectionContents(actors).find((actor) => actor.id === id || actor._id === id)
    ?? null;
}

function normalizeTokens(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value instanceof Set) return [...value].filter(Boolean);
  if (typeof value[Symbol.iterator] === "function") return [...value].filter(Boolean);
  return [];
}

function collectionContents(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return [...collection];
  if (Array.isArray(collection.contents)) return [...collection.contents];
  if (typeof collection.values === "function") return [...collection.values()];
  if (typeof collection[Symbol.iterator] === "function") return [...collection];
  return [];
}

function collectionGet(collection, id) {
  return collection?.get?.(id)
    ?? collectionContents(collection).find((entry) => entry.id === id || entry._id === id)
    ?? null;
}

function messageTimestamp(message) {
  return Number(message.timestamp ?? message.time ?? message._source?.timestamp ?? 0) || 0;
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? null;
}
