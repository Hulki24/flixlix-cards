import {
  type FlowCardPlusConfig,
  type RvStarterBatteryRuntimeData,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { type HomeAssistant } from "custom-card-helpers";
import { html, nothing, type TemplateResult } from "lit";

export function starterBatteryElement(
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  starterBattery: RvStarterBatteryRuntimeData
): TemplateResult | typeof nothing {
  if (!starterBattery.has) return nothing;

  return html`
    <div class="circle-container rv-starter-battery" id="rv-starter-battery">
      <div class="circle">
        <ha-icon icon="mdi:car-battery"></ha-icon>
        <span class="rv-starter-battery-voltage">
          ${displayValue(hass, config, starterBattery.voltage, { unit: "V", decimals: 1 })}
        </span>
        ${starterBattery.power !== 0
          ? html`<span class="secondary-info rv-starter-battery-power">
              ${displayValue(hass, config, starterBattery.power, { unit: "W" })}
            </span>`
          : nothing}
      </div>
      <span class="label">Starter Battery</span>
    </div>
  `;
}
