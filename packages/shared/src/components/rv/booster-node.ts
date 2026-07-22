import { convertColorListToHex } from "@flixlix-cards/shared/style";
import { type RvChargerRuntimeData } from "@flixlix-cards/shared/types";
import { html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";

function isBoosterActive(booster: RvChargerRuntimeData): boolean {
  return Number.isFinite(booster.outputPower) && booster.outputPower > 0;
}

export function boosterNodeElement(
  booster: RvChargerRuntimeData,
  narrow = false,
  configuredColor?: string | number[]
): TemplateResult | typeof nothing {
  const active = isBoosterActive(booster);
  if (!booster.has || !active) return nothing;
  const color = Array.isArray(configuredColor)
    ? convertColorListToHex(configuredColor)
    : configuredColor;

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
      style=${styleMap(color ? { "--energy-booster-color": color } : {})}
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
