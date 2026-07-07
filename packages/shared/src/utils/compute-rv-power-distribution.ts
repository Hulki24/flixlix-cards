import type {
  ComputeEntityState,
  ComputeEntityStateWatts,
} from "./compute-power-distribution";

export function computeRvPowerDistribution(params: {
  rvMode?: boolean;
  rv?: any;
  entities: any;
  grid: any;
  solar: any;
  battery: any;
  nonFossil: any;
  getEntityStateWatts: ComputeEntityStateWatts;
  getEntityState: ComputeEntityState;
}): void {
  const { rv, grid, solar, battery, getEntityStateWatts } = params;

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

  //
  // RV-Verbraucher
  //
  const shorePower = Math.max(getEntityStateWatts(rv?.shore_power) ?? 0, 0);
  const acLoad = Math.max(getEntityStateWatts(rv?.ac_load) ?? 0, 0);
  const dcLoad = Math.max(getEntityStateWatts(rv?.dc_load) ?? 0, 0);
  const inverterPower = Math.max(getEntityStateWatts(rv?.inverter) ?? 0, 0);
  const boosterPower = Math.max(getEntityStateWatts(rv?.booster) ?? 0, 0);

  //
  // Wechselrichter wird als DC-Verbraucher behandelt
  //
  battery.state.toHome = dcLoad + inverterPower;

  //
  // AC-Verbraucher werden direkt aus Landstrom versorgt
  //
  grid.state.toHome = shorePower > 0 ? acLoad : 0;

  //
  // Landstrom lädt die Aufbaubatterie
  // (Booster wird später in der vollständigen RV-Logik berücksichtigt)
  //
  grid.state.toBattery = shorePower > 0
    ? Math.max(grid.state.fromGrid ?? 0, 0)
    : 0;

  //
  // Solar versorgt im RV-Modus niemals direkt den RV-Knoten
  //
  solar.state.toHome = 0;

  //
  // Booster wird in einem späteren Schritt
  // in die vollständige Ladeflusslogik integriert.
  //
  void boosterPower;
}