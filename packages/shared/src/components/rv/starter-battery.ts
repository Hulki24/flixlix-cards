import { convertColorListToHex } from "@flixlix-cards/shared/style";
import {
  type FlowCardPlusConfig,
  type RvStarterBatteryConfig,
  type RvStarterBatteryRuntimeData,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { type HomeAssistant } from "custom-card-helpers";
import { html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

export function starterBatteryElement(
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  starterBattery: RvStarterBatteryRuntimeData,
  display?: RvStarterBatteryConfig
): TemplateResult | typeof nothing {
  if (!starterBattery.has) return nothing;
  const color = Array.isArray(display?.color)
    ? convertColorListToHex(display.color)
    : display?.color;
  const showPower = starterBattery.power !== 0 || display?.secondary_info?.display_zero === true;

  return html`
    <div
      class="circle-container rv-starter-battery"
      id="rv-starter-battery"
      style=${styleMap(color ? { "--energy-starter-battery-color": color } : {})}
    >
      <div class="circle">
        <ha-icon .icon=${display?.icon ?? "mdi:car-battery"}></ha-icon>
        <span class="rv-starter-battery-voltage">
          ${displayValue(hass, config, starterBattery.voltage, {
            unit: display?.unit_of_measurement ?? "V",
            decimals: display?.decimals ?? 1,
          })}
        </span>
        ${showPower
          ? html`<span class="secondary-info rv-starter-battery-power">
              ${displayValue(hass, config, starterBattery.power, {
                unit: display?.secondary_info?.unit_of_measurement ?? "W",
                decimals: display?.secondary_info?.decimals,
              })}
            </span>`
          : nothing}
      </div>
      <span class="label">${display?.name ?? "Starter Battery"}</span>
    </div>
  `;
}
