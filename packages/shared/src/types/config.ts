import {
  type ActionConfigSet,
  type BaseConfigEntity,
  type ComboEntity,
  type GridPowerOutage,
  type IndividualDeviceType,
  type LovelaceCardConfig,
  type SecondaryInfoType,
} from "./type";

export type DisplayZeroLinesMode = "show" | "grey_out" | "transparency" | "hide" | "custom";

interface mainConfigOptions {
  /**
   * Enables RV / Camper power flow logic.
   */
  rv_mode?: boolean;
  main_config?: {
    rv_mode?: boolean;
  };
  dashboard_link?: string;
  dashboard_link_label?: string;
  second_dashboard_link?: string;
  second_dashboard_link_label?: string;
  min_flow_rate: number;
  max_flow_rate: number;
  clickable_entities: boolean;
  max_expected_power: number;
  min_expected_power: number;
  use_new_flow_rate_model?: boolean;
  base_decimals: number;
  kilo_decimals: number;
  kilo_threshold: number;
  mega_decimals: number;
  mega_threshold: number;
  full_size?: boolean;
  style_ha_card?: any;
  style_card_content?: any;
  disable_dots?: boolean;
  no_labels?: boolean;
  display_zero_lines?: {
    mode?: DisplayZeroLinesMode;
    transparency?: number;
    grey_color?: string | number[];
  };
  sort_individual_devices?: boolean;
  allow_layout_break?: boolean;
  /* LEGACY - JUST TO AVOID ERRORS */
  w_threshold?: number;
  w_decimals?: number;
  kw_decimals?: number;
  wh_threshold?: number;
  wh_kwh_threshold?: number;
  wh_decimals?: number;
  kwh_decimals?: number;
  mwh_decimals?: number;
}

export interface FlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: ConfigEntities;
}

export interface PowerFlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: ConfigEntities;
  rv?: RvConfig;
}

export interface EnergyFlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: ConfigEntities;
  collection_key?: string;
}

export type IndividualField = IndividualDeviceType[];

interface Battery extends BaseConfigEntity {
  state_of_charge?: string;
  state_of_charge_unit?: string;
  state_of_charge_unit_white_space?: boolean;
  state_of_charge_decimals?: number;
  show_state_of_charge?: boolean;
  display_zero?: boolean;
  color_state_of_charge_value?: "no_color" | "color_dynamically" | "production" | "consumption";
  color_circle: "color_dynamically" | "production" | "consumption";
  color_value?: boolean;
  color?: ComboEntity;
}

interface Grid extends BaseConfigEntity {
  power_outage: GridPowerOutage;
  secondary_info?: SecondaryInfoType;
  display_zero?: boolean;
  color_circle: "color_dynamically" | "production" | "consumption";
  color_value?: boolean;
  color?: ComboEntity;
}

interface Solar extends BaseConfigEntity {
  entity: string;
  color?: any;
  color_icon?: boolean;
  color_value?: boolean;
  color_label?: boolean;
  secondary_info?: SecondaryInfoType & {
    sum_total?: boolean;
  };
  display_zero?: boolean;
  display_zero_state?: boolean;
}

interface Home extends BaseConfigEntity {
  entity: string;
  override_state?: boolean;
  color_icon?: boolean | "solar" | "grid" | "battery";
  color_value?: boolean | "solar" | "grid" | "battery";
  subtract_individual?: boolean;
  secondary_info?: SecondaryInfoType;
  circle_animation?: boolean;
  hide?: boolean;
  display_zero?: boolean;
}

/** Home Assistant entity ID; validated structurally at configuration boundaries. */
export type EntityId = string;

interface LegacyRvEntity {
  entity?: EntityId;
}

interface LegacyRvHouseBattery {
  charge?: EntityId;
  discharge?: EntityId;
  soc?: EntityId;
}

export interface RvShoreConfig {
  input_power?: EntityId;
}

export interface RvOutputConfig {
  state?: EntityId;
  output_power?: EntityId;
  output_voltage?: EntityId;
  output_current?: EntityId;
}

export interface RvAcChargerConfig extends RvOutputConfig {
  input_power?: EntityId;
  input_voltage?: EntityId;
  input_current?: EntityId;
}

export type RvSolarChargerConfig = RvOutputConfig;

export interface RvBoosterConfig extends RvOutputConfig {
  input_power?: EntityId;
  input_voltage?: EntityId;
  input_current?: EntityId;
  color?: string | number[];
}

export interface RvCabinBatteryConfig {
  net_power?: EntityId;
  voltage?: EntityId;
  state_of_charge?: EntityId;
  charging_state?: EntityId;
}

export interface RvStarterBatteryConfig {
  voltage?: EntityId;
  power?: EntityId;
  /** @deprecated Legacy RV field retained for compatibility. */
  current?: EntityId;
  name?: string;
  icon?: string;
  decimals?: number;
  unit_of_measurement?: string;
  color?: string | number[];
  secondary_info?: {
    decimals?: number;
    unit_of_measurement?: string;
    display_zero?: boolean;
  };
}

export interface RvLoadsConfig {
  total_power?: EntityId;
  ac_power?: EntityId;
  dc_power?: EntityId;
  ac_display?: RvAcLoadDisplayConfig;
}

export interface RvAcLoadDisplayConfig extends ActionConfigSet {
  name?: string;
  icon?: string;
  color?: string | number[];
  decimals?: number;
  unit_of_measurement?: string;
  unit_white_space?: boolean;
  display_zero?: boolean;
  secondary_info?: SecondaryInfoType;
}

export interface RvConfig {
  // Neutral RV configuration.
  shore?: RvShoreConfig;
  ac_charger?: RvAcChargerConfig;
  solar_charger?: RvSolarChargerConfig;
  booster?: RvBoosterConfig;
  cabin_battery?: RvCabinBatteryConfig;
  starter_battery?: RvStarterBatteryConfig;
  loads?: RvLoadsConfig;

  // Legacy RV configuration retained during the compatibility period.
  shore_power?: LegacyRvEntity;
  solar?: LegacyRvEntity;
  house_battery?: LegacyRvHouseBattery;
  dc_load?: LegacyRvEntity;
  ac_load?: LegacyRvEntity;
  inverter?: LegacyRvEntity;
  orion?: LegacyRvEntity;
}
interface FossilFuelPercentage extends BaseConfigEntity {
  entity: string;
  color?: string;
  state_type?: "percentage" | "power";
  color_icon?: boolean;
  display_zero?: boolean;
  display_zero_state?: boolean;
  display_zero_tolerance?: number;
  color_value?: boolean;
  color_label?: boolean;
  unit_white_space?: boolean;
  calculate_flow_rate?: boolean | number;
  secondary_info: SecondaryInfoType;
}

export type ConfigEntities = {
  battery?: Battery;
  grid?: Grid;
  solar?: Solar;
  home?: Home;
  fossil_fuel_percentage?: FossilFuelPercentage;
  individual?: IndividualField;
  individual1?: IndividualField;
  individual2?: IndividualField;
};

export type ConfigEntity =
  | Battery
  | Grid
  | Solar
  | Home
  | FossilFuelPercentage
  | IndividualDeviceType;
