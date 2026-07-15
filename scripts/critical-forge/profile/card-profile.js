import { MODULE_ID, SETTINGS } from "../../constants.js";

export const CARD_TONES = Object.freeze(["neutral", "serious", "dramatic", "humorous"]);
export const CARD_IMPACTS = Object.freeze(["narrative", "light", "moderate", "strong"]);
export const CARD_PROFILE_IDS = Object.freeze(["relaxed", "balanced", "dramatic", "brutal", "custom"]);

const PROFILE_DEFINITIONS = Object.freeze({
  relaxed: freezeProfile({
    id: "relaxed",
    toneWeights: { humorous: 2.5, neutral: 1.25, serious: 0.45, dramatic: 0.25 },
    impactWeights: { narrative: 2.25, light: 1.6, moderate: 0.35, strong: 0.1 }
  }),
  balanced: freezeProfile({
    id: "balanced",
    toneWeights: { neutral: 1, serious: 1, dramatic: 1, humorous: 1 },
    impactWeights: { narrative: 1, light: 1, moderate: 1, strong: 0.75 }
  }),
  dramatic: freezeProfile({
    id: "dramatic",
    toneWeights: { dramatic: 2.2, serious: 1.5, neutral: 0.75, humorous: 0.25 },
    impactWeights: { narrative: 0.55, light: 0.8, moderate: 1.7, strong: 1.2 }
  }),
  brutal: freezeProfile({
    id: "brutal",
    toneWeights: { dramatic: 1.6, serious: 1.3, neutral: 0.8, humorous: 0.45 },
    impactWeights: { narrative: 0.15, light: 0.45, moderate: 1.6, strong: 3 }
  })
});

export function resolveCardProfile(profile = null) {
  if (profile && typeof profile === "object" && !Array.isArray(profile)) {
    return freezeProfile({
      id: String(profile.id ?? "custom"),
      toneWeights: normalizeWeights(profile.toneWeights, CARD_TONES),
      impactWeights: normalizeWeights(profile.impactWeights, CARD_IMPACTS)
    });
  }

  const id = CARD_PROFILE_IDS.includes(String(profile)) ? String(profile) : "balanced";
  if (id !== "custom") return PROFILE_DEFINITIONS[id];
  return customProfileFromSettings();
}

export function configuredCardProfile() {
  try {
    const id = globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_PROFILE) ?? "balanced";
    return resolveCardProfile(id);
  } catch (_error) {
    return PROFILE_DEFINITIONS.balanced;
  }
}

export function cardProfileMultiplier(card, profile = null) {
  const resolved = resolveCardProfile(profile);
  const tone = CARD_TONES.includes(card?.tone) ? card.tone : "neutral";
  const impact = CARD_IMPACTS.includes(card?.impact) ? card.impact : card?.effect ? "moderate" : "narrative";
  return Number(resolved.toneWeights[tone] ?? 1) * Number(resolved.impactWeights[impact] ?? 1);
}

export function listCardProfiles() {
  return CARD_PROFILE_IDS.map((id) => resolveCardProfile(id));
}

function customProfileFromSettings() {
  let tone = "any";
  let impact = "any";
  try {
    tone = globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_CUSTOM_TONE) ?? "any";
    impact = globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CARD_CUSTOM_IMPACT) ?? "any";
  } catch (_error) {
    // Defaults remain active outside Foundry and in unit tests.
  }
  return freezeProfile({
    id: "custom",
    toneWeights: preferenceWeights(CARD_TONES, tone),
    impactWeights: preferenceWeights(CARD_IMPACTS, impact)
  });
}

function preferenceWeights(values, preferred) {
  if (preferred === "any") return Object.fromEntries(values.map((value) => [value, 1]));
  return Object.fromEntries(values.map((value) => [value, preferred === value ? 2 : 0.45]));
}

function normalizeWeights(source, values) {
  return Object.fromEntries(values.map((value) => {
    const weight = Number(source?.[value]);
    return [value, Number.isFinite(weight) && weight >= 0 ? weight : 1];
  }));
}

function freezeProfile(profile) {
  return Object.freeze({
    id: profile.id,
    toneWeights: Object.freeze({ ...profile.toneWeights }),
    impactWeights: Object.freeze({ ...profile.impactWeights })
  });
}
