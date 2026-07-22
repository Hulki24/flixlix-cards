import { convertColorListToHex } from "@flixlix-cards/shared/style";
import {
  type CardMainContext,
  type ConfigEntities,
  type FlowCardPlusConfig,
  type RvAcLoadDisplayConfig,
  type RvDistributionDisplayConfig,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { generalSecondarySpan } from "./spans/general-secondary-span";

export const gridElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    entities,
    grid,
    templatesObj,
    rvPower,
  }: {
    entities: ConfigEntities;
    grid: any;
    templatesObj: TemplatesObj;
    rvPower?: {
      shoreInput: number;
      acPower: number;
      dcPower: number;
      display: RvDistributionDisplayConfig;
      acDisplay: RvAcLoadDisplayConfig;
    };
  }
) => {
  const disableEntityClick = config.clickable_entities === false;
  const distributionColor = Array.isArray(rvPower?.display.color)
    ? convertColorListToHex(rvPower.display.color)
    : rvPower?.display.color;
  return html`<div class="circle-container grid">
    <div
      class="circle ${rvPower ? "rv-shore-circle" : ""} ${rvPower && rvPower.shoreInput <= 0
        ? "rv-shore-circle--inactive"
        : ""} ${disableEntityClick ? "pointer-events-none" : ""}"
      style=${styleMap(distributionColor ? { "--rv-distribution-color": distributionColor } : {})}
      @click=${(e: MouseEvent) => {
        const outageTarget =
          grid.powerOutage?.entityGenerator ?? entities.grid?.power_outage?.entity;
        const target =
          grid.powerOutage?.isOutage && outageTarget
            ? outageTarget
            : typeof entities.grid!.entity === "string"
              ? entities.grid!.entity
              : entities.grid!.entity.consumption!;
        main.onEntityClick(e, grid, target);
      }}
      @dblclick=${(e: MouseEvent) => {
        const outageTarget =
          grid.powerOutage?.entityGenerator ?? entities.grid?.power_outage?.entity;
        const target =
          grid.powerOutage?.isOutage && outageTarget
            ? outageTarget
            : typeof entities.grid!.entity === "string"
              ? entities.grid!.entity
              : entities.grid!.entity.consumption!;
        main.onEntityDoubleClick(e, grid, target);
      }}
      @pointerdown=${(e: PointerEvent) => {
        const outageTarget =
          grid.powerOutage?.entityGenerator ?? entities.grid?.power_outage?.entity;
        const target =
          grid.powerOutage?.isOutage && outageTarget
            ? outageTarget
            : typeof entities.grid!.entity === "string"
              ? entities.grid!.entity
              : entities.grid!.entity.consumption!;
        main.onEntityPointerDown(e, entities.grid, target);
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          const outageTarget =
            grid.powerOutage?.entityGenerator ?? entities.grid?.power_outage?.entity;
          const target =
            grid.powerOutage?.isOutage && outageTarget
              ? outageTarget
              : typeof entities.grid!.entity === "string"
                ? entities.grid!.entity
                : entities.grid!.entity.consumption!;
          main.openDetails(e, entities.grid, target, "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${!rvPower
        ? generalSecondarySpan(main.hass, main, config, templatesObj, grid, "grid")
        : nothing}
      ${(rvPower?.display.icon ?? grid.icon) !== " "
        ? html` <ha-icon id="grid-icon" .icon=${rvPower?.display.icon ?? grid.icon}></ha-icon>`
        : nothing}
      ${rvPower
        ? html`<div
            class="rv-shore-power-values"
            data-active=${rvPower.shoreInput > 0 ? "true" : "false"}
          >
            ${(rvPower.display.display_zero !== false &&
              rvPower.acDisplay.display_zero !== false) ||
            rvPower.acPower > 0
              ? html`<span
                  class="rv-shore-power-row rv-shore-ac-input ${rvPower.shoreInput > 0 &&
                  rvPower.acPower > 0
                    ? ""
                    : "rv-shore-power-row--inactive"}"
                >
                  <ha-icon
                    class="small rv-shore-power-arrow rv-shore-power-arrow--ac"
                    .icon=${"mdi:arrow-right"}
                    aria-hidden="true"
                  ></ha-icon>
                  <span class="rv-shore-power-value" data-power-watts=${rvPower.acPower}
                    >${displayValue(main.hass, config, rvPower.acPower, {
                      unit: grid.unit,
                      unitWhiteSpace: grid.unit_white_space,
                      decimals: rvPower.acDisplay.decimals ?? grid.decimals,
                    })}</span
                  >
                </span>`
              : nothing}
            ${rvPower.display.display_zero !== false || rvPower.dcPower > 0
              ? html`<span
                  class="rv-shore-power-row rv-shore-dc-output ${rvPower.shoreInput > 0 &&
                  rvPower.dcPower > 0
                    ? ""
                    : "rv-shore-power-row--inactive"}"
                >
                  <span class="rv-shore-power-value" data-power-watts=${rvPower.dcPower}
                    >${displayValue(main.hass, config, rvPower.dcPower, {
                      unit: grid.unit,
                      unitWhiteSpace: grid.unit_white_space,
                      decimals: rvPower.display.decimals ?? grid.decimals,
                    })}</span
                  >
                  <ha-icon
                    class="small rv-shore-power-arrow rv-shore-power-arrow--dc"
                    .icon=${"mdi:arrow-right"}
                    aria-hidden="true"
                  ></ha-icon>
                </span>`
              : nothing}
          </div>`
        : nothing}
      ${(entities.grid?.display_state === "two_way" ||
        entities.grid?.display_state === undefined ||
        (entities.grid?.display_state === "one_way_no_zero" && (grid.state.toGrid ?? 0) > 0) ||
        (entities.grid?.display_state === "one_way" &&
          (grid.state.fromGrid === null || grid.state.fromGrid === 0) &&
          grid.state.toGrid !== 0)) &&
      grid.state.toGrid !== null &&
      !rvPower &&
      !grid.powerOutage.isOutage
        ? html`<span
            class="return"
            @click=${(e: MouseEvent) => {
              const target =
                typeof entities.grid!.entity === "string"
                  ? entities.grid!.entity
                  : entities.grid!.entity.production!;
              main.onEntityClick(e, grid, target);
            }}
            @dblclick=${(e: MouseEvent) => {
              const target =
                typeof entities.grid!.entity === "string"
                  ? entities.grid!.entity
                  : entities.grid!.entity.production!;
              main.onEntityDoubleClick(e, grid, target);
            }}
            @pointerdown=${(e: PointerEvent) => {
              const target =
                typeof entities.grid!.entity === "string"
                  ? entities.grid!.entity
                  : entities.grid!.entity.production!;
              main.onEntityPointerDown(e, entities.grid, target);
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                const target =
                  typeof entities.grid!.entity === "string"
                    ? entities.grid!.entity
                    : entities.grid!.entity.production!;
                main.openDetails(e, entities.grid, target, "tap");
              }
            }}
          >
            <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>

            ${displayValue(main.hass, config, grid.state.toGrid, {
              unit: grid.unit,
              unitWhiteSpace: grid.unit_white_space,
              decimals: grid.decimals,
            })}
          </span>`
        : nothing}
      ${((entities.grid?.display_state === "two_way" ||
        entities.grid?.display_state === undefined ||
        (entities.grid?.display_state === "one_way_no_zero" && grid.state.fromGrid > 0) ||
        (entities.grid?.display_state === "one_way" &&
          (grid.state.toGrid === null || grid.state.toGrid === 0))) &&
        grid.state.fromGrid !== null &&
        !rvPower &&
        !grid.powerOutage.isOutage) ||
      (!rvPower && grid.powerOutage.isOutage && !!grid.powerOutage.entityGenerator)
        ? html` <span
            class="consumption"
            @click=${(e: MouseEvent) => {
              const target =
                typeof entities.grid!.entity === "string"
                  ? entities.grid!.entity
                  : entities.grid!.entity.consumption!;
              main.onEntityClick(e, grid, target);
            }}
            @dblclick=${(e: MouseEvent) => {
              const target =
                typeof entities.grid!.entity === "string"
                  ? entities.grid!.entity
                  : entities.grid!.entity.consumption!;
              main.onEntityDoubleClick(e, grid, target);
            }}
            @pointerdown=${(e: PointerEvent) => {
              const target =
                typeof entities.grid!.entity === "string"
                  ? entities.grid!.entity
                  : entities.grid!.entity.consumption!;
              main.onEntityPointerDown(e, entities.grid, target);
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                const target =
                  typeof entities.grid!.entity === "string"
                    ? entities.grid!.entity
                    : entities.grid!.entity.consumption!;
                main.openDetails(e, entities.grid, target, "tap");
              }
            }}
          >
            <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
            ${displayValue(main.hass, config, grid.state.fromGrid, {
              unit: grid.unit,
              unitWhiteSpace: grid.unit_white_space,
              decimals: grid.decimals,
            })}
          </span>`
        : nothing}
      ${grid.powerOutage?.isOutage && !grid.powerOutage?.entityGenerator
        ? html`<span class="grid power-outage">${grid.powerOutage.name}</span>`
        : nothing}
    </div>
    <span class="label">${rvPower?.display.name ?? grid.name}</span>
  </div>`;
};
