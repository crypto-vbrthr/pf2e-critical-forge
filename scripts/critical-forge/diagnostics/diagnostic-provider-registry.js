import { deepClone, deepFreeze, normalizeString } from "../utils.js";

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;

export class DiagnosticProviderRegistry {
  #providers = new Map();

  register(rawProvider, { replace = false } = {}) {
    const provider = normalizeProvider(rawProvider);
    const existing = this.#providers.get(provider.id);
    if (existing && !replace) throw registryError("DIAGNOSTIC_PROVIDER_CONFLICT", `Critical diagnostic provider already registered: ${provider.id}`);
    if (existing?.protected && replace) throw registryError("DIAGNOSTIC_PROVIDER_PROTECTED", `Protected Critical diagnostic provider cannot be replaced: ${provider.id}`);
    if (existing && provider.sourceModule && existing.sourceModule !== provider.sourceModule) {
      throw registryError(
        "DIAGNOSTIC_PROVIDER_OWNERSHIP",
        `Critical diagnostic provider ${provider.id} is owned by ${existing.sourceModule}, not ${provider.sourceModule}.`
      );
    }
    this.#providers.set(provider.id, provider);
    return provider;
  }

  unregister(providerId, { sourceModule = null } = {}) {
    const id = normalizeIdentifier(providerId);
    const existing = this.#providers.get(id);
    if (!existing) return false;
    if (existing.protected) return false;
    assertOwner(existing, sourceModule);
    return this.#providers.delete(id);
  }

  get(providerId) {
    return this.#providers.get(normalizeIdentifier(providerId)) ?? null;
  }

  list({ sourceModule = null } = {}) {
    const owner = normalizeString(sourceModule);
    return [...this.#providers.values()]
      .filter((provider) => !owner || provider.sourceModule === owner)
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  }

  collect(diagnostic, options = {}) {
    return deepFreeze(this.list().map((provider) => inspectProvider(provider, diagnostic, options)));
  }

  clear() {
    this.#providers.clear();
  }
}

export const criticalDiagnosticProviderRegistry = new DiagnosticProviderRegistry();

function normalizeProvider(provider) {
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
    throw new TypeError("A Critical Forge diagnostic provider must be an object.");
  }
  const id = normalizeIdentifier(provider.id);
  if (!PROVIDER_ID_PATTERN.test(id)) throw new TypeError(`Invalid Critical Forge diagnostic provider id: ${provider.id}`);
  if (typeof provider.inspect !== "function") {
    throw new TypeError(`Critical diagnostic provider ${id} requires inspect(diagnostic, options).`);
  }
  const priority = Number(provider.priority ?? 0);
  if (!Number.isFinite(priority)) throw new TypeError("Critical diagnostic provider priority must be finite.");
  return Object.freeze({
    id,
    version: normalizeString(provider.version, "1"),
    priority,
    sourceModule: normalizeString(provider.sourceModule) || null,
    protected: Boolean(provider.protected),
    inspect: provider.inspect
  });
}

function inspectProvider(provider, diagnostic, options) {
  try {
    const result = provider.inspect(diagnostic, options);
    if (result && typeof result.then === "function") {
      throw new TypeError(`Diagnostic provider ${provider.id} returned a Promise; inspect must be synchronous.`);
    }
    return deepFreeze({
      id: provider.id,
      version: provider.version,
      sourceModule: provider.sourceModule,
      status: "ok",
      data: deepClone(result ?? null),
      error: null
    });
  } catch (error) {
    return deepFreeze({
      id: provider.id,
      version: provider.version,
      sourceModule: provider.sourceModule,
      status: "error",
      data: null,
      error: {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
        code: error?.code ?? "DIAGNOSTIC_PROVIDER_FAILED"
      }
    });
  }
}

function assertOwner(provider, sourceModule) {
  const owner = normalizeString(sourceModule);
  if (!owner || !provider.sourceModule || provider.sourceModule === owner) return;
  throw registryError(
    "DIAGNOSTIC_PROVIDER_OWNERSHIP",
    `Critical diagnostic provider ${provider.id} is owned by ${provider.sourceModule}, not ${owner}.`
  );
}

function normalizeIdentifier(value) {
  return normalizeString(value).toLowerCase();
}

function registryError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
