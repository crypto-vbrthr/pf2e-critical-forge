import { CONDITION_FIELD_PATTERN, CONDITION_VALUE_TYPES } from "./condition-constants.js";
import { deepClone, deepFreeze, normalizeString, normalizeStringArray } from "../utils.js";

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const ENUM_TYPE = "enum";
const SUPPORTED_TYPES = new Set([...CONDITION_VALUE_TYPES, ENUM_TYPE]);

export class ConditionProviderRegistry {
  #providers = new Map();
  #fields = new Map();

  register(rawProvider, { replace = false } = {}) {
    const provider = normalizeProvider(rawProvider);
    const existing = this.#providers.get(provider.id);
    if (existing && !replace) throw registryError("CONDITION_PROVIDER_CONFLICT", `Critical condition provider already registered: ${provider.id}`);
    if (existing?.protected && replace) throw registryError("CONDITION_PROVIDER_PROTECTED", `Protected Critical condition provider cannot be replaced: ${provider.id}`);
    if (existing && provider.sourceModule && existing.sourceModule !== provider.sourceModule) {
      throw registryError(
        "CONDITION_PROVIDER_OWNERSHIP",
        `Critical condition provider ${provider.id} is owned by ${existing.sourceModule}, not ${provider.sourceModule}.`
      );
    }

    const oldPaths = new Set(existing?.fields?.map((field) => field.path) ?? []);
    for (const field of provider.fields) {
      const collision = this.#fields.get(field.path);
      if (!collision || oldPaths.has(field.path)) continue;
      throw registryError(
        "CONDITION_FIELD_CONFLICT",
        `Critical condition field already registered: ${field.path}`,
        { path: field.path, existingProviderId: collision.providerId, providerId: provider.id }
      );
    }

    if (existing) this.#removeFields(existing);
    this.#providers.set(provider.id, provider);
    for (const field of provider.fields) this.#fields.set(field.path, field);
    return provider;
  }

  unregister(providerId, { sourceModule = null } = {}) {
    const id = normalizeIdentifier(providerId);
    const existing = this.#providers.get(id);
    if (!existing) return false;
    if (existing.protected) return false;
    assertOwner(existing, sourceModule);
    this.#removeFields(existing);
    return this.#providers.delete(id);
  }

  get(providerId) {
    return this.#providers.get(normalizeIdentifier(providerId)) ?? null;
  }

  getField(path) {
    return this.#fields.get(normalizeString(path)) ?? null;
  }

  list({ sourceModule = null } = {}) {
    const owner = normalizeString(sourceModule);
    return [...this.#providers.values()]
      .filter((provider) => !owner || provider.sourceModule === owner)
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  }

  listFields({ sourceModule = null } = {}) {
    const owner = normalizeString(sourceModule);
    return [...this.#fields.values()]
      .filter((field) => !owner || field.sourceModule === owner)
      .sort((left, right) => right.priority - left.priority || left.path.localeCompare(right.path));
  }

  clear() {
    this.#providers.clear();
    this.#fields.clear();
  }

  #removeFields(provider) {
    for (const field of provider.fields ?? []) this.#fields.delete(field.path);
  }
}

export const criticalConditionProviderRegistry = new ConditionProviderRegistry();

function normalizeProvider(provider) {
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
    throw new TypeError("A Critical Forge condition provider must be an object.");
  }
  const id = normalizeIdentifier(provider.id);
  if (!PROVIDER_ID_PATTERN.test(id)) throw new TypeError(`Invalid Critical Forge condition provider id: ${provider.id}`);
  if (!Array.isArray(provider.fields) || provider.fields.length === 0) {
    throw new TypeError(`Critical condition provider ${id} requires a non-empty fields array.`);
  }
  const priority = Number(provider.priority ?? 0);
  if (!Number.isFinite(priority)) throw new TypeError("Critical condition provider priority must be finite.");
  const sourceModule = normalizeString(provider.sourceModule) || null;
  const fields = provider.fields.map((field) => normalizeField(field, { providerId: id, sourceModule, priority }));
  const duplicate = fields.find((field, index) => fields.findIndex((candidate) => candidate.path === field.path) !== index);
  if (duplicate) throw registryError("CONDITION_FIELD_DUPLICATE", `Duplicate condition field in provider ${id}: ${duplicate.path}`);

  return deepFreeze({
    id,
    version: normalizeString(provider.version, "1"),
    priority,
    sourceModule,
    protected: Boolean(provider.protected),
    fields
  });
}

function normalizeField(field, provider) {
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    throw new TypeError(`Condition fields for provider ${provider.providerId} must be objects.`);
  }
  const path = normalizeString(field.path);
  if (!CONDITION_FIELD_PATTERN.test(path)) throw new TypeError(`Invalid Critical Forge condition field path: ${field.path}`);
  const type = normalizeString(field.type, "string");
  if (!SUPPORTED_TYPES.has(type)) throw new TypeError(`Unsupported Critical Forge condition field type: ${field.type}`);
  const values = type === ENUM_TYPE ? normalizeStringArray(field.values ?? []) : [];
  if (type === ENUM_TYPE && values.length === 0) {
    throw new TypeError(`Enum condition field ${path} requires values.`);
  }
  return deepFreeze({
    path,
    type,
    values,
    labelKey: normalizeString(field.labelKey) || null,
    fallbackLabel: normalizeString(field.fallbackLabel, path),
    groupKey: normalizeString(field.groupKey) || null,
    fallbackGroup: normalizeString(field.fallbackGroup, provider.providerId),
    descriptionKey: normalizeString(field.descriptionKey) || null,
    fallbackDescription: normalizeString(field.fallbackDescription) || null,
    providerId: provider.providerId,
    sourceModule: provider.sourceModule,
    priority: provider.priority,
    extension: true
  });
}

function assertOwner(provider, sourceModule) {
  const owner = normalizeString(sourceModule);
  if (!owner || !provider.sourceModule || provider.sourceModule === owner) return;
  throw registryError(
    "CONDITION_PROVIDER_OWNERSHIP",
    `Critical condition provider ${provider.id} is owned by ${provider.sourceModule}, not ${owner}.`
  );
}

function normalizeIdentifier(value) {
  return normalizeString(value).toLowerCase();
}

function registryError(code, message, data = {}) {
  const error = new Error(message);
  error.code = code;
  error.data = deepClone(data);
  return error;
}
