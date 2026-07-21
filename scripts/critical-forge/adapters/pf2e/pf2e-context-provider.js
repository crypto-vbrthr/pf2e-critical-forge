import { createPf2eSelectionContext, PF2E_CONTEXT_ADAPTER_VERSION } from "./pf2e-context-adapter.js";
import {
  PF2E_CONTEXT_SNAPSHOT_PROVIDER_ID,
  PF2E_CONTEXT_SNAPSHOT_PROVIDER_VERSION
} from "./pf2e-context-snapshot.js";

export function createPf2eContextProvider() {
  return Object.freeze({
    id: PF2E_CONTEXT_SNAPSHOT_PROVIDER_ID,
    system: "pf2e",
    version: PF2E_CONTEXT_SNAPSHOT_PROVIDER_VERSION,
    priority: 0,
    sourceModule: "pf2e-critical-forge",
    protected: true,
    adapterVersion: PF2E_CONTEXT_ADAPTER_VERSION,
    createContext: (input) => createPf2eSelectionContext(input)
  });
}
