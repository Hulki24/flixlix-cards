import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";
import { DC_BUS_CENTER, RV_DC_LEFT, RV_HORIZONTAL_VIEWBOX_HEIGHT } from "./anchors";

export function flowDcBusToRv(
  config: FlowCardPlusConfig,
  {
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur" | "solar"> & {
    rvData: RvRuntimeData;
  }
) {
  const value = rvData.rvDcConsumption;
  if (!rvData.rvMode || value <= 0) return nothing;
  const duration = newDur.dcBusToRv ?? config.max_flow_rate;

  return html`<div class="rv-flow-lines rv-horizontal-flow-lines rv-dc-load-flow-lines">
    <svg
      viewBox="0 0 100 ${RV_HORIZONTAL_VIEWBOX_HEIGHT}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-dc-bus-to-rv-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-dc-bus-to-rv-path"
        class="rv-dc-bus-to-rv-path"
        d="M${DC_BUS_CENTER.horizontal.x},${DC_BUS_CENTER.horizontal.y} H${RV_DC_LEFT.x}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-dc-bus-to-rv-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-dc-bus-to-rv-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
