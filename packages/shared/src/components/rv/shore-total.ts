import { baseSecondarySpan } from "@flixlix-cards/shared/components/spans/base-secondary-span";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type RvBubbleDisplayConfig,
  type RvShoreRuntimeData,
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

export function shoreTotalElement(
  main: CardMainContext,
  config: FlowCardPlusConfig,
  shore: RvShoreRuntimeData,
  display: RvBubbleDisplayConfig
): TemplateResult | typeof nothing {
  if (!shore.has) return nothing;
  const secondary = display.secondary_info;
  const secondaryValue = resolveSecondaryValue(main, secondary?.entity);
  const showSecondary =
    secondaryValue !== null && (secondaryValue !== 0 || secondary?.display_zero === true);
  const disableEntityClick = config.clickable_entities === false || !shore.entity;
  const active = shore.inputPower > 0;

  return html`<div
    class="circle-container rv-shore-total ${active
      ? "rv-shore-total--active"
      : "rv-shore-total--inactive"}"
    id="rv-shore-total"
    data-active=${String(active)}
  >
    <span class="label">${display.name}</span>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(event: MouseEvent) => main.onEntityClick(event, display, shore.entity)}
      @dblclick=${(event: MouseEvent) => main.onEntityDoubleClick(event, display, shore.entity)}
      @pointerdown=${(event: PointerEvent) =>
        main.onEntityPointerDown(event, display, shore.entity)}
      @pointerup=${(event: PointerEvent) => main.onEntityPointerUp(event)}
      @pointercancel=${(event: PointerEvent) => main.onEntityPointerUp(event)}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${showSecondary
        ? baseSecondarySpan({
            main,
            className: "rv-shore-total",
            entityId: secondary?.entity,
            icon: secondary?.icon,
            value: displayValue(main.hass, config, secondaryValue, {
              unit: secondary?.unit_of_measurement,
              unitWhiteSpace: secondary?.unit_white_space,
              decimals: secondary?.decimals,
            }),
          })
        : nothing}
      ${display.icon !== " "
        ? html`<ha-icon id="rv-shore-total-icon" .icon=${display.icon}></ha-icon>`
        : nothing}
      <span class="rv-shore-total-value" data-power-watts=${String(shore.inputPower)}>
        ${displayValue(main.hass, config, shore.inputPower, {
          unit: display.unit_of_measurement,
          unitWhiteSpace: display.unit_white_space,
          decimals: display.decimals,
        })}
      </span>
    </div>
  </div>`;
}
