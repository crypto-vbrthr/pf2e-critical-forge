import { buildPf2eDuration } from "./duration-builder.js";
import { buildEffectFlags } from "./flag-builder.js";
import { collectRuleElements } from "./rule-builder.js";
import { EffectDurationSplitError } from "../../core/errors.js";

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
}

function durationUnitLabel(duration) {
  const singular = Number(duration?.value) === 1;
  const units = {
    rounds: singular
      ? ["PF2E_CRITICAL_FORGE.Duration.Round", "round"]
      : ["PF2E_CRITICAL_FORGE.Duration.Rounds", "rounds"],
    minutes: singular
      ? ["PF2E_CRITICAL_FORGE.Duration.Minute", "minute"]
      : ["PF2E_CRITICAL_FORGE.Duration.Minutes", "minutes"],
    hours: singular
      ? ["PF2E_CRITICAL_FORGE.Duration.Hour", "hour"]
      : ["PF2E_CRITICAL_FORGE.Duration.Hours", "hours"],
    days: singular
      ? ["PF2E_CRITICAL_FORGE.Duration.Day", "day"]
      : ["PF2E_CRITICAL_FORGE.Duration.Days", "days"]
  };
  const [key, fallback] = units[duration?.unit] ?? [null, String(duration?.unit ?? "")];
  return key ? localize(key, fallback) : fallback;
}

export function formatDurationLabel(duration) {
  if (!duration || duration.unit === "unlimited") {
    return localize("PF2E_CRITICAL_FORGE.Duration.Unlimited", "Unlimited");
  }
  return `${duration.value} ${durationUnitLabel(duration)}`;
}

function buildSource(compiled, group, segment) {
  const multi = segment.segmentCount > 1;
  const displayName = multi
    ? `${compiled.name} · ${formatDurationLabel(group.duration)}`
    : compiled.name;

  return {
    name: displayName,
    type: "effect",
    img: compiled.img,
    system: {
      description: { value: compiled.description ?? "", gm: "" },
      rules: collectRuleElements(group.components),
      slug: null,
      traits: { value: [], otherTags: [] },
      level: { value: 1 },
      duration: buildPf2eDuration(group.duration),
      start: { value: 0, initiative: null },
      badge: null,
      tokenIcon: { show: true },
      unidentified: false
    },
    flags: buildEffectFlags(compiled, segment)
  };
}

export function buildPf2eEffectSources(compiled, { bundleId = null } = {}) {
  const groups = Array.isArray(compiled.durationGroups) && compiled.durationGroups.length > 0
    ? compiled.durationGroups
    : [{
        index: 0,
        key: "global",
        duration: compiled.duration,
        components: compiled.components,
        componentIndexes: compiled.components.map((component, index) => component.componentIndex ?? index),
        usesGlobalDuration: true
      }];

  return groups.map((group, index) => buildSource(compiled, group, {
    bundleId,
    segmentIndex: index,
    segmentCount: groups.length,
    segmentKey: group.key,
    primary: index === 0,
    usesGlobalDuration: Boolean(group.usesGlobalDuration),
    componentIndexes: [...group.componentIndexes],
    duration: foundry.utils.deepClone(group.duration)
  }));
}

export function buildPf2eEffectSource(compiled, options = {}) {
  const sources = buildPf2eEffectSources(compiled, options);
  if (sources.length !== 1) throw new EffectDurationSplitError(sources.length);
  return sources[0];
}
