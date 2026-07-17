import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import {
  checkHasBottomIndividual,
  checkHasRightIndividual,
} from "@flixlix-cards/shared/utils/compute-individual-position";
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { type Flows } from "../index";

const shoreToDcBusDot = (config: FlowCardPlusConfig, value: number, duration: number) => {
  if (!checkShouldShowDots(config) || value <= 0) return nothing;

  return svg`<circle r="1" class="rv-shore-dc-bus-dot" vector-effect="non-scaling-stroke">
      <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
        <mpath xlink:href="#rv-shore-dc-bus-path" />
      </animateMotion>
    </circle>`;
};

export function flowShoreToDcBus(
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
  const value = rvData.acCharger.outputPower;
  const acChargerActive = value > 0 && rvData.shore.inputPower > 0;
  if (!rvData.rvMode || !rvData.acCharger.has || !acChargerActive) return nothing;

  const duration = newDur.shoreToDcBus ?? config.max_flow_rate;
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
      id="rv-shore-dc-bus-flow"
      class="flat-line"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-shore-dc-bus-path"
        class="rv-shore-dc-bus-path"
        d="M0,${battery.has ? 50 : solar.has ? 56 : 53} H50"
        vector-effect="non-scaling-stroke"
      ></path>
      ${shoreToDcBusDot(config, value, duration)}
    </svg>
  </div>`;
}
