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
  const { rv, grid, solar, battery } = params;

  // RV-003 Vorbereitung
  void rv;

  //
  // Wohnmobil: Keine Rückspeisung
  //
  grid.state.toGrid = 0;
  solar.state.toGrid = 0;
  battery.state.toGrid = 0;

  //
  // Solar lädt ausschließlich die Aufbaubatterie
  //
  solar.state.toBattery = Math.max(solar.state.total ?? 0, 0);

  // RV-120: Wohnmobil-Lasten
  const shorePower = Math.max(getEntityStateWatts(rv?.shore_power) ?? 0, 0);
  const acLoad = Math.max(getEntityStateWatts(rv?.ac_load) ?? 0, 0);
  const dcLoad = Math.max(getEntityStateWatts(rv?.dc_load) ?? 0, 0);
  const inverterPower = Math.max(getEntityStateWatts(rv?.inverter) ?? 0, 0);

  const batteryToDc = dcLoad;
  const batteryToInverter = inverterPower;

  battery.state.toHome = batteryToDc + batteryToInverter;
  grid.state.toHome = shorePower > 0 ? acLoad : 0;
  grid.state.toBattery = shorePower > 0
    ? Math.max(grid.state.fromGrid ?? 0, 0)
    : 0;

  solar.state.toHome = 0;

  //
  // Landstrom lädt die Aufbaubatterie
  //
  grid.state.toBattery = Math.max(grid.state.fromGrid ?? 0, 0);

  //
  // Verbraucher bleiben in Schritt 1 unverändert.
  // Die komplette Verteilungslogik folgt in Schritt 2.
  //
}