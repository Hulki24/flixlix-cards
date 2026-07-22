import { baseSecondarySpan } from "@flixlix-cards/shared/components/spans/base-secondary-span";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type RvAcLoadDisplayConfig,
  type RvLoadsRuntimeData,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { html, nothing, type TemplateResult } from "lit";

function resolveSecondaryValue(main: CardMainContext, entityId?: string): number | null {
  if (!entityId) return null;
  const state = main.hass.states[entityId]?.state;
  if (state === undefined || ["unknown", "unavailable"].includes(state.toLowerCase())) return null;
  const value = Number(state);
  return Number.isFinite(value) ? value : null;
}

export function acLoadElement(
  main: CardMainContext,
  config: FlowCardPlusConfig,
  loads: RvLoadsRuntimeData,
  display?: RvAcLoadDisplayConfig,
  active = false
): TemplateResult | typeof nothing {
  if (!loads.acPowerConfigured) return nothing;
  const secondary = display?.secondary_info;
  const secondaryValue = resolveSecondaryValue(main, secondary?.entity);
  const showSecondary =
    secondaryValue !== null && (secondaryValue !== 0 || secondary?.display_zero === true);
  const disableEntityClick = config.clickable_entities === false || !loads.acEntity;

  return html`<div
    class="circle-container rv-ac-load ${active ? "rv-ac-load--active" : "rv-ac-load--inactive"}"
    id="rv-ac-load"
    data-active=${String(active)}
  >
    <span class="label">${display?.name ?? "230 V"}</span>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(event: MouseEvent) => main.onEntityClick(event, display, loads.acEntity)}
      @dblclick=${(event: MouseEvent) => main.onEntityDoubleClick(event, display, loads.acEntity)}
      @pointerdown=${(event: PointerEvent) =>
        main.onEntityPointerDown(event, display, loads.acEntity)}
      @pointerup=${(event: PointerEvent) => main.onEntityPointerUp(event)}
      @pointercancel=${(event: PointerEvent) => main.onEntityPointerUp(event)}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${showSecondary
        ? baseSecondarySpan({
            main,
            className: "rv-ac-load",
            entityId: secondary?.entity,
            icon: secondary?.icon,
            value: displayValue(main.hass, config, secondaryValue, {
              unit: secondary?.unit_of_measurement,
              unitWhiteSpace: secondary?.unit_white_space,
              decimals: secondary?.decimals,
            }),
          })
        : nothing}
      ${display?.icon !== " "
        ? html`<ha-icon
            id="rv-ac-load-icon"
            .icon=${display?.icon ?? "mdi:power-socket-eu"}
          ></ha-icon>`
        : nothing}
      <span class="rv-ac-load-value" data-power-watts=${String(loads.acPower)}>
        ${displayValue(main.hass, config, loads.acPower, {
          unit: display?.unit_of_measurement,
          unitWhiteSpace: display?.unit_white_space,
          decimals: display?.decimals,
        })}
      </span>
    </div>
  </div>`;
}
