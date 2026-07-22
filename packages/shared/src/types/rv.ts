export interface RvShoreRuntimeData {
  has: boolean;
  inputPower: number;
  entity?: string;
}

export interface RvChargerRuntimeData {
  has: boolean;
  state: string | null;
  inputPower: number;
  outputPower: number;
  inputVoltage: number | null;
  inputCurrent: number | null;
  outputVoltage: number | null;
  outputCurrent: number | null;
  outputLastUpdated: number | null;
}

export interface RvSolarChargerRuntimeData {
  has: boolean;
  state: string | null;
  outputPower: number;
  outputVoltage: number | null;
  outputCurrent: number | null;
  outputLastUpdated: number | null;
}

export interface RvCabinBatteryRuntimeData {
  has: boolean;
  netPower: number;
  measuredIn: number;
  measuredOut: number;
  voltage: number | null;
  stateOfCharge: number | null;
  chargingState: string | null;
  netPowerLastUpdated: number | null;
}

export interface RvStarterBatteryRuntimeData {
  has: boolean;
  voltage: number | null;
  power: number;
}

export interface RvLoadsRuntimeData {
  totalPower: number;
  acPower: number;
  dcPower: number;
  dcPowerConfigured: boolean;
}

export interface RvDcBusRenderData {
  has: boolean;
  active: boolean;
  className: string;
}

/** Normalized RV measurements exposed to the render layer. */
export interface RvRuntimeData {
  rvMode: boolean;
  rvDcConsumption: number;
  shore: RvShoreRuntimeData;
  acCharger: RvChargerRuntimeData;
  solarCharger: RvSolarChargerRuntimeData;
  booster: RvChargerRuntimeData;
  cabinBattery: RvCabinBatteryRuntimeData;
  starterBattery: RvStarterBatteryRuntimeData;
  loads: RvLoadsRuntimeData;
}
