import { type RvDcBusRenderData } from "@flixlix-cards/shared/types";
import { html, nothing, type TemplateResult } from "lit";

export function dcBusElement(dcBus: RvDcBusRenderData): TemplateResult | typeof nothing {
  if (!dcBus.has) return nothing;

  return html`
    <div class="rv-dc-bus-container" id="rv-dc-bus">
      <span
        class=${dcBus.className}
        role="img"
        aria-label="DC bus"
        data-active=${String(dcBus.active)}
      ></span>
    </div>
  `;
}
