import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";
import {
  CABIN_BATTERY_TOP,
  DC_BUS_CENTER,
  RV_VERTICAL_COLUMN_WIDTH,
} from "./anchors";

export function flowCabinBatteryToDcBus(
  config: FlowCardPlusConfig,
  {
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.cabinBattery.measuredOut;
  if (!rvData.rvMode || !rvData.cabinBattery.has || value <= 0) return nothing;
  const duration = newDur.cabinBatteryToDcBus ?? config.max_flow_rate;

  return html`<div class="rv-flow-lines rv-battery-column-flow-lines rv-dc-battery-flow-lines">
    <svg
      viewBox="0 0 ${RV_VERTICAL_COLUMN_WIDTH} 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-cabin-battery-to-dc-bus-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-cabin-battery-to-dc-bus-path"
        class="rv-cabin-battery-to-dc-bus-path"
        d="M${CABIN_BATTERY_TOP.x},${CABIN_BATTERY_TOP.y} V${DC_BUS_CENTER.verticalFromBelow.y}"
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
