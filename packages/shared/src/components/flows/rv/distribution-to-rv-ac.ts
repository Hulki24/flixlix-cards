import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { getVisibleRvAcPower } from "../../../utils/rv-ac-display";
import { type Flows } from "../index";
import {
  DISTRIBUTION_AC_RIGHT,
  RV_AC_LEFT,
  RV_HORIZONTAL_VIEWBOX_HEIGHT,
} from "./anchors";

export function flowDistributionToRvAc(
  config: FlowCardPlusConfig,
  {
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur" | "solar"> & {
    rvData: RvRuntimeData;
  }
) {
  const value = getVisibleRvAcPower(config, rvData.loads.acPower);
  if (
    !rvData.rvMode ||
    !rvData.loads.acPowerConfigured ||
    !rvData.loads.acPowerAvailable ||
    config.entities.home?.hide === true ||
    rvData.shore.inputPower <= 0 ||
    value <= 0
  ) {
    return nothing;
  }

  const duration = newDur.distributionToRvAc ?? config.max_flow_rate;
  return html`<div class="rv-flow-lines rv-horizontal-flow-lines rv-distribution-ac-flow-lines">
    <svg
      viewBox="0 0 100 ${RV_HORIZONTAL_VIEWBOX_HEIGHT}"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-distribution-to-rv-ac-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-distribution-to-rv-ac-path"
        class="rv-distribution-to-rv-ac-path"
        d="M${DISTRIBUTION_AC_RIGHT.x},${DISTRIBUTION_AC_RIGHT.y} H${RV_AC_LEFT.x}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-distribution-to-rv-ac-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-distribution-to-rv-ac-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
