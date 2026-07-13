import { MODULE_ID } from "../constants.js";
import { EffectForgeApp } from "./effect-forge-app.js";

let app = null;

export function openEffectForge() {
  if (!game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.Notifications.GmOnly"));
    return;
  }

  app ??= new EffectForgeApp();
  app.render({ force: true });
}

function getRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function isItemDirectory(app, root) {
  const tabName = app?.tabName ?? app?.options?.tabName ?? app?.id ?? "";
  if (String(tabName).toLowerCase().includes("item")) return true;
  return Boolean(root?.matches?.("#items, .items-directory") || root?.querySelector?.("#items, .items-directory"));
}

function injectButton(app, html) {
  if (!game.user?.isGM) return;

  const root = getRoot(html);
  if (!root || !isItemDirectory(app, root)) return;
  if (root.querySelector(`[data-${MODULE_ID}-button]`)) return;

  const selectors = [
    ".directory-header .header-actions",
    ".directory-header .action-buttons",
    ".directory-header",
    ".header-actions",
    "header"
  ];

  const target = selectors.map((selector) => root.querySelector(selector)).find(Boolean);
  if (!target) {
    console.debug(`${MODULE_ID} | No suitable Item Directory button target found.`, root);
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(`data-${MODULE_ID}-button`, "");
  button.className = "pf2e-critical-forge-open";
  button.innerHTML = `<i class="fa-solid fa-hammer"></i> ${game.i18n.localize(
    "PF2E_CRITICAL_FORGE.EffectForge.Open"
  )}`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openEffectForge();
  });
  target.append(button);
}

export function initializeEffectForgeUi() {
  // Legacy directory hook used by Foundry 13 and some system directory implementations.
  Hooks.on("renderItemDirectory", injectButton);

  // Generic sidebar hook catches the ApplicationV2 sidebar used by newer Foundry versions.
  Hooks.on("renderSidebarTab", injectButton);

  // If the Items tab is already rendered when ready fires, inject immediately.
  const current = document.querySelector("#items, .items-directory");
  if (current) injectButton({ tabName: "items" }, current);

  console.info(`${MODULE_ID} | Effect Forge UI integration initialized.`);
}
