import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { getVisibleRvAcPower } from "../../../utils/rv-ac-display";
import { type Flows } from "../index";
import { RV_AC_FLOW_Y } from "./layout";

export function flowDistributionToRvAc(
  config: FlowCardPlusConfig,
  {
    battery,
    individual,
    newDur,
    rvData,
    solar,
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
  return html`<div
    class="lines rv-distribution-ac-flow-lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((entry) => entry?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-distribution-to-rv-ac-flow"
      class="flat-line"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-distribution-to-rv-ac-path"
        class="rv-distribution-to-rv-ac-path"
        d="M0,${RV_AC_FLOW_Y} H100"
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
