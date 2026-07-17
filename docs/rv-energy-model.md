# RV energy model

Status: functional implementation after tickets 1–7, 9 and 10. Ticket 8 (responsive and visual refinement) remains open.

## Physical topology

The RV is modelled around a common DC bus. Sources and storage are parallel participants; the Cabin Battery is not assumed to be a mandatory pass-through path.

```text
Shore AC ─► AC Charger ─┐
Solar ────► Solar Charger├──► DC Bus ───► RV DC Loads
Starter Battery ─► Booster┘       │
                                  └──────► Cabin Battery (charging)
                                  ▲
                                  └─────── Cabin Battery (discharging)
```

Conversion losses are not rendered as energy flows. A future direct Shore-to-RV line is valid only for a separately measured AC load; it must never be inferred from Shore input minus AC Charger output.

## Measurements

| Participant     | Structured field                               | Physical meaning                                                      |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Shore           | `rv.shore.input_power`                         | AC input power drawn from shore                                       |
| AC Charger      | `input_*`, `output_*`, `state`                 | AC-side input and DC-side charger output; state is diagnostic only    |
| Solar Charger   | `output_*`, `state`                            | DC output delivered to the bus; state is diagnostic only              |
| Booster         | `input_*`, `output_*`, `state`                 | Starter-side input and DC-bus output; state is diagnostic only        |
| Cabin Battery   | `net_power`                                    | Signed net power: positive charges, negative discharges               |
| Cabin Battery   | `voltage`, `state_of_charge`, `charging_state` | Informational battery measurements                                    |
| Starter Battery | `voltage`, `power`                             | Starter battery display measurements                                  |
| RV Loads        | `total_power`, `ac_power`, `dc_power`          | Optional measured loads; `dc_power` overrides the internal DC balance |

All fields are optional. A configured numeric `0` is a valid measurement, not a missing value.

## Runtime resolution

For each measurement the resolver uses this order:

1. structured `rv.*` power entity;
2. voltage × current from the same structured group when no reliable power value is available;
3. matching legacy RV field;
4. matching Classic entity.

`unknown`, `unavailable`, missing and non-numeric states are unavailable and may fall through. An explicit `0 W` stops resolution and therefore never activates voltage × current or a legacy fallback. Sources are not added across fallback levels.

Legacy fields remain read-compatible:

- `main_config.rv_mode`
- `rv.shore_power`
- `rv.solar`
- `rv.house_battery`
- `rv.dc_load`
- `rv.ac_load`
- `rv.orion`
- the existing deprecated `rv.inverter` and `starter_battery.current` schema fields

No automatic migration changes stored YAML. Structured values take precedence when old and new fields coexist.

## Normalized battery and load values

For signed Cabin Battery net power `batteryNet`:

```text
measuredIn  = max(batteryNet, 0)
measuredOut = max(-batteryNet, 0)
```

Only one direction can be positive after normalization.

When `rv.loads.dc_power` is configured, its non-negative value is the visible RV DC load. Otherwise:

```text
sourceTotal = acCharger.outputPower
            + solarCharger.outputPower
            + booster.outputPower

rvDcConsumption = max(
  sourceTotal + cabinBattery.measuredOut - cabinBattery.measuredIn,
  0
)
```

This is a bus balance, not a source allocation. It does not claim which source powers a particular RV load.

## Visible flow activation

- Shore / AC Charger → DC Bus: AC Charger output must be positive and Shore input must also be positive.
- Solar Charger → DC Bus: positive Solar Charger output.
- Starter Battery → Booster: positive Booster input and positive Booster output.
- Booster → DC Bus: positive Booster output.
- DC Bus → Cabin Battery: positive `measuredIn`.
- Cabin Battery → DC Bus: positive `measuredOut`.
- DC Bus → RV: positive `rvDcConsumption`.

Device status never activates a visible flow. Configured nodes may remain visible at `0 W`, but RV zero-lines are omitted.

## Typical operating modes

### Solar only

```text
Solar Charger ─► DC Bus ─┬─► RV Loads
                         └─► Cabin Battery
```

### Shore active

```text
Shore ─► AC Charger ─► DC Bus ─┬─► RV Loads
                               └─► Cabin Battery
```

### Booster active

```text
Starter Battery ─► Booster ─► DC Bus ─┬─► RV Loads
                                      └─► Cabin Battery
```

### Mixed sources

```text
AC Charger ───┐
Solar Charger ├─► DC Bus ─┬─► RV Loads
Booster ──────┘           └─► Cabin Battery
```

### Battery only

```text
Cabin Battery ─► DC Bus ─► RV Loads
```

The model deliberately supports parallel sources. The Cabin Battery may charge, discharge or remain net zero while the DC Bus supplies the RV.
