import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";
import {
  CABIN_BATTERY_TOP,
  DC_BUS_CENTER,
  RV_VERTICAL_COLUMN_WIDTH,
} from "./anchors";

export function flowDcBusToCabinBattery(
  config: FlowCardPlusConfig,
  {
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.cabinBattery.measuredIn;
  if (!rvData.rvMode || !rvData.cabinBattery.has || value <= 0) return nothing;
  const duration = newDur.dcBusToCabinBattery ?? config.max_flow_rate;

  return html`<div class="rv-flow-lines rv-battery-column-flow-lines rv-dc-battery-flow-lines">
    <svg
      viewBox="0 0 ${RV_VERTICAL_COLUMN_WIDTH} 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-dc-bus-to-cabin-battery-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-dc-bus-to-cabin-battery-path"
        class="rv-dc-bus-to-cabin-battery-path"
        d="M${DC_BUS_CENTER.verticalFromBelow.x},${DC_BUS_CENTER.verticalFromBelow
          .y} V${CABIN_BATTERY_TOP.y}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle
              r="1"
              class="rv-dc-bus-to-cabin-battery-dot"
              vector-effect="non-scaling-stroke"
            >
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-dc-bus-to-cabin-battery-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
