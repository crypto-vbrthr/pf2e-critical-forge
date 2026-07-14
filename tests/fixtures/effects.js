export function shakenNerves({ modifierType = "circumstance" } = {}) {
  return {
    schemaVersion: 1,
    id: "example.shaken-nerves",
    name: "Erschütterte Nerven",
    description: "<p>Das Ziel ist erschüttert.</p>",
    img: "icons/svg/terror.svg",
    duration: { value: 2, unit: "rounds", expiry: "turn-end" },
    components: [
      { type: "condition", slug: "frightened", value: 2 },
      {
        type: "modifier",
        selector: "will",
        value: -1,
        modifierType,
        predicate: []
      }
    ],
    application: {},
    metadata: { originModule: "test-suite" }
  };
}

export function proneEffect({ includeLegacyValue = false } = {}) {
  const condition = { type: "condition", slug: "prone" };
  if (includeLegacyValue) condition.value = 1;

  return {
    schemaVersion: 1,
    id: "example.prone",
    name: "Zu Boden",
    duration: { value: 1, unit: "rounds", expiry: "turn-end" },
    components: [condition],
    application: {},
    metadata: {}
  };
}
