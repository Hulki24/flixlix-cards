import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "../index";
import { RV_DC_FLOW_Y } from "./layout";

export function flowCabinBatteryToDcBus(
  config: FlowCardPlusConfig,
  {
    battery,
    individual,
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.cabinBattery.measuredOut;
  if (!rvData.rvMode || !rvData.cabinBattery.has || value <= 0) return nothing;
  const duration = newDur.cabinBatteryToDcBus ?? config.max_flow_rate;

  return html`<div
    class="lines rv-dc-battery-flow-lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((entry) => entry?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-cabin-battery-to-dc-bus-flow"
      class="flat-line"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-cabin-battery-to-dc-bus-path"
        class="rv-cabin-battery-to-dc-bus-path"
        d="M50,100 V${RV_DC_FLOW_Y}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle
              r="1"
              class="rv-cabin-battery-to-dc-bus-dot"
              vector-effect="non-scaling-stroke"
            >
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-cabin-battery-to-dc-bus-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
