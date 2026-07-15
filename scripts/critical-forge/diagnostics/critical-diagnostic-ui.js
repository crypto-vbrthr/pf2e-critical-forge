import { MODULE_ID } from "../../constants.js";
import { CriticalDiagnosticApp } from "./critical-diagnostic-app.js";
import {
  DIAGNOSTIC_BUTTON_ATTRIBUTE,
  DIAGNOSTIC_TOOLBAR_ATTRIBUTE,
  findDiagnosticButtonHost,
  getRootElement,
  isChatApplication,
  isElementLike
} from "./critical-diagnostic-button.js";

let app = null;
let initialized = false;
let sidebarObserver = null;
let injectionQueued = false;

export async function openCriticalDiagnostics(message = null) {
  if (!game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.Notifications.GmOnly"));
    return null;
  }

  try {
    app ??= new CriticalDiagnosticApp();
    if (message) await app.analyzeMessage(message);
    else await app.render({ force: true });

    app.bringToFront?.();
    return app;
  } catch (error) {
    console.error(`${MODULE_ID} | Could not open Critical Forge diagnostics`, error);
    ui.notifications.error(
      game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.OpenFailed")
    );
    return null;
  }
}

export function initializeCriticalDiagnosticUi() {
  if (initialized) return;
  initialized = true;

  // ChatLog renders its message log and input as separate ApplicationV2 parts.
  // Only attach to the actual ChatLog/input part; never to a parent sidebar frame.
  Hooks.on("renderChatLog", injectDiagnosticButton);
  Hooks.on("activateChatLog", injectDiagnosticButton);
  Hooks.on("renderApplicationV2", injectApplicationV2Fallback);

  injectCurrentChatApplications();
  globalThis.setTimeout?.(injectCurrentChatApplications, 100);
  observeSidebar();

  console.info(`${MODULE_ID} | Critical diagnostic UI initialized.`);
}

function injectApplicationV2Fallback(application, html) {
  const root = getRootElement(application, html);
  if (!isChatApplication(application, root)) return;
  injectDiagnosticButton(application, root);
}

function injectDiagnosticButton(application, html) {
  if (!game.user?.isGM) return;

  const root = getRootElement(application, html);
  if (!root || !isChatApplication(application, root)) return;
  if (root.querySelector?.(`[${DIAGNOSTIC_TOOLBAR_ATTRIBUTE}]`)) return;

  const host = findDiagnosticButtonHost(root);
  if (!host || !host.parentElement) return;

  const toolbar = document.createElement("div");
  toolbar.className = "pf2e-critical-forge-diagnostic-toolbar";
  toolbar.setAttribute(DIAGNOSTIC_TOOLBAR_ATTRIBUTE, "");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute(
    "aria-label",
    game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.Open")
  );

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pf2e-critical-forge-diagnostic-open";
  button.setAttribute(DIAGNOSTIC_BUTTON_ATTRIBUTE, "");
  button.title = game.i18n.localize("PF2E_CRITICAL_FORGE.CriticalDiagnostic.OpenHint");
  button.innerHTML = `<i class="fa-solid fa-microscope"></i><span>${game.i18n.localize(
    "PF2E_CRITICAL_FORGE.CriticalDiagnostic.Open"
  )}</span>`;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void openCriticalDiagnostics();
  });

  toolbar.append(button);
  host.insertAdjacentElement?.("afterend", toolbar);
  if (!toolbar.isConnected) host.after(toolbar);
}

function injectCurrentChatApplications() {
  if (!game.user?.isGM) return;

  const candidates = [
    ui?.chat,
    ui?.chat?.popout,
    ui?.sidebar?.tabs?.chat,
    ui?.sidebar?.children?.get?.("chat")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const root = getRootElement(candidate);
    if (root) injectDiagnosticButton(candidate, root);
  }

  const selectors = [
    '[data-tab="chat"]',
    '.sidebar-tab[data-tab="chat"]',
    '#chat',
    '.chat-log'
  ];
  for (const selector of selectors) {
    for (const root of document.querySelectorAll?.(selector) ?? []) {
      injectDiagnosticButton({ tabName: "chat", element: root }, root);
    }
  }
}

function queueInjection() {
  if (injectionQueued) return;
  injectionQueued = true;
  globalThis.requestAnimationFrame?.(() => {
    injectionQueued = false;
    injectCurrentChatApplications();
  }) ?? globalThis.setTimeout?.(() => {
    injectionQueued = false;
    injectCurrentChatApplications();
  }, 0);
}

function observeSidebar() {
  if (sidebarObserver || typeof MutationObserver === "undefined") return;
  const sidebar = document.querySelector?.("#sidebar") ?? ui?.sidebar?.element;
  if (!isElementLike(sidebar)) return;

  sidebarObserver = new MutationObserver(queueInjection);
  sidebarObserver.observe(sidebar, { childList: true, subtree: true });
}
