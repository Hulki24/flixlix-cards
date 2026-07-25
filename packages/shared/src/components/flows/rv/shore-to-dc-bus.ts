import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";
import {
  DC_BUS_CENTER,
  DISTRIBUTION_DC_RIGHT,
  RV_HORIZONTAL_VIEWBOX_HEIGHT,
} from "./anchors";

export function flowShoreToDcBus(
  config: FlowCardPlusConfig,
  {
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur" | "solar"> & {
    rvData: RvRuntimeData;
  }
) {
  const value = rvData.acCharger.outputPower;
  const acChargerActive = value > 0 && rvData.shore.inputPower > 0;
  if (!rvData.rvMode || !rvData.acCharger.has || !acChargerActive) return nothing;

  const duration = newDur.shoreToDcBus ?? config.max_flow_rate;
  return html`<div class="rv-flow-lines rv-horizontal-flow-lines rv-dc-source-flow-lines">
    <svg
      viewBox="0 0 100 ${RV_HORIZONTAL_VIEWBOX_HEIGHT}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-shore-dc-bus-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-shore-dc-bus-path"
        class="rv-shore-dc-bus-path"
        d="M${DISTRIBUTION_DC_RIGHT.x},${DISTRIBUTION_DC_RIGHT.y} H${DC_BUS_CENTER
          .horizontal.x}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-shore-dc-bus-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-shore-dc-bus-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
