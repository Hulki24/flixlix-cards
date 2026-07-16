import { type IndividualObject } from "@flixlix-cards/shared/states/raw/individual/get-individual-object";
import {
  type FlowCardPlusConfig,
  type NewDur,
  type RvRuntimeData,
} from "@flixlix-cards/shared/types";
import { html } from "lit";
import { flowBatteryToGrid } from "./battery-to-grid";
import { flowBatteryToHome } from "./battery-to-home";
import { flowGridToHome } from "./grid-to-home";
import { flowShoreToDcBus } from "./rv/shore-to-dc-bus";
import { flowSolarToDcBus } from "./rv/solar-to-dc-bus";
import { flowSolarToGrid } from "./solar-to-grid";
import { flowSolarToHome } from "./solar-to-home";
import { flowSolarToBattery } from "./solart-to-battery";

export interface Flows {
  battery: any;
  grid: any;
  individual: IndividualObject[];
  solar: any;
  newDur: NewDur;
  rvData?: RvRuntimeData;
}

export const flowElement = (
  config: FlowCardPlusConfig,
  { battery, grid, individual, solar, newDur, rvData }: Flows,
  rvMode = config.rv_mode === true || config.main_config?.rv_mode === true
) => {
  if (rvMode) {
    return html`
      ${rvData
        ? html`${flowShoreToDcBus(config, { battery, individual, newDur, rvData, solar })}
          ${flowSolarToDcBus(config, { battery, individual, newDur, rvData })}`
        : ""}
      ${flowBatteryToHome(config, { battery, grid, individual, newDur })}
    `;
  }

  return html`
  ${flowSolarToHome(config, { battery, grid, individual, solar, newDur }, false)}
  ${flowSolarToGrid(config, { battery, grid, individual, solar, newDur })}
  ${flowSolarToBattery(config, { battery, individual, solar, newDur })}
  ${flowGridToHome(config, { battery, grid, individual, solar, newDur }, false)}
  ${flowBatteryToHome(config, { battery, grid, individual, newDur })}
  ${flowBatteryToGrid(config, { battery, grid, individual, newDur })}
</div>`;
};
