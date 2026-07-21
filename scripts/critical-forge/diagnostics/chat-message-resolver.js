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
  const speaker = message.speaker ?? {};
  const messageContext = getPath(message, "flags.pf2e.context") ?? {};
  const savingThrow = isSavingThrowContext(messageContext, message);
  const selectedTargets = normalizeTokens(targetTokens ?? user?.targets ?? []);

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

  if (savingThrow) {
    const participants = await resolveSavingThrowParticipants(message, {
      messageContext,
      sourceToken,
      targetToken,
      selectedTargets,
      item,
      fromUuidFn,
      actors,
      canvas
    });

    if (participants.multipleTargetsAmbiguous) {
      diagnostics.push({
        severity: "warning",
        code: "CRITICAL_DIAGNOSTIC_MULTIPLE_TARGETS",
        data: { count: selectedTargets.length }
      });
    }
    if (!participants.originToken && !participants.originActor) {
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
        sourceActor: participants.rollerActor,
        targetActor: participants.originActor,
        sourceToken: participants.rollerToken,
        targetToken: participants.originToken
      },
      diagnostics
    };
  }

  const targetReference = messageContext.target ?? null;
  const sourceReference = messageContext.origin ?? messageContext ?? null;
  const flaggedTarget = await resolveDocumentReference(targetReference, { fromUuidFn, actors, canvas });
  let resolvedTargetToken = targetToken ?? flaggedTarget.token ?? null;
  let resolvedTargetActor = flaggedTarget.actor ?? resolvedTargetToken?.actor ?? null;
  if (!resolvedTargetToken && !resolvedTargetActor && selectedTargets.length === 1) {
    [resolvedTargetToken] = selectedTargets;
    resolvedTargetActor = resolvedTargetToken?.actor ?? null;
  } else if (!resolvedTargetToken && !resolvedTargetActor && selectedTargets.length > 1) {
    diagnostics.push({
      severity: "warning",
      code: "CRITICAL_DIAGNOSTIC_MULTIPLE_TARGETS",
      data: { count: selectedTargets.length }
    });
  }

  const flaggedSource = await resolveDocumentReference(sourceReference, { fromUuidFn, actors, canvas });
  const resolvedSourceToken = sourceToken
    ?? message.token
    ?? flaggedSource.token
    ?? resolveCanvasToken(speaker.token, canvas)
    ?? null;
  const sourceActor = message.speakerActor
    ?? message.actor
    ?? resolvedSourceToken?.actor
    ?? flaggedSource.actor
    ?? item?.actor
    ?? resolveActor(speaker.actor, actors)
    ?? null;
  const targetActor = resolvedTargetActor ?? resolvedTargetToken?.actor ?? null;

  if (!resolvedTargetToken && !targetActor) {
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

async function resolveSavingThrowParticipants(message, {
  messageContext,
  sourceToken,
  targetToken,
  selectedTargets,
  item,
  fromUuidFn,
  actors,
  canvas
}) {
  const speaker = message.speaker ?? {};
  const [rootReference, originReference, targetReference] = await Promise.all([
    resolveDocumentReference(
      { actor: messageContext.actor ?? null, token: messageContext.token ?? null },
      { fromUuidFn, actors, canvas }
    ),
    resolveDocumentReference(messageContext.origin ?? null, { fromUuidFn, actors, canvas }),
    resolveDocumentReference(messageContext.target ?? null, { fromUuidFn, actors, canvas })
  ]);

  const explicitRoller = participant(sourceToken?.actor ?? null, sourceToken);
  const explicitOrigin = participant(targetToken?.actor ?? null, targetToken);
  const root = participant(rootReference.actor, rootReference.token);
  const origin = participant(originReference.actor, originReference.token);
  const flaggedTarget = participant(targetReference.actor, targetReference.token);
  const messageParticipant = participant(
    message.speakerActor
      ?? message.actor
      ?? message.token?.actor
      ?? resolveActor(speaker.actor, actors)
      ?? null,
    message.token ?? resolveCanvasToken(speaker.token, canvas) ?? null
  );
  const itemParticipant = participant(item?.actor ?? null, item?.actor?.token ?? null);
  const selected = selectedTargets.map((token) => participant(token?.actor ?? null, token));

  const roller = explicitRoller.actor || explicitRoller.token
    ? explicitRoller
    : chooseSavingThrowRoller({ root, origin, flaggedTarget, messageParticipant, selected });

  const cause = explicitOrigin.actor || explicitOrigin.token
    ? explicitOrigin
    : chooseSavingThrowOrigin({ roller, root, origin, flaggedTarget, messageParticipant, itemParticipant });

  return {
    rollerActor: roller.actor ?? roller.token?.actor ?? null,
    rollerToken: roller.token ?? null,
    originActor: cause.actor ?? cause.token?.actor ?? null,
    originToken: cause.token ?? null,
    multipleTargetsAmbiguous: !roller.actor && !roller.token && selectedTargets.length > 1
  };
}

function chooseSavingThrowRoller({ root, origin, flaggedTarget, messageParticipant, selected }) {
  const originKnown = Boolean(origin.actor || origin.token);
  const candidates = originKnown
    ? [flaggedTarget, root, messageParticipant, ...selected]
    : [root, messageParticipant, ...selected, flaggedTarget];
  const distinct = candidates.find((candidate) => hasParticipant(candidate) && !sameParticipant(candidate, origin));
  return distinct ?? candidates.find(hasParticipant) ?? participant(null, null);
}

function chooseSavingThrowOrigin({ roller, root, origin, flaggedTarget, messageParticipant, itemParticipant }) {
  const candidates = [origin, root, messageParticipant, itemParticipant, flaggedTarget];
  const distinct = candidates.find((candidate) => hasParticipant(candidate) && !sameParticipant(candidate, roller));
  return distinct ?? participant(null, null);
}

function participant(actor, token) {
  return {
    actor: actor ?? token?.actor ?? null,
    token: token ?? null
  };
}

function hasParticipant(candidate) {
  return Boolean(candidate?.actor || candidate?.token);
}

function sameParticipant(left, right) {
  if (!hasParticipant(left) || !hasParticipant(right)) return false;
  const leftActor = left.actor ?? left.token?.actor ?? null;
  const rightActor = right.actor ?? right.token?.actor ?? null;
  if (leftActor && rightActor) {
    const leftUuid = leftActor.uuid ?? null;
    const rightUuid = rightActor.uuid ?? null;
    if (leftUuid && rightUuid) return leftUuid === rightUuid;
    const leftId = leftActor.id ?? leftActor._id ?? null;
    const rightId = rightActor.id ?? rightActor._id ?? null;
    if (leftId && rightId) return leftId === rightId;
    if (leftActor === rightActor) return true;
  }
  const leftTokenId = left.token?.uuid ?? left.token?.id ?? left.token?._id ?? null;
  const rightTokenId = right.token?.uuid ?? right.token?.id ?? right.token?._id ?? null;
  return Boolean(leftTokenId && rightTokenId && leftTokenId === rightTokenId);
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

async function resolveDocumentReference(reference, { fromUuidFn, actors, canvas }) {
  if (!reference) return { actor: null, token: null };
  if (reference.actor?.documentName === "Actor" || reference.actor?.type) {
    return { actor: reference.actor, token: reference.token?.actor ? reference.token : null };
  }
  if (reference.token?.actor) return { actor: reference.token.actor, token: reference.token };

  const tokenValue = typeof reference === "object" ? reference.token : null;
  const actorValue = typeof reference === "object" ? reference.actor : reference;
  const token = await resolveReferenceValue(tokenValue, { fromUuidFn, actors, canvas, preferToken: true });
  const actor = token?.actor
    ?? await resolveReferenceValue(actorValue, { fromUuidFn, actors, canvas, preferToken: false });
  return {
    actor: actor?.actor ?? actor ?? null,
    token: token?.object ?? token ?? null
  };
}

async function resolveReferenceValue(value, { fromUuidFn, actors, canvas, preferToken }) {
  if (!value) return null;
  if (typeof value === "object") return value;
  const text = String(value);
  if (text.includes(".") && typeof fromUuidFn === "function") {
    try {
      const document = await fromUuidFn(text);
      if (document) return document;
    } catch (_error) {
      // Fall through to local collection resolution.
    }
  }
  if (preferToken) return resolveCanvasToken(text, canvas);
  return resolveActor(text, actors);
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

function isSavingThrowContext(context, message) {
  const values = [
    context?.type,
    context?.identifier,
    context?.statistic,
    message?.rolls?.[0]?.type,
    message?.rolls?.[0]?.options?.type,
    message?.rolls?.[0]?.options?.identifier
  ].map((value) => String(value ?? "").toLowerCase());
  return values.some((value) => value.includes("saving-throw")
    || value.includes("savingthrow")
    || ["fortitude", "reflex", "will"].includes(value));
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? null;
}
