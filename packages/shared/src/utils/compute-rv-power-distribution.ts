export type RvPowerMeasurements = {
  acChargerOutput: number | null;
  solarChargerOutput: number | null;
  boosterOutput: number | null;
  cabinBatteryNetPower: number | null;
};

export type RvTopologicalPower = {
  acChargerOutput: number;
  solarChargerOutput: number;
  boosterOutput: number;
  batteryMeasuredIn: number;
  batteryMeasuredOut: number;
  batteryDisplayIn: number;
  batteryDisplayOut: number;
};

const nonNegative = (value: number | null | undefined): number =>
  Number.isFinite(value) ? Math.max(value ?? 0, 0) : 0;

export function deriveRvTopologicalPower(
  measurements: RvPowerMeasurements
): RvTopologicalPower {
  const acChargerOutput = nonNegative(measurements.acChargerOutput);
  const solarChargerOutput = nonNegative(measurements.solarChargerOutput);
  const boosterOutput = nonNegative(measurements.boosterOutput);
  const cabinBatteryNetPower = Number.isFinite(measurements.cabinBatteryNetPower)
    ? (measurements.cabinBatteryNetPower ?? 0)
    : 0;
  const batteryMeasuredIn = Math.max(cabinBatteryNetPower, 0);
  const batteryMeasuredOut = Math.max(-cabinBatteryNetPower, 0);
  const batteryDisplayIn = acChargerOutput + solarChargerOutput + boosterOutput;
  const batteryDisplayOut = Math.max(
    batteryDisplayIn + batteryMeasuredOut - batteryMeasuredIn,
    0
  );

  return {
    acChargerOutput,
    solarChargerOutput,
    boosterOutput,
    batteryMeasuredIn,
    batteryMeasuredOut,
    batteryDisplayIn,
    batteryDisplayOut,
  };
}

export function computeRvPowerDistribution(params: {
  entities: any;
  grid: any;
  solar: any;
  battery: any;
  nonFossil: any;
  rvPower?: RvPowerMeasurements;
}): void {
  const { grid, solar, battery } = params;
  const power = deriveRvTopologicalPower(
    params.rvPower ?? {
      acChargerOutput: grid.state.fromGrid,
      solarChargerOutput: solar.state.total,
      boosterOutput: 0,
      cabinBatteryNetPower:
        (battery.state.toBattery ?? 0) - (battery.state.fromBattery ?? 0),
    }
  );

  // RV systems never feed power back to shore/grid.
  grid.state.toGrid = 0;
  solar.state.toGrid = 0;
  battery.state.toGrid = 0;

  // Charger outputs are displayed topologically through the cabin battery.
  grid.state.toBattery = power.acChargerOutput;
  solar.state.total = power.solarChargerOutput;
  solar.state.toBattery = power.solarChargerOutput;
  grid.state.toHome = 0;
  solar.state.toHome = 0;

  // The bubble intentionally shows simultaneous aggregate input and inferred RV output.
  battery.state.toBattery = power.batteryDisplayIn;
  battery.state.fromBattery = power.batteryDisplayOut;
  battery.state.toHome = power.batteryDisplayOut;
}
