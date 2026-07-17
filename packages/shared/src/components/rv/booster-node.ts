import { type RvChargerRuntimeData } from "@flixlix-cards/shared/types";
import { html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";

function isBoosterActive(booster: RvChargerRuntimeData): boolean {
  return Number.isFinite(booster.outputPower) && booster.outputPower > 0;
}

export function boosterNodeElement(
  booster: RvChargerRuntimeData,
  narrow = false
): TemplateResult | typeof nothing {
  if (!booster.has) return nothing;

  const active = isBoosterActive(booster);
  return html`
    <div
      id="rv-booster-node"
      class=${classMap({
        "rv-booster-node-container": true,
        "rv-booster-node-container--narrow": narrow,
      })}
      data-active=${String(active)}
      data-state=${booster.state ?? "unknown"}
      aria-label="Booster"
    >
      <span
        class=${classMap({
          "rv-booster-node": true,
          "rv-booster-node--active": active,
        })}
      ></span>
    </div>
  `;
}
