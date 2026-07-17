import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";

export function flowStarterToBooster(
  config: FlowCardPlusConfig,
  { newDur, rvData }: Pick<Flows, "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.booster.inputPower;
  if (
    !rvData.rvMode ||
    !rvData.starterBattery.has ||
    !rvData.booster.has ||
    rvData.booster.outputPower <= 0 ||
    value <= 0
  ) {
    return nothing;
  }

  const duration = newDur.starterToBooster ?? config.max_flow_rate;
  return html`<div class="lines high rv-booster-flow-lines">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      id="rv-starter-to-booster-flow"
      class="flat-line"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-starter-to-booster-path"
        class="rv-starter-to-booster-path"
        d="M0,100 H25"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-starter-to-booster-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-starter-to-booster-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
