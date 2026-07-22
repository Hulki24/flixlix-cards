import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "../index";

export function flowShoreTotalToDistribution(
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
  const value = rvData.shore.inputPower;
  if (!rvData.rvMode || !rvData.shore.has || value <= 0) return nothing;

  const duration = newDur.shoreToDistribution ?? config.max_flow_rate;
  const middleY = battery.has ? 50 : solar.has ? 56 : 53;
  return html`<div
    class="lines rv-shore-distribution-flow-lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((entry) => entry?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-shore-distribution-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-shore-distribution-path"
        class="rv-shore-distribution-path"
        d="M0,0 V${middleY}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-shore-distribution-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-shore-distribution-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
