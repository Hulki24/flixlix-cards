import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "../index";

export function flowShoreToAcLoad(
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
  const value = rvData.loads.acPower;
  if (
    !rvData.rvMode ||
    !rvData.loads.acPowerConfigured ||
    !rvData.loads.acPowerAvailable ||
    rvData.shore.inputPower <= 0 ||
    value <= 0
  ) {
    return nothing;
  }

  const duration = newDur.shoreToAcLoad ?? config.max_flow_rate;
  const middleY = battery.has ? 50 : solar.has ? 56 : 53;
  return html`<div
    class="lines rv-ac-load-flow-lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((entry) => entry?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-shore-ac-load-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-shore-ac-load-path"
        class="rv-shore-ac-load-path"
        d="M0,${middleY} V0"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-shore-ac-load-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-shore-ac-load-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
