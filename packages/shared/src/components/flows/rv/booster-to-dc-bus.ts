import { type FlowCardPlusConfig, type RvRuntimeData } from "@flixlix-cards/shared/types";
import { checkShouldShowDots } from "@flixlix-cards/shared/utils/check-should-show-dots";
import { html, nothing, svg } from "lit";
import { type Flows } from "../index";

export function flowBoosterToDcBus(
  config: FlowCardPlusConfig,
  { newDur, rvData }: Pick<Flows, "newDur"> & { rvData: RvRuntimeData }
) {
  const value = rvData.booster.outputPower;
  if (!rvData.rvMode || !rvData.booster.has || value <= 0) return nothing;

  const duration = newDur.boosterToDcBus ?? config.max_flow_rate;
  return html`<div class="rv-flow-lines rv-booster-to-dc-bus-flow-lines">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      id="rv-booster-to-dc-bus-flow"
      data-power-watts=${String(value)}
    >
      <path
        id="rv-booster-to-dc-bus-path"
        class="rv-booster-to-dc-bus-path"
        d="M0,100 L100,0"
        vector-effect="non-scaling-stroke"
      ></path>
      ${checkShouldShowDots(config)
        ? svg`<circle r="1" class="rv-booster-to-dc-bus-dot" vector-effect="non-scaling-stroke">
              <animateMotion dur="${duration}s" repeatCount="indefinite" calcMode="paced">
                <mpath xlink:href="#rv-booster-to-dc-bus-path" />
              </animateMotion>
            </circle>`
        : nothing}
    </svg>
  </div>`;
}
