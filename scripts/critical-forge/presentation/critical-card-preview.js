import { MODULE_ID, SETTINGS } from "../../constants.js";
import { criticalCardRegistry } from "../critical-forge.js";
import { localizeCard, materializeCardEffect } from "../localization/card-localizer.js";
import { deepClone, deepFreeze } from "../utils.js";
import { getDamageTypeDefinition } from "../../effect-engine/catalogs/damage-type-catalog.js";
import { getImmunityTypeDefinition } from "../../effect-engine/catalogs/immunity-type-catalog.js";
import { getMovementTypeDefinition, getBaseSpeedTypeDefinition } from "../../effect-engine/catalogs/movement-type-catalog.js";
import { getResistanceTypeDefinition } from "../../effect-engine/catalogs/resistance-type-catalog.js";
import { getSelectorDefinition } from "../../effect-engine/catalogs/selector-catalog.js";
import { getWeaknessTypeDefinition } from "../../effect-engine/catalogs/weakness-type-catalog.js";
import { configuredCardProfile, resolveCardProfile } from "../profile/card-profile.js";

export const CRITICAL_CARD_PREVIEW_VERSION = 4;

export const CRITICAL_CARD_VISIBILITY_MODES = Object.freeze({
  BLIND: "blind",
  GM: "gm",
  PUBLIC: "public",
  SELF: "self"
});

const ALLOWED_VISIBILITY_MODES = new Set(Object.values(CRITICAL_CARD_VISIBILITY_MODES));

const CHAT_TEMPLATE = `modules/${MODULE_ID}/templates/critical-forge/critical-card-preview.hbs`;

export function prepareCriticalCardPreview(cardOrId, {
  context = {},
  metadata = {},
  runtimeSnapshot = null,
  sourceMessage = null,
  localizeCardFn = localizeCard,
  materializeEffectFn = materializeCardEffect,
  i18n = globalThis.game?.i18n
} = {}) {
  const card = resolveCard(cardOrId);
  const cardTextLocalizer = (key) => {
    const localized = i18n?.localize?.(key);
    return localized && localized !== key ? localized : null;
  };
  const localized = localizeCardFn(card, { localize: cardTextLocalizer });
  const materialized = materializeEffectFn(card, { localize: cardTextLocalizer });
  const categoryLabel = localizeKey(
    `PF2E_CRITICAL_FORGE.CriticalPreview.Categories.${card.category}`,
    card.category,
    i18n
  );
  const sourceName = metadata?.source?.name ?? sourceMessage?.speaker?.alias ?? null;
  const targetName = metadata?.target?.name ?? null;
  const sourceMessageLabel = sourceMessage
    ? sourceMessage.speaker?.alias ?? sourceMessage.actor?.name ?? sourceMessage.id ?? null
    : null;

  const effect = materialized
    ? prepareEffect(materialized, { i18n, sourceName, targetName })
    : null;

  return deepFreeze({
    previewVersion: CRITICAL_CARD_PREVIEW_VERSION,
    cardId: card.id,
    packId: card.packId,
    category: card.category,
    categoryLabel,
    tone: card.tone,
    toneLabel: localizeKey(`PF2E_CRITICAL_FORGE.CriticalPreview.Tones.${card.tone}`, card.tone, i18n),
    impact: card.impact,
    impactLabel: localizeKey(`PF2E_CRITICAL_FORGE.CriticalPreview.Impacts.${card.impact}`, card.impact, i18n),
    title: localized.title,
    description: localized.description,
    sourceName,
    targetName,
    sourceMessageId: sourceMessage?.id ?? sourceMessage?._id ?? null,
    sourceMessageUuid: sourceMessage?.uuid ?? null,
    sourceMessageLabel,
    hasSourceMessage: Boolean(sourceMessageLabel),
    context: deepClone(context),
    metadata: deepClone(metadata),
    runtimeSnapshot: deepClone(runtimeSnapshot),
    effect,
    hasEffect: Boolean(effect),
    allowRedraw: defaultAllowRedraw(),
    previewNotice: localizeKey(
      "PF2E_CRITICAL_FORGE.CriticalPreview.PreviewNotice",
      "Manual preview only. No effect was applied.",
      i18n
    )
  });
}

export async function publishCriticalCardPreview(cardOrId, {
  context = {},
  metadata = {},
  runtimeSnapshot = null,
  sourceMessage = null,
  speaker = null,
  renderTemplateFn = defaultRenderTemplate,
  createMessageFn = defaultCreateMessage,
  applyChatModeFn = defaultApplyChatMode,
  visibilityMode = defaultVisibilityMode(),
  chatStyle = defaultChatStyle(),
  profile = configuredCardProfile(),
  drawHistory = [],
  i18n = globalThis.game?.i18n
} = {}) {
  const preview = prepareCriticalCardPreview(cardOrId, {
    context,
    metadata,
    runtimeSnapshot,
    sourceMessage,
    i18n
  });
  const content = await renderTemplateFn(CHAT_TEMPLATE, preview);
  const messageData = {
    title: preview.title,
    flavor: localizeKey(
      "PF2E_CRITICAL_FORGE.CriticalPreview.ChatFlavor",
      "Critical Forge · Manual Preview",
      i18n
    ),
    content,
    speaker: speaker ?? sourceMessage?.speaker ?? defaultSpeaker(),
    style: chatStyle,
    flags: {
      [MODULE_ID]: {
        criticalCardPreview: {
          previewVersion: preview.previewVersion,
          cardId: preview.cardId,
          packId: preview.packId,
          category: preview.category,
          sourceMessageUuid: preview.sourceMessageUuid,
          sourceMessageLabel: preview.sourceMessageLabel,
          visibilityMode: normalizeVisibilityMode(visibilityMode),
          context: deepClone(preview.context),
          metadata: deepClone(preview.metadata),
          runtimeSnapshot: deepClone(preview.runtimeSnapshot),
          draw: {
            profileId: resolveCardProfile(profile).id,
            history: [...new Set([...drawHistory, preview.cardId])]
          },
          effect: preview.effect
            ? {
                target: preview.effect.target,
                definition: deepClone(preview.effect.definition)
              }
            : null,
          application: {
            status: preview.effect ? "pending" : "not-applicable",
            appliedAt: null,
            appliedBy: null,
            targetActorUuid: null,
            targetActorName: null,
            createdEffectIds: []
          }
        }
      }
    }
  };

  const normalizedVisibility = normalizeVisibilityMode(visibilityMode);
  const visibleMessageData = applyChatModeFn(messageData, normalizedVisibility) ?? messageData;
  const message = await createMessageFn(visibleMessageData);
  return Object.freeze({
    preview,
    message,
    messageData: visibleMessageData,
    visibilityMode: normalizedVisibility
  });
}

function prepareEffect(materialized, { i18n, sourceName, targetName }) {
  const definition = materialized.definition;
  const targetNameForEffect = materialized.target === "source" ? sourceName : targetName;
  const targetLabel = localizeKey(
    `PF2E_CRITICAL_FORGE.CriticalPreview.EffectTargets.${materialized.target}`,
    materialized.target,
    i18n
  );
  const targetDisplay = targetNameForEffect
    ? formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.EffectTargetNamed",
        { target: targetLabel, name: targetNameForEffect },
        `${targetLabel}: ${targetNameForEffect}`,
        i18n
      )
    : targetLabel;

  return {
    target: materialized.target,
    targetLabel,
    targetDisplay,
    name: definition.name,
    duration: summarizeDuration(definition.duration, i18n),
    components: (definition.components ?? []).map((component) => summarizeComponent(component, i18n)),
    definition: deepClone(definition)
  };
}

export function summarizeCriticalEffectDefinition(definition, { i18n = globalThis.game?.i18n } = {}) {
  return deepFreeze({
    duration: summarizeDuration(definition?.duration, i18n),
    components: (definition?.components ?? []).map((component) => summarizeComponent(component, i18n))
  });
}

function summarizeDuration(duration, i18n) {
  if (!duration || duration.unit === "unlimited" || Number(duration.value) < 0) {
    return localizeKey(
      "PF2E_CRITICAL_FORGE.CriticalPreview.Duration.Unlimited",
      "Unlimited",
      i18n
    );
  }

  const value = Number(duration.value);
  const unitKey = durationUnitKey(duration.unit, value);
  const unit = localizeKey(
    `PF2E_CRITICAL_FORGE.CriticalPreview.Duration.${unitKey}`,
    duration.unit,
    i18n
  );
  return formatKey(
    "PF2E_CRITICAL_FORGE.CriticalPreview.Duration.Value",
    { value, unit },
    `${value} ${unit}`,
    i18n
  );
}

function summarizeComponent(component, i18n) {
  const type = String(component?.type ?? "unknown");
  const summary = componentSummary(type, component ?? {}, i18n);
  return Object.freeze({ type, summary });
}

function componentSummary(type, component, i18n) {
  switch (type) {
    case "condition": {
      const condition = conditionLabel(component.slug, i18n);
      const value = Number(component.value);
      const suffix = Number.isFinite(value) && value > 0 ? ` ${value}` : "";
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Condition",
        { condition: `${condition}${suffix}` },
        `Condition: ${condition}${suffix}`,
        i18n
      );
    }
    case "modifier": {
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Modifier",
        {
          value: signed(component.value),
          modifierType: modifierTypeLabel(component.modifierType, i18n),
          selector: getSelectorDefinition(component.selector)?.label ?? component.selector
        },
        `${signed(component.value)} ${component.modifierType} ${component.selector}`,
        i18n
      );
    }
    case "persistentDamage": {
      const base = formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.PersistentDamage",
        {
          formula: component.formula,
          damageType: getDamageTypeDefinition(component.damageType)?.label ?? component.damageType
        },
        `${component.formula} persistent ${component.damageType} damage`,
        i18n
      );
      const dc = Number(component.dc);
      if (!Number.isFinite(dc) || dc <= 0) return base;
      return `${base} · ${formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.RecoveryDC",
        { dc },
        `Recovery DC ${dc}`,
        i18n
      )}`;
    }
    case "resistance":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Resistance",
        {
          type: getResistanceTypeDefinition(component.resistanceType)?.label ?? component.resistanceType,
          value: component.value
        },
        `Resistance ${component.resistanceType} ${component.value}`,
        i18n
      );
    case "weakness":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Weakness",
        {
          type: getWeaknessTypeDefinition(component.weaknessType)?.label ?? component.weaknessType,
          value: component.value
        },
        `Weakness ${component.weaknessType} ${component.value}`,
        i18n
      );
    case "immunity":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Immunity",
        { type: getImmunityTypeDefinition(component.immunityType)?.label ?? component.immunityType },
        `Immunity ${component.immunityType}`,
        i18n
      );
    case "fastHealing":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.FastHealing",
        { value: component.value },
        `Fast Healing ${component.value}`,
        i18n
      );
    case "regeneration": {
      const types = (component.deactivatedBy ?? [])
        .map((value) => getDamageTypeDefinition(value)?.label ?? value)
        .join(", ");
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Regeneration",
        { value: component.value, types },
        `Regeneration ${component.value} (${types})`,
        i18n
      );
    }
    case "temporaryHitPoints":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.TemporaryHitPoints",
        { value: component.value },
        `${component.value} temporary Hit Points`,
        i18n
      );
    case "movement":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Movement",
        {
          value: signed(component.value),
          modifierType: modifierTypeLabel(component.modifierType, i18n),
          movement: getMovementTypeDefinition(component.movementType)?.label ?? component.movementType
        },
        `${signed(component.value)} ${component.modifierType} ${component.movementType}`,
        i18n
      );
    case "baseSpeed":
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.BaseSpeed",
        {
          movement: getBaseSpeedTypeDefinition(component.movementType)?.label ?? component.movementType,
          value: component.value,
          feet: localizeKey("PF2E_CRITICAL_FORGE.CriticalPreview.Feet", "ft.", i18n)
        },
        `${component.movementType} ${component.value} ft.`,
        i18n
      );
    default:
      return formatKey(
        "PF2E_CRITICAL_FORGE.CriticalPreview.Components.Unknown",
        { type },
        type,
        i18n
      );
  }
}

function conditionLabel(slug, i18n) {
  const configured = globalThis.CONFIG?.PF2E?.conditionTypes?.[slug];
  const raw = typeof configured === "string"
    ? configured
    : configured?.label ?? configured?.name;
  if (raw) return localizeKey(raw, humanize(slug), i18n);
  return humanize(slug);
}

function modifierTypeLabel(type, i18n) {
  const normalized = String(type ?? "untyped");
  const keyName = {
    status: "Status",
    circumstance: "Circumstance",
    item: "Item",
    untyped: "Untyped"
  }[normalized] ?? "Untyped";
  return localizeKey(
    `PF2E_CRITICAL_FORGE.EffectForge.ModifierTypes.${keyName}`,
    humanize(normalized),
    i18n
  );
}

function durationUnitKey(unit, value) {
  const singular = value === 1;
  const normalized = String(unit ?? "rounds");
  const names = {
    rounds: singular ? "RoundOne" : "RoundMany",
    minutes: singular ? "MinuteOne" : "MinuteMany",
    hours: singular ? "HourOne" : "HourMany",
    days: singular ? "DayOne" : "DayMany"
  };
  return names[normalized] ?? "RoundMany";
}

function resolveCard(cardOrId) {
  if (typeof cardOrId !== "string") return cardOrId;
  const card = criticalCardRegistry.get(cardOrId);
  if (!card) throw new Error(`Unknown critical card: ${cardOrId}`);
  return card;
}

function localizeKey(key, fallback, i18n) {
  const localized = i18n?.localize?.(key);
  return localized && localized !== key ? localized : fallback;
}

function formatKey(key, data, fallback, i18n) {
  const formatted = i18n?.format?.(key, data);
  return formatted && formatted !== key ? formatted : fallback;
}

function signed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");
  return number > 0 ? `+${number}` : String(number);
}

function humanize(value) {
  return String(value ?? "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


export function normalizeVisibilityMode(mode) {
  const normalized = String(mode ?? "").trim().toLowerCase();
  return ALLOWED_VISIBILITY_MODES.has(normalized)
    ? normalized
    : CRITICAL_CARD_VISIBILITY_MODES.BLIND;
}

function defaultVisibilityMode() {
  try {
    const configured = globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_VISIBILITY);
    return normalizeVisibilityMode(configured);
  } catch (_error) {
    return CRITICAL_CARD_VISIBILITY_MODES.BLIND;
  }
}

function defaultApplyChatMode(data, mode) {
  const applyMode = globalThis.ChatMessage?.applyMode;
  if (typeof applyMode !== "function") {
    const fallback = { ...data };
    if (mode === "public") {
      fallback.whisper = [];
      fallback.blind = false;
    } else if (mode === "self") {
      fallback.whisper = globalThis.game?.user?.id ? [globalThis.game.user.id] : [];
      fallback.blind = false;
    } else {
      const gms = [...(globalThis.game?.users ?? [])]
        .filter((user) => user?.isGM)
        .map((user) => user.id)
        .filter(Boolean);
      fallback.whisper = gms;
      fallback.blind = mode === "blind";
    }
    return fallback;
  }
  return applyMode.call(globalThis.ChatMessage, data, mode);
}

function defaultRenderTemplate(path, data) {
  const renderer = globalThis.foundry?.applications?.handlebars?.renderTemplate;
  if (typeof renderer !== "function") throw new Error("Foundry renderTemplate is unavailable.");
  return renderer(path, data);
}

function defaultCreateMessage(data) {
  const creator = globalThis.ChatMessage?.create;
  if (typeof creator !== "function") throw new Error("ChatMessage.create is unavailable.");
  return creator.call(globalThis.ChatMessage, data);
}

function defaultSpeaker() {
  return globalThis.ChatMessage?.getSpeaker?.() ?? {};
}

function defaultChatStyle() {
  return globalThis.CONST?.CHAT_MESSAGE_STYLES?.OTHER ?? 0;
}


function defaultAllowRedraw() {
  try {
    return globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_ALLOW_REDRAW) !== false;
  } catch (_error) {
    return true;
  }
}
