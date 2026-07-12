import type {
  ComputeEntityState,
  ComputeEntityStateWatts,
} from "./compute-power-distribution";

export function computeRvPowerDistribution(params: {
  entities: any;
  grid: any;
  solar: any;
  battery: any;
  nonFossil: any;
  getEntityStateWatts: ComputeEntityStateWatts;
  getEntityState: ComputeEntityState;
}): void {
  const { grid, solar, battery } = params;

  const shoreTotal = Math.max(grid.state.fromGrid ?? 0, 0);
  const solarPower = Math.max(solar.state.total ?? 0, 0);
  const shoreToBattery = Math.max(battery.state.toBattery ?? 0, 0);
  const houseBatteryDischarge = Math.max(battery.state.fromBattery ?? 0, 0);

  const solarToHouseBattery = solarPower;
  const acConsumption = Math.max(shoreTotal - shoreToBattery, 0);

  // RV systems never feed power back to shore/grid.
  grid.state.toGrid = 0;
  solar.state.toGrid = 0;
  battery.state.toGrid = 0;

  // Solar charges only the house battery.
  solar.state.toBattery = solarToHouseBattery;
  solar.state.toHome = 0;

  // Derive AC consumption from shore power because RV mode has no separate AC load sensor.
  grid.state.toBattery = Math.min(shoreToBattery, shoreTotal);
  grid.state.toHome = acConsumption;

  // DC loads always come from the house battery. Without shore, AC loads do too via inverter.
  battery.state.toHome = houseBatteryDischarge;
}
