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
  const rvConsumption = Math.max(battery.state.toHome ?? 0, 0);

  // RV systems never feed power back to shore/grid.
  grid.state.toGrid = 0;
  solar.state.toGrid = 0;
  battery.state.toGrid = 0;

  // Shore and solar charge only the cabin battery.
  grid.state.toBattery = shoreTotal;
  solar.state.toBattery = solarPower;
  grid.state.toHome = 0;
  solar.state.toHome = 0;

  // The cabin battery supplies the complete measured RV consumption.
  battery.state.toHome = rvConsumption;
}
