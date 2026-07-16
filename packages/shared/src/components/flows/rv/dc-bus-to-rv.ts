import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "../index";

export function flowDcBusToRv(
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
  const value = rvData.rvDcConsumption;
  if (!rvData.rvMode || value <= 0) return nothing;
  const duration = newDur.dcBusToRv ?? config.max_flow_rate;

  return html`<div
    class="lines rv-dc-load-flow-lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((entry) => entry?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-dc-bus-to-rv-flow"
      class="flat-line"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-dc-bus-to-rv-path"
        class="rv-dc-bus-to-rv-path"
        d="M50,${battery.has ? 50 : solar.has ? 56 : 53} H100"
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
