import { EFFECT_SCHEMA_VERSION } from "../../constants.js";
import {
  buildCondition,
  buildModifier,
  buildPersistentDamage,
  buildResistance,
  buildImmunity,
  buildWeakness,
  buildFastHealing,
  buildRegeneration,
  buildTemporaryHitPoints,
  buildMovement,
  buildBaseSpeed,
  cloneComponent
} from "./component-builder.js";
import { buildDuration } from "./duration-builder.js";

export class EffectBuilder {
  #definition;

  constructor(source = null) {
    this.#definition = source
      ? foundry.utils.deepClone(source)
      : {
          schemaVersion: EFFECT_SCHEMA_VERSION,
          id: null,
          name: "",
          description: "",
          img: "icons/svg/aura.svg",
          duration: buildDuration(-1, "unlimited", null),
          components: [],
          application: {},
          metadata: {}
        };

    this.#definition.schemaVersion = EFFECT_SCHEMA_VERSION;
    this.#definition.components ??= [];
    this.#definition.application ??= {};
    this.#definition.metadata ??= {};
  }

  static from(definition) {
    if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
      throw new TypeError("EffectBuilder.from() requires an Effect Definition object.");
    }
    return new EffectBuilder(definition);
  }

  setId(id) {
    this.#definition.id = id == null ? null : String(id).trim();
    return this;
  }

  setName(name) {
    this.#definition.name = String(name ?? "").trim();
    return this;
  }

  setDescription(description) {
    this.#definition.description = String(description ?? "");
    return this;
  }

  setImage(img) {
    this.#definition.img = String(img ?? "").trim() || "icons/svg/aura.svg";
    return this;
  }

  setDuration(value, unit = "rounds", expiry = "turn-end") {
    this.#definition.duration = buildDuration(value, unit, expiry);
    return this;
  }

  setApplication(application = {}) {
    if (!application || typeof application !== "object" || Array.isArray(application)) {
      throw new TypeError("Application data must be an object.");
    }
    this.#definition.application = foundry.utils.deepClone(application);
    return this;
  }

  setMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new TypeError("Metadata must be an object.");
    }
    this.#definition.metadata = foundry.utils.deepClone(metadata);
    return this;
  }

  mergeMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new TypeError("Metadata must be an object.");
    }
    this.#definition.metadata = foundry.utils.mergeObject(
      this.#definition.metadata ?? {},
      foundry.utils.deepClone(metadata),
      { inplace: false }
    );
    return this;
  }

  addComponent(component) {
    this.#definition.components.push(cloneComponent(component));
    return this;
  }

  addCondition(slug, value) {
    this.#definition.components.push(buildCondition(slug, value));
    return this;
  }

  addModifier(options) {
    this.#definition.components.push(buildModifier(options));
    return this;
  }

  addPersistentDamage(options) {
    this.#definition.components.push(buildPersistentDamage(options));
    return this;
  }

  addResistance(options) {
    this.#definition.components.push(buildResistance(options));
    return this;
  }

  addWeakness(options) {
    this.#definition.components.push(buildWeakness(options));
    return this;
  }

  addImmunity(options) {
    this.#definition.components.push(buildImmunity(options));
    return this;
  }

  addFastHealing(options) {
    this.#definition.components.push(buildFastHealing(options));
    return this;
  }

  addRegeneration(options) {
    this.#definition.components.push(buildRegeneration(options));
    return this;
  }

  addTemporaryHitPoints(options) {
    this.#definition.components.push(buildTemporaryHitPoints(options));
    return this;
  }

  addMovement(options) {
    this.#definition.components.push(buildMovement(options));
    return this;
  }

  addBaseSpeed(options) {
    this.#definition.components.push(buildBaseSpeed(options));
    return this;
  }

  clearComponents() {
    this.#definition.components = [];
    return this;
  }

  removeComponent(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#definition.components.length) {
      throw new RangeError(`Invalid component index: ${index}`);
    }
    this.#definition.components.splice(index, 1);
    return this;
  }

  get componentCount() {
    return this.#definition.components.length;
  }

  build() {
    const definition = foundry.utils.deepClone(this.#definition);
    definition.schemaVersion = EFFECT_SCHEMA_VERSION;
    definition.components = definition.components.map((component) =>
      foundry.utils.deepClone(component)
    );
    return foundry.utils.deepFreeze(definition);
  }
}

export function createEffectBuilder() {
  return new EffectBuilder();
}
