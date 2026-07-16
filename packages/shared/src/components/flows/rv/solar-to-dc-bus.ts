import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "../index";

const solarToDcBusDot = (config: FlowCardPlusConfig, value: number, duration: number) => {
  if (!checkShouldShowDots(config) || value <= 0) return nothing;

  return svg`<circle r="1" class="rv-solar-dc-bus-dot" vector-effect="non-scaling-stroke">
      <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#rv-solar-dc-bus-path" />
      </animateMotion>
    </circle>`;
};

export function flowSolarToDcBus(
  config: FlowCardPlusConfig,
  {
    battery,
    individual,
    newDur,
    rvData,
  }: Pick<Flows, "battery" | "individual" | "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.solarCharger.outputPower;
  if (!rvData.rvMode || !rvData.solarCharger.has || value <= 0) return nothing;

  const duration = newDur.solarToDcBus ?? config.max_flow_rate;
  return html`<div
    class="lines rv-dc-source-flow-lines ${classMap({
      high: battery.has || checkHasBottomIndividual(individual),
      "individual1-individual2": !battery.has && individual.every((entry) => entry?.has),
      "multi-individual": checkHasRightIndividual(individual),
    })}"
  >
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-solar-dc-bus-flow"
      class="flat-line"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-solar-dc-bus-path"
        class="rv-solar-dc-bus-path"
        d="M50,0 V${battery.has ? 50 : 56}"
        vector-effect="non-scaling-stroke"
      ></path>
      ${solarToDcBusDot(config, value, duration)}
    </svg>
  </div>`;
}
