import { type RvRuntimeData } from "@flixlix-cards/shared/types";

export const RV_SOURCE_CHANGE_THRESHOLD_WATTS = 5;
export const RV_SOURCE_TRANSITION_HOLD_MS = 15_000;

interface SourceSnapshot {
  value: number;
  lastUpdated: number | null;
}

export interface RvLoadStabilizationState {
  lastStableValue: number;
  sources: [SourceSnapshot, SourceSnapshot, SourceSnapshot];
  waitingForBatteryAfter: number | null;
  holdUntil: number | null;
}

export interface RvLoadStabilizationResult {
  value: number;
  state: RvLoadStabilizationState;
}

function sourceSnapshots(rvData: RvRuntimeData): RvLoadStabilizationState["sources"] {
  return [
    {
      value: rvData.acCharger.outputPower,
      lastUpdated: rvData.acCharger.outputLastUpdated,
    },
    {
      value: rvData.solarCharger.outputPower,
      lastUpdated: rvData.solarCharger.outputLastUpdated,
    },
    {
      value: rvData.booster.outputPower,
      lastUpdated: rvData.booster.outputLastUpdated,
    },
  ];
}

export function stabilizeRvDcConsumption({
  rvData,
  previous,
  enabled,
  now = Date.now(),
}: {
  rvData: RvRuntimeData;
  previous?: RvLoadStabilizationState;
  enabled: boolean;
  now?: number;
}): RvLoadStabilizationResult {
  const sources = sourceSnapshots(rvData);
  if (!enabled || !previous) {
    return {
      value: rvData.rvDcConsumption,
      state: {
        lastStableValue: rvData.rvDcConsumption,
        sources,
        waitingForBatteryAfter: null,
        holdUntil: null,
      },
    };
  }

  const changedSourceTimestamps = sources.flatMap((source, index) => {
    const oldSource = previous.sources[index]!;
    const changedEnough =
      Math.abs(source.value - oldSource.value) >= RV_SOURCE_CHANGE_THRESHOLD_WATTS;
    const hasNewTimestamp =
      source.lastUpdated !== null && source.lastUpdated !== oldSource.lastUpdated;
    return changedEnough && hasNewTimestamp ? [source.lastUpdated as number] : [];
  });
  const newestChangedSourceTimestamp =
    changedSourceTimestamps.length > 0 ? Math.max(...changedSourceTimestamps) : null;
  const batteryLastUpdated = rvData.cabinBattery.netPowerLastUpdated;
  let waitingForBatteryAfter = previous.waitingForBatteryAfter;
  let holdUntil = previous.holdUntil;

  if (
    newestChangedSourceTimestamp !== null &&
    (batteryLastUpdated === null || batteryLastUpdated <= newestChangedSourceTimestamp)
  ) {
    waitingForBatteryAfter = newestChangedSourceTimestamp;
    holdUntil = now + RV_SOURCE_TRANSITION_HOLD_MS;
  }

  const batteryCaughtUp =
    waitingForBatteryAfter !== null &&
    batteryLastUpdated !== null &&
    batteryLastUpdated > waitingForBatteryAfter;
  const holdExpired = holdUntil !== null && now >= holdUntil;
  const holding = waitingForBatteryAfter !== null && !batteryCaughtUp && !holdExpired;
  const value = holding ? previous.lastStableValue : rvData.rvDcConsumption;

  return {
    value,
    state: {
      lastStableValue: value,
      sources,
      waitingForBatteryAfter: holding ? waitingForBatteryAfter : null,
      holdUntil: holding ? holdUntil : null,
    },
  };
}
