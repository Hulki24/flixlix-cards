import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import {
  type PowerFlowCardPlusConfig,
  type RvConfig,
  type RvRuntimeData,
} from "@flixlix-cards/shared/types";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/i;
const INVALID_STATES = new Set(["unknown", "unavailable", "undefined"]);

interface ResolvedPowerMeasurement {
  value: number;
  lastUpdated: number | null;
}

export function isConfiguredEntity(entity: unknown): entity is string {
  if (typeof entity !== "string") return false;
  const ids = entity.split("|").map((id) => id.trim());
  return ids.length > 0 && ids.every((id) => ENTITY_ID_PATTERN.test(id));
}

function entityStateNumber(hass: HomeAssistant, entity: unknown): number | null {
  if (!isConfiguredEntity(entity)) return null;
  const ids = entity.split("|").map((id) => id.trim());
  if (
    ids.some((id) => {
      const state = hass.states[id]?.state;
      return (
        state === undefined ||
        INVALID_STATES.has(state.toLowerCase()) ||
        !Number.isFinite(Number(state))
      );
    })
  ) {
    return null;
  }
  return ids.reduce((total, id) => total + coerceNumber(hass.states[id]?.state), 0);
}

export function resolveEntityPower(hass: HomeAssistant, entity: unknown): number | null {
  if (entityStateNumber(hass, entity) === null || !isConfiguredEntity(entity)) return null;
  const value = getEntityStateWatts(hass, entity);
  return Number.isFinite(value) ? value : null;
}

function entityLastUpdated(hass: HomeAssistant, entity: unknown): number | null {
  if (!isConfiguredEntity(entity)) return null;
  const timestamps = entity
    .split("|")
    .map((id) => Date.parse(hass.states[id.trim()]?.last_updated ?? ""))
    .filter(Number.isFinite);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function resolveEntityPowerMeasurement(
  hass: HomeAssistant,
  entity: unknown
): ResolvedPowerMeasurement | null {
  const value = resolveEntityPower(hass, entity);
  return value === null ? null : { value, lastUpdated: entityLastUpdated(hass, entity) };
}

export function resolveVoltageCurrentPower(
  hass: HomeAssistant,
  voltageEntity: unknown,
  currentEntity: unknown
): number | null {
  const voltage = entityStateNumber(hass, voltageEntity);
  const current = entityStateNumber(hass, currentEntity);
  if (voltage === null || current === null) return null;
  const value = voltage * current;
  return Number.isFinite(value) ? value : null;
}

function resolveVoltageCurrentPowerMeasurement(
  hass: HomeAssistant,
  voltageEntity: unknown,
  currentEntity: unknown
): ResolvedPowerMeasurement | null {
  const value = resolveVoltageCurrentPower(hass, voltageEntity, currentEntity);
  if (value === null) return null;
  const timestamps = [
    entityLastUpdated(hass, voltageEntity),
    entityLastUpdated(hass, currentEntity),
  ].filter((timestamp): timestamp is number => timestamp !== null);
  return { value, lastUpdated: timestamps.length > 0 ? Math.max(...timestamps) : null };
}

export function resolveOptionalState(hass: HomeAssistant, entity: unknown): string | null {
  if (!isConfiguredEntity(entity)) return null;
  const state = hass.states[entity]?.state;
  if (state === undefined || INVALID_STATES.has(state.toLowerCase())) return null;
  return state;
}

export function resolveOptionalNumber(hass: HomeAssistant, entity: unknown): number | null {
  return entityStateNumber(hass, entity);
}

function firstConfiguredEntity(...entities: unknown[]): string | undefined {
  return entities.find(isConfiguredEntity) as string | undefined;
}

function classicEntity(
  entity: unknown,
  direction: "consumption" | "production" | "any" = "any"
): string | undefined {
  if (isConfiguredEntity(entity)) return entity;
  if (!entity || typeof entity !== "object") return undefined;
  const combo = entity as { consumption?: unknown; production?: unknown };
  if (direction === "consumption") return firstConfiguredEntity(combo.consumption);
  if (direction === "production") return firstConfiguredEntity(combo.production);
  return firstConfiguredEntity(combo.consumption, combo.production);
}

function resolveFirstAvailablePower(hass: HomeAssistant, ...entities: unknown[]): number | null {
  for (const entity of entities) {
    const value = resolveEntityPower(hass, entity);
    if (value !== null) return value;
  }
  return null;
}

function resolveFirstAvailablePowerMeasurement(
  hass: HomeAssistant,
  ...entities: unknown[]
): ResolvedPowerMeasurement | null {
  for (const entity of entities) {
    const measurement = resolveEntityPowerMeasurement(hass, entity);
    if (measurement !== null) return measurement;
  }
  return null;
}

function resolveFirstAvailableNumber(hass: HomeAssistant, ...entities: unknown[]): number | null {
  for (const entity of entities) {
    const value = resolveOptionalNumber(hass, entity);
    if (value !== null) return value;
  }
  return null;
}

function resolveStructuredPowerWithFallback(
  hass: HomeAssistant,
  powerEntity: unknown,
  voltageEntity: unknown,
  currentEntity: unknown,
  ...legacyEntities: unknown[]
): number {
  return resolveStructuredPowerMeasurementWithFallback(
    hass,
    powerEntity,
    voltageEntity,
    currentEntity,
    ...legacyEntities
  ).value;
}

function resolveStructuredPowerMeasurementWithFallback(
  hass: HomeAssistant,
  powerEntity: unknown,
  voltageEntity: unknown,
  currentEntity: unknown,
  ...legacyEntities: unknown[]
): ResolvedPowerMeasurement {
  return (
    resolveEntityPowerMeasurement(hass, powerEntity) ??
    resolveVoltageCurrentPowerMeasurement(hass, voltageEntity, currentEntity) ??
    resolveFirstAvailablePowerMeasurement(hass, ...legacyEntities) ?? {
      value: 0,
      lastUpdated: null,
    }
  );
}

function hasAnyConfiguredEntity(...entities: unknown[]): boolean {
  return entities.some(isConfiguredEntity);
}

export function normalizeRvBatteryFlows(measuredIn: number, measuredOut: number) {
  const safeIn = Number.isFinite(measuredIn) ? Math.max(measuredIn, 0) : 0;
  const safeOut = Number.isFinite(measuredOut) ? Math.max(measuredOut, 0) : 0;
  const netPower = safeIn - safeOut;

  return {
    measuredIn: Math.max(netPower, 0),
    measuredOut: Math.max(-netPower, 0),
  };
}

export function getRvRuntimeData(
  hass: HomeAssistant,
  config: PowerFlowCardPlusConfig,
  rvMode: boolean
): RvRuntimeData {
  const rv: RvConfig | undefined = config.rv;
  const classic = config.entities;

  const shoreEntities = [
    rv?.shore?.input_power,
    rv?.shore_power?.entity,
    classicEntity(classic.grid?.entity, "consumption"),
  ];
  const shoreEntity = firstConfiguredEntity(...shoreEntities);
  const legacyChargeEntities = [
    rv?.house_battery?.charge,
    classicEntity(classic.battery?.entity, "production"),
  ];
  const legacyAcChargerOutputEntities = [
    rv?.house_battery?.charge,
    ...(isConfiguredEntity(rv?.cabin_battery?.net_power)
      ? []
      : [classicEntity(classic.battery?.entity, "production")]),
  ];
  const legacyDischargeEntities = [
    rv?.house_battery?.discharge,
    classicEntity(classic.battery?.entity, "consumption"),
  ];
  const legacyChargeEntity = firstConfiguredEntity(...legacyChargeEntities);
  const legacyAcChargerOutputEntity = firstConfiguredEntity(...legacyAcChargerOutputEntities);
  const legacyDischargeEntity = firstConfiguredEntity(...legacyDischargeEntities);
  const legacySolarEntities = [rv?.solar?.entity, classicEntity(classic.solar?.entity)];
  const legacyBoosterEntities = [rv?.orion?.entity];
  const cabinNetEntity = firstConfiguredEntity(rv?.cabin_battery?.net_power);
  const cabinStateOfChargeEntities = [
    rv?.cabin_battery?.state_of_charge,
    rv?.house_battery?.soc,
    classic.battery?.state_of_charge,
  ];
  const cabinStateOfChargeEntity = firstConfiguredEntity(...cabinStateOfChargeEntities);
  const legacyTotalLoadEntities = [rv?.dc_load?.entity, classicEntity(classic.home?.entity)];
  const legacyAcLoadEntities = [rv?.ac_load?.entity];
  const legacyDcLoadEntities = [rv?.dc_load?.entity];

  const legacyChargeMeasurement = resolveFirstAvailablePowerMeasurement(
    hass,
    ...legacyChargeEntities
  );
  const legacyDischargeMeasurement = resolveFirstAvailablePowerMeasurement(
    hass,
    ...legacyDischargeEntities
  );
  const legacyCharge = legacyChargeMeasurement?.value ?? 0;
  const legacyDischarge = legacyDischargeMeasurement?.value ?? 0;
  const cabinNetMeasurement = resolveEntityPowerMeasurement(hass, cabinNetEntity);
  const netPower = cabinNetMeasurement?.value ?? legacyCharge - legacyDischarge;
  const legacyBatteryTimestamps = [
    legacyChargeMeasurement?.lastUpdated,
    legacyDischargeMeasurement?.lastUpdated,
  ].filter((timestamp): timestamp is number => timestamp !== null && timestamp !== undefined);
  const netPowerLastUpdated =
    cabinNetMeasurement?.lastUpdated ??
    (legacyBatteryTimestamps.length > 0 ? Math.max(...legacyBatteryTimestamps) : null);

  const ac = rv?.ac_charger;
  const solar = rv?.solar_charger;
  const booster = rv?.booster;
  const acChargerOutputMeasurement = resolveStructuredPowerMeasurementWithFallback(
    hass,
    ac?.output_power,
    ac?.output_voltage,
    ac?.output_current,
    ...legacyAcChargerOutputEntities
  );
  const acChargerOutput = acChargerOutputMeasurement.value;
  const solarChargerOutputMeasurement = resolveStructuredPowerMeasurementWithFallback(
    hass,
    solar?.output_power,
    solar?.output_voltage,
    solar?.output_current,
    ...legacySolarEntities
  );
  const solarChargerOutput = solarChargerOutputMeasurement.value;
  const boosterOutputMeasurement = resolveStructuredPowerMeasurementWithFallback(
    hass,
    booster?.output_power,
    booster?.output_voltage,
    booster?.output_current,
    ...legacyBoosterEntities
  );
  const boosterOutput = boosterOutputMeasurement.value;
  const batteryFlows = normalizeRvBatteryFlows(Math.max(netPower, 0), Math.max(-netPower, 0));
  const totalPower =
    resolveFirstAvailablePower(hass, rv?.loads?.total_power, ...legacyTotalLoadEntities) ?? 0;
  const structuredAcLoadEntity = firstConfiguredEntity(rv?.loads?.ac_power);
  const acEntity = structuredAcLoadEntity ?? firstConfiguredEntity(...legacyAcLoadEntities);
  const resolvedAcPower = resolveEntityPower(hass, acEntity);
  const acPowerConfigured = acEntity !== undefined;
  const acPowerAvailable = resolvedAcPower !== null;
  const acPower = Math.max(resolvedAcPower ?? 0, 0);
  const dcPowerCandidates = [rv?.loads?.dc_power, ...legacyDcLoadEntities];
  const resolvedDcPower = resolveFirstAvailablePower(hass, ...dcPowerCandidates);
  const dcPowerConfigured = resolvedDcPower !== null;
  const dcPower = resolvedDcPower ?? 0;
  const rvDcConsumption = dcPowerConfigured
    ? Math.max(dcPower, 0)
    : Math.max(
        acChargerOutput +
          solarChargerOutput +
          boosterOutput +
          batteryFlows.measuredOut -
          batteryFlows.measuredIn,
        0
      );

  return {
    rvMode,
    rvDcConsumption,
    shore: {
      has: isConfiguredEntity(shoreEntity),
      inputPower: resolveFirstAvailablePower(hass, ...shoreEntities) ?? 0,
      entity: shoreEntity,
    },
    acCharger: {
      has: hasAnyConfiguredEntity(
        ac?.state,
        ac?.input_power,
        ac?.input_voltage,
        ac?.input_current,
        ac?.output_power,
        ac?.output_voltage,
        ac?.output_current,
        legacyAcChargerOutputEntity
      ),
      state: resolveOptionalState(hass, ac?.state),
      inputPower: resolveStructuredPowerWithFallback(
        hass,
        ac?.input_power,
        ac?.input_voltage,
        ac?.input_current
      ),
      outputPower: acChargerOutput,
      inputVoltage: resolveOptionalNumber(hass, ac?.input_voltage),
      inputCurrent: resolveOptionalNumber(hass, ac?.input_current),
      outputVoltage: resolveOptionalNumber(hass, ac?.output_voltage),
      outputCurrent: resolveOptionalNumber(hass, ac?.output_current),
      outputLastUpdated: acChargerOutputMeasurement.lastUpdated,
    },
    solarCharger: {
      has: hasAnyConfiguredEntity(
        solar?.state,
        solar?.output_power,
        ...legacySolarEntities,
        solar?.output_voltage,
        solar?.output_current
      ),
      state: resolveOptionalState(hass, solar?.state),
      outputPower: solarChargerOutput,
      outputVoltage: resolveOptionalNumber(hass, solar?.output_voltage),
      outputCurrent: resolveOptionalNumber(hass, solar?.output_current),
      outputLastUpdated: solarChargerOutputMeasurement.lastUpdated,
    },
    booster: {
      has: hasAnyConfiguredEntity(
        booster?.state,
        booster?.input_power,
        booster?.input_voltage,
        booster?.input_current,
        booster?.output_power,
        ...legacyBoosterEntities,
        booster?.output_voltage,
        booster?.output_current
      ),
      state: resolveOptionalState(hass, booster?.state),
      inputPower: resolveStructuredPowerWithFallback(
        hass,
        booster?.input_power,
        booster?.input_voltage,
        booster?.input_current
      ),
      outputPower: boosterOutput,
      inputVoltage: resolveOptionalNumber(hass, booster?.input_voltage),
      inputCurrent: resolveOptionalNumber(hass, booster?.input_current),
      outputVoltage: resolveOptionalNumber(hass, booster?.output_voltage),
      outputCurrent: resolveOptionalNumber(hass, booster?.output_current),
      outputLastUpdated: boosterOutputMeasurement.lastUpdated,
    },
    cabinBattery: {
      has: hasAnyConfiguredEntity(
        cabinNetEntity,
        rv?.cabin_battery?.voltage,
        rv?.cabin_battery?.state_of_charge,
        rv?.cabin_battery?.charging_state,
        legacyChargeEntity,
        legacyDischargeEntity,
        cabinStateOfChargeEntity
      ),
      netPower,
      measuredIn: batteryFlows.measuredIn,
      measuredOut: batteryFlows.measuredOut,
      voltage: resolveOptionalNumber(hass, rv?.cabin_battery?.voltage),
      stateOfCharge: resolveFirstAvailableNumber(hass, ...cabinStateOfChargeEntities),
      chargingState: resolveOptionalState(hass, rv?.cabin_battery?.charging_state),
      netPowerLastUpdated,
    },
    starterBattery: {
      has: hasAnyConfiguredEntity(
        rv?.starter_battery?.voltage,
        rv?.starter_battery?.power,
        rv?.starter_battery?.current
      ),
      voltage: resolveOptionalNumber(hass, rv?.starter_battery?.voltage),
      power: resolveEntityPower(hass, rv?.starter_battery?.power) ?? 0,
    },
    loads: {
      totalPower,
      acPower,
      acPowerConfigured,
      acPowerAvailable,
      acEntity,
      dcPower,
      dcPowerConfigured,
    },
  };
}
