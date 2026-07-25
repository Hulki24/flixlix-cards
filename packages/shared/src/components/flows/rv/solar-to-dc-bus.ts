import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";
import {
  DC_BUS_CENTER,
  RV_VERTICAL_COLUMN_WIDTH,
  SOLAR_BOTTOM,
} from "./anchors";

export function flowSolarToDcBus(
  config: FlowCardPlusConfig,
  {
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.solarCharger.outputPower;
  if (!rvData.rvMode || !rvData.solarCharger.has || value <= 0) return nothing;

  const duration = newDur.solarToDcBus ?? config.max_flow_rate;
  return html`<div class="rv-flow-lines rv-middle-column-flow-lines rv-solar-dc-bus-flow-lines">
    <svg
      viewBox="0 0 ${RV_VERTICAL_COLUMN_WIDTH} 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-solar-dc-bus-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-solar-dc-bus-path"
        class="rv-solar-dc-bus-path"
        d="M${SOLAR_BOTTOM.x},${SOLAR_BOTTOM.y} V${DC_BUS_CENTER.verticalFromAbove.y}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-solar-dc-bus-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-solar-dc-bus-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
