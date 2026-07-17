# RV implementation plan

## Target architecture

The functional RV implementation uses structured manufacturer-neutral configuration, normalized `RvRuntimeData`, a small central DC Bus node and dedicated RV flow components. Classic house calculation and flows are isolated from the RV composer.

```text
Configuration → RV runtime resolver → DC Bus render data → RV-only flows
                               ↘ Classic calculator and flows (house mode only)
```

## Ticket status

| Ticket | Scope                           | Status   | Implemented result                                                                                      |
| ------ | ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| 1      | Types and structured schema     | Done     | Optional neutral `rv.*` groups in shared types and active Superstruct schema                            |
| 2      | Structured runtime render data  | Done     | Safe Entity resolution, power-before-U×I and normalized Runtime data                                    |
| 3      | DC Bus layout node              | Done     | Small value-less DC Bus point rendered only in RV mode                                                  |
| 4      | Shore and Solar flows           | Done     | Dedicated source-to-bus SVG flows using Runtime output power                                            |
| 5      | Cabin Battery and RV flows      | Done     | Bidirectional measured battery flow and balanced DC Bus-to-RV flow                                      |
| 6      | Starter Battery and Booster     | Done     | Starter bubble, small Booster node and input/output flows                                               |
| 7      | Structured editor               | Done     | Neutral RV groups, Entity selectors, help text and Boolean mode switch                                  |
| 8      | Responsive layout and visual QA | **Open** | Not implemented; no Ticket-10 layout changes                                                            |
| 9      | Legacy compatibility            | Done     | Presence-based mode, structured-over-legacy fallback and no automatic migration                         |
| 10     | Cleanup and consolidation       | Done     | Obsolete battery-throughput calculator removed; Classic/RV flow composition isolated; docs consolidated |

## Functional invariants

- The DC Bus is the central visual distribution point.
- Visible flows are activated by positive measured power, never by charger status.
- Shore → DC Bus uses AC Charger output and additionally requires positive Shore input.
- Solar and Booster flows use their measured output power.
- Cabin Battery net power is positive while charging and negative while discharging.
- `loads.dc_power` overrides the internal DC balance when configured.
- Structured fields take priority over legacy RV fields and Classic entities.
- A numeric `0 W` is explicit and blocks all lower-priority fallbacks.
- Legacy YAML is read-only compatible; opening the editor performs no migration.
- No source is artificially assigned to an individual RV consumer.
- Conversion losses have no dedicated flow.

## Runtime ownership

| Decision                                                 | Owner                                                  |
| -------------------------------------------------------- | ------------------------------------------------------ |
| RV mode presence priority                                | `packages/shared/src/utils/resolve-rv-mode.ts`         |
| Entity validation, unavailable handling and U×I fallback | `packages/shared/src/states/rv/get-rv-runtime-data.ts` |
| Battery measured input/output                            | RV Runtime resolver                                    |
| Internal RV DC consumption                               | RV Runtime resolver                                    |
| RV versus Classic flow composition                       | `packages/shared/src/components/flows/index.ts`        |
| Flow-specific positive-power conditions                  | dedicated files under `components/flows/rv`            |
| Matching Starter Individual suppression                  | Power Flow Card render-data adapter                    |

The removed `compute-rv-power-distribution.ts` belonged to the earlier model that routed source values through Classic Battery states. It is not part of the final DC Bus architecture.

## Current configuration strategy

New YAML should use:

```yaml
rv_mode: true
rv:
  shore:
    input_power: sensor.shore_input_power
  ac_charger:
    state: sensor.ac_charger_state
    output_power: sensor.ac_charger_output_power
    output_voltage: sensor.ac_charger_output_voltage
    output_current: sensor.ac_charger_output_current
  solar_charger:
    state: sensor.solar_charger_state
    output_power: sensor.solar_charger_output_power
  booster:
    state: sensor.booster_state
    input_power: sensor.booster_input_power
    output_power: sensor.booster_output_power
  cabin_battery:
    net_power: sensor.cabin_battery_net_power
    voltage: sensor.cabin_battery_voltage
    state_of_charge: sensor.cabin_battery_soc
  starter_battery:
    voltage: sensor.starter_battery_voltage
  loads:
    dc_power: sensor.rv_dc_load_power
```

All entities are illustrative neutral names. `state` is diagnostic; it never activates a visible flow. Power entities take priority over voltage × current.

Legacy fields remain accepted as read fallbacks and are not copied into the structured groups automatically.

## Regression matrix

The package tests retain coverage for:

- Battery-only: Cabin Battery → DC Bus → RV.
- Solar surplus: Solar → DC Bus, DC Bus → Battery and DC Bus → RV.
- Shore active: positive Shore input and AC Charger output render Shore → DC Bus.
- Stale AC output: zero Shore input suppresses Shore flow.
- Booster: Starter → Booster uses input power; Booster → DC Bus uses output power; loss is hidden.
- Mixed sources: balanced RV consumption without direct Classic RV flows.
- Explicit `loads.dc_power`: measured load overrides the balance.
- Structured zero: no U×I or legacy fallback.
- House mode: Classic flow components remain active and RV components remain absent.
- Editor: structured config remains editable; legacy config opens without mutation.

## Ticket 8 – remaining work

Ticket 8 is the only open implementation ticket. It may adjust CSS and SVG geometry for narrow/wide cards, themes, long names and accessibility. It must preserve all functional invariants, configuration fields and Runtime values above.

Suggested acceptance widths are 320, 360, 420, 421, 500 and 700 px, with light/dark themes and long configured labels. This work requires visual screenshot QA and is intentionally outside ticket 10.

## Completion gate

Ticket 10 requires:

```text
pnpm --filter power-flow-card-plus lint
pnpm --filter power-flow-card-plus typecheck
pnpm --filter power-flow-card-plus test
pnpm --filter power-flow-card-plus build
```

No debug markers, direct `main_config.rv_mode` checks outside the resolver, status-activated RV flows or obsolete battery-throughput adapters may remain.
