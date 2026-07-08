import {
  type CardMainContext,
  type FlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { html, nothing } from "lit";

export const starterBatteryElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    starterBattery,
  }: {
    starterBattery: any;
  }
) => {
  const disableEntityClick = config.clickable_entities === false;

  return html`
    <div class="circle-container starter-battery">
      <div class="circle ${disableEntityClick ? "pointer-events-none" : ""}">
        <ha-ripple .disabled=${disableEntityClick}></ha-ripple>

        ${starterBattery.icon !== " "
          ? html`
              <ha-icon
                id="starter-battery-icon"
                .icon=${starterBattery.icon ?? "mdi:car-battery"}
              ></ha-icon>
            `
          : nothing}

        ${starterBattery.voltage !== null &&
        starterBattery.voltage !== undefined
          ? html`
              <span id="starter-battery-voltage">
                ${displayValue(main.hass, config, starterBattery.voltage, {
                  unit: "V",
                  decimals: 1,
                })}
              </span>
            `
          : nothing}

        ${starterBattery.current !== null &&
        starterBattery.current !== undefined
          ? html`
              <span class="battery-current">
                ${displayValue(main.hass, config, starterBattery.current, {
                  unit: "A",
                  decimals: 1,
                  accept_negative: true,
                })}
              </span>
            `
          : nothing}

        ${starterBattery.power !== null &&
        starterBattery.power !== undefined
          ? html`
              <span class="battery-power">
                ${displayValue(main.hass, config, starterBattery.power, {
                  unit: "W",
                  decimals: 0,
                  accept_negative: true,
                })}
              </span>
            `
          : nothing}
      </div>

      <span class="label">
        Starter Battery
      </span>
    </div>
  `;
};