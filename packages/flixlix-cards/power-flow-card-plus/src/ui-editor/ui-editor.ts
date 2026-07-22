import localize from "@flixlix-cards/shared/i18n";
import {
  type ConfigPage,
  type LovelaceRowConfig,
  type PowerFlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import "@flixlix-cards/shared/ui-editor/components/individual-devices-editor";
import "@flixlix-cards/shared/ui-editor/components/link-subpage";
import "@flixlix-cards/shared/ui-editor/components/subpage-header";
import { batterySchema } from "@flixlix-cards/shared/ui-editor/schema/battery";
import { nonFossilSchema } from "@flixlix-cards/shared/ui-editor/schema/fossil-fuel-percentage";
import { gridSchema } from "@flixlix-cards/shared/ui-editor/schema/grid";
import { homeSchema } from "@flixlix-cards/shared/ui-editor/schema/home";
import { solarSchema } from "@flixlix-cards/shared/ui-editor/schema/solar";
import { loadHaForm } from "@flixlix-cards/shared/ui-editor/utils/load-ha-form";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { resolveRvMode } from "@flixlix-cards/shared/utils/resolve-rv-mode";
import { fireEvent, type HomeAssistant, type LovelaceCardEditor } from "custom-card-helpers";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { assert } from "superstruct";
import { advancedOptionsSchema, cardConfigStruct, generalConfigSchema } from "./schema/_schema-all";
import { rvEditorSchema } from "./schema/rv";

const CONFIG_PAGES: {
  page: ConfigPage;
  icon?: string;
  schema?: any;
}[] = [
  {
    page: "grid",
    icon: "mdi:transmission-tower",
    schema: gridSchema,
  },
  {
    page: "solar",
    icon: "mdi:solar-power",
    schema: solarSchema,
  },
  {
    page: "battery",
    icon: "mdi:battery-high",
    schema: batterySchema,
  },
  {
    page: "fossil_fuel_percentage",
    icon: "mdi:leaf",
    schema: nonFossilSchema,
  },
  {
    page: "home",
    icon: "mdi:home",
    schema: homeSchema,
  },
  {
    page: "rv",
    icon: "mdi:caravan",
    schema: rvEditorSchema,
  },
  {
    page: "individual",
    icon: "mdi:dots-horizontal-circle-outline",
  },
  {
    page: "advanced",
    icon: "mdi:cog",
    schema: advancedOptionsSchema,
  },
];

function removeEmptyOptionalValues(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => [key, removeEmptyOptionalValues(entry)] as const)
    .filter(([, entry]) => entry !== undefined);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function sanitizeRvEditorValue(value: unknown): PowerFlowCardPlusConfig["rv"] | undefined {
  return removeEmptyOptionalValues(value) as PowerFlowCardPlusConfig["rv"] | undefined;
}

const RV_DISPLAY_TARGETS = {
  shore: "grid",
  solar_charger: "solar",
  cabin_battery: "battery",
  loads: "home",
} as const;

const RV_DISPLAY_KEYS = {
  shore: [
    "name",
    "icon",
    "decimals",
    "unit_of_measurement",
    "color",
    "color_value",
    "display_zero",
    "secondary_info",
  ],
  solar_charger: [
    "name",
    "icon",
    "decimals",
    "unit_of_measurement",
    "color",
    "color_value",
    "display_zero",
    "secondary_info",
  ],
  cabin_battery: [
    "name",
    "icon",
    "decimals",
    "unit_of_measurement",
    "color",
    "color_value",
    "display_zero",
    "state_of_charge_decimals",
    "state_of_charge_unit",
    "show_state_of_charge",
  ],
  loads: [
    "name",
    "icon",
    "decimals",
    "unit_of_measurement",
    "color_value",
    "display_zero",
    "secondary_info",
  ],
} as const;

type RvDisplayGroup = keyof typeof RV_DISPLAY_TARGETS;

function pickDisplayValues(
  value: Record<string, unknown> | undefined,
  keys: readonly string[]
): Record<string, unknown> {
  if (!value) return {};
  return Object.fromEntries(keys.filter((key) => key in value).map((key) => [key, value[key]]));
}

export function buildRvEditorData(config: PowerFlowCardPlusConfig): Record<string, unknown> {
  const rv = config.rv ?? {};
  const data = { ...rv } as Record<string, unknown>;
  for (const group of Object.keys(RV_DISPLAY_TARGETS) as RvDisplayGroup[]) {
    const target = RV_DISPLAY_TARGETS[group];
    const rvGroup = (rv[group] ?? {}) as Record<string, unknown>;
    data[group] = {
      ...rvGroup,
      display: pickDisplayValues(
        config.entities[target] as unknown as Record<string, unknown> | undefined,
        RV_DISPLAY_KEYS[group]
      ),
    };
  }
  return data;
}

export function applyRvEditorValue(
  current: PowerFlowCardPlusConfig,
  value: Record<string, unknown>
): PowerFlowCardPlusConfig {
  const rvValue = { ...value };
  const entities = { ...current.entities } as Record<string, unknown>;

  for (const group of Object.keys(RV_DISPLAY_TARGETS) as RvDisplayGroup[]) {
    const rawGroup = (rvValue[group] ?? {}) as Record<string, unknown>;
    if (!("display" in rawGroup)) continue;
    const { display, ...technicalValues } = rawGroup;
    rvValue[group] = technicalValues;

    const target = RV_DISPLAY_TARGETS[group];
    const entityConfig = {
      ...((entities[target] ?? {}) as Record<string, unknown>),
    };
    for (const key of RV_DISPLAY_KEYS[group]) delete entityConfig[key];
    const sanitizedDisplay = removeEmptyOptionalValues(
      pickDisplayValues(display as Record<string, unknown> | undefined, RV_DISPLAY_KEYS[group])
    ) as Record<string, unknown> | undefined;
    const updatedEntity = { ...entityConfig, ...(sanitizedDisplay ?? {}) };
    if (Object.keys(updatedEntity).length > 0) entities[target] = updatedEntity;
    else delete entities[target];
  }

  const config = { ...current, entities } as PowerFlowCardPlusConfig;
  const rv = sanitizeRvEditorValue(rvValue);
  if (rv === undefined) delete config.rv;
  else config.rv = rv;
  return config;
}

@customElement("power-flow-card-plus-editor")
export class PowerFlowCardPlusEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: PowerFlowCardPlusConfig;
  @state() private _configEntities?: LovelaceRowConfig[] = [];
  @state() private _currentConfigPage: ConfigPage = null;

  public async setConfig(config: PowerFlowCardPlusConfig): Promise<void> {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaForm();
  }

  private _editDetailElement(pageClicked: ConfigPage): void {
    this._currentConfigPage = pageClicked;
  }

  private _goBack(): void {
    this._currentConfigPage = null;
  }

  private _shouldShowRvEditor(): boolean {
    return !!this._config && (resolveRvMode(this._config) || this._config.rv !== undefined);
  }

  private _renderRvHelp() {
    return html`
      <ha-alert class="rv-editor-help" alert-type="info">
        <ul>
          <li>Power entities take precedence over voltage × current.</li>
          <li>Battery net power: positive means charging, negative means discharging.</li>
          <li>RV DC power overrides the internal DC consumption calculation.</li>
          <li>Conversion losses are not rendered as an energy flow.</li>
        </ul>
      </ha-alert>
    `;
  }

  private _hasLegacyFields(): boolean {
    if (!this._config) return false;
    return (
      this._config.watt_threshold !== undefined ||
      this._config.w_decimals !== undefined ||
      this._config.kw_decimals !== undefined
    );
  }

  private _migrateLegacyFields(): void {
    if (!this._config) return;
    const config: PowerFlowCardPlusConfig = { ...this._config };

    if (typeof config.watt_threshold === "number" && config.kilo_threshold === undefined) {
      config.kilo_threshold = config.watt_threshold;
    }
    if (typeof config.w_decimals === "number" && config.base_decimals === undefined) {
      config.base_decimals = config.w_decimals;
    }
    if (typeof config.kw_decimals === "number" && config.kilo_decimals === undefined) {
      config.kilo_decimals = config.kw_decimals;
    }

    delete config.watt_threshold;
    delete config.w_decimals;
    delete config.kw_decimals;

    this._config = config;
    fireEvent(this, "config-changed", { config });
  }

  private _renderLegacyFieldsAlert() {
    if (!this._hasLegacyFields()) return nothing;
    return html`
      <ha-alert class="legacy-fields-alert" alert-type="warning">
        Legacy config fields detected. Field names changed: w_decimals -> base_decimals, kw_decimals
        -> kilo_decimals, watt_threshold -> kilo_threshold.<br />
        More info: https://github.com/flixlix/power-flow-card-plus/releases/tag/v0.3.5
        <button
          class="legacy-fields-alert-button"
          slot="action"
          @click=${this._migrateLegacyFields}
        >
          Convert automatically
        </button>
      </ha-alert>
    `;
  }

  private _hasLegacyIndividualFields(): boolean {
    if (!this._config) return false;
    const entities = this._config.entities as PowerFlowCardPlusConfig["entities"] & {
      individual1?: unknown;
      individual2?: unknown;
    };
    return entities.individual1 !== undefined || entities.individual2 !== undefined;
  }

  private _migrateLegacyIndividualFields(): void {
    if (!this._config) return;
    const config = {
      ...this._config,
      entities: { ...this._config.entities },
    } as PowerFlowCardPlusConfig & {
      entities: PowerFlowCardPlusConfig["entities"] & {
        individual1?: unknown;
        individual2?: unknown;
      };
    };
    const individual = Array.isArray(config.entities.individual)
      ? [...config.entities.individual]
      : [];

    const appendLegacy = (value: unknown) => {
      if (Array.isArray(value)) {
        individual.push(...value);
        return;
      }
      if (value !== undefined) {
        individual.push(value as any);
      }
    };

    appendLegacy(config.entities.individual1);
    appendLegacy(config.entities.individual2);

    config.entities.individual = individual;
    delete config.entities.individual1;
    delete config.entities.individual2;

    this._config = config;
    fireEvent(this, "config-changed", { config });
  }

  private _renderLegacyIndividualFieldsAlert() {
    if (!this._hasLegacyIndividualFields()) return nothing;
    return html`
      <ha-alert class="legacy-fields-alert" alert-type="warning">
        Legacy individual fields detected. Field names changed: entities.individual1/individual2 ->
        entities.individual[].
        <button
          class="legacy-fields-alert-button"
          slot="action"
          @click=${this._migrateLegacyIndividualFields}
        >
          Convert automatically
        </button>
      </ha-alert>
    `;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const data = {
      ...this._config,
      display_zero_lines: {
        mode: this._config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode,
        transparency:
          this._config.display_zero_lines?.transparency ??
          defaultValues.displayZeroLines.transparency,
        grey_color:
          this._config.display_zero_lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
      },
    };

    if (this._currentConfigPage !== null) {
      if (this._currentConfigPage === "individual") {
        return html`
          ${this._renderLegacyFieldsAlert()}${this._renderLegacyIndividualFieldsAlert()}
          <subpage-header @go-back=${this._goBack} page=${this._currentConfigPage}>
          </subpage-header>
          <individual-devices-editor
            .hass=${this.hass}
            .config=${this._config}
            @config-changed=${this._valueChanged}
          ></individual-devices-editor>
        `;
      }

      const currentPage = this._currentConfigPage;
      const schema =
        currentPage === "advanced"
          ? advancedOptionsSchema(
              localize,
              this._config.display_zero_lines?.mode ?? defaultValues.displayZeroLines.mode
            )
          : CONFIG_PAGES.find((page) => page.page === currentPage)?.schema;
      const dataForForm =
        currentPage === "advanced"
          ? data
          : currentPage === "rv"
            ? buildRvEditorData(this._config)
            : data.entities[currentPage];
      return html`
        ${this._renderLegacyFieldsAlert()}${this._renderLegacyIndividualFieldsAlert()}
        <subpage-header @go-back=${this._goBack} page=${this._currentConfigPage}> </subpage-header>
        ${currentPage === "rv" ? this._renderRvHelp() : nothing}
        <ha-form
          .hass=${this.hass}
          .data=${dataForForm}
          .schema=${schema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }

    const renderLinkSubpage = (
      page: ConfigPage,
      fallbackIcon: string | undefined = "mdi:dots-horizontal-circle-outline"
    ) => {
      if (page === null) return nothing;
      const getIconToUse = () => {
        if (page === "individual" || page === "advanced" || page === "rv") return fallbackIcon;
        const entityConfig = this?._config?.entities[page] as { icon?: string } | undefined;
        return entityConfig?.icon || fallbackIcon;
      };
      const icon = getIconToUse();
      return html`
        <link-subpage
          path=${page}
          header="${localize(`editor.${page}`)}"
          @open-sub-element-editor=${() => this._editDetailElement(page)}
          icon=${icon}
        >
        </link-subpage>
      `;
    };

    const renderLinkSubPages = () => {
      return CONFIG_PAGES.filter((page) => page.page !== "rv" || this._shouldShowRvEditor()).map(
        (page) => renderLinkSubpage(page.page, page.icon)
      );
    };
    return html`
      <div class="card-config">
        ${this._renderLegacyFieldsAlert()}${this._renderLegacyIndividualFieldsAlert()}
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${generalConfigSchema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${renderLinkSubPages()}
      </div>
    `;
  }

  private _valueChanged(ev: any): void {
    let config = ev.detail.value || "";

    if (!this._config || !this.hass) {
      return;
    }

    if (this._currentConfigPage === "rv") {
      config = applyRvEditorValue(this._config, config);
    } else if (
      this._currentConfigPage !== null &&
      this._currentConfigPage !== "advanced" &&
      this._currentConfigPage !== "individual"
    ) {
      config = {
        ...this._config,
        entities: {
          ...this._config.entities,
          [this._currentConfigPage]: config,
        },
      };
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: any) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema?.name}`) ||
    localize(`editor.${schema?.name}`) ||
    schema?.label;

  static get styles() {
    return css`
      ha-form {
        width: 100%;
      }

      ha-icon-button {
        align-self: center;
      }

      .entities-section * {
        background-color: #f00;
      }

      .card-config {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 10px;
      }

      .legacy-fields-alert {
        margin-bottom: 8px;
      }

      .legacy-fields-alert-button {
        border: none;
        background: var(--warning-color);
        border-radius: 99px;
        color: var(--card-background-color);
        cursor: pointer;
        font: inherit;
        padding: 4px 8px;
      }

      .config-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .config-header.sub-header {
        margin-top: 24px;
      }

      ha-icon {
        padding-bottom: 2px;
        position: relative;
        top: -4px;
        right: 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-flow-card-plus-editor": PowerFlowCardPlusEditor;
  }
}
