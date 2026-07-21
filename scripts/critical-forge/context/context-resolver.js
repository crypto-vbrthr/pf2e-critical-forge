import { criticalContextProviderRegistry } from "./context-provider-registry.js";
import { createPf2eContextProvider } from "../adapters/pf2e/pf2e-context-provider.js";

if (!criticalContextProviderRegistry.get("pf2e", "core-pf2e")) {
  criticalContextProviderRegistry.register(createPf2eContextProvider());
}

export function resolveCriticalContext(input = {}, {
  system = "pf2e",
  providerId = null,
  registry = criticalContextProviderRegistry,
  ...providerOptions
} = {}) {
  const provider = registry.get(system, providerId);
  if (!provider) {
    const suffix = providerId ? `/${providerId}` : "";
    throw new Error(`Unsupported Critical Forge context provider: ${system}${suffix}`);
  }
  return provider.createContext(input, providerOptions);
}
