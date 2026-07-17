# RV visual flow model

Status: current functional model after ticket 10. Responsive and visual refinement is deferred to ticket 8.

## Current nodes

The RV view uses five principal nodes plus two small infrastructure nodes:

- Shore Power
- Solar
- Cabin Battery
- Starter Battery
- RV
- small DC Bus distribution point (no value and no bubble)
- small Booster node between Starter Battery and DC Bus

The current placement and SVG geometry are intentionally unchanged by ticket 10.

## Current flow graph

```text
Shore Power / AC Charger ───────┐
Solar Charger ──────────────────┼──► DC Bus ───► RV
Starter Battery ─► Booster ─────┘       │
                                       ⇅
                                Cabin Battery
```

The DC Bus communicates parallel sources and sinks without assigning a source-specific share to the RV load.

## Render values and conditions

| Flow                        | Value                             | Render condition                                              |
| --------------------------- | --------------------------------- | ------------------------------------------------------------- |
| Shore / AC Charger → DC Bus | `rvData.acCharger.outputPower`    | RV mode, configured charger, output > 0 and Shore input > 0   |
| Solar Charger → DC Bus      | `rvData.solarCharger.outputPower` | RV mode, configured charger and output > 0                    |
| Starter Battery → Booster   | `rvData.booster.inputPower`       | RV mode, configured Starter/Booster, input > 0 and output > 0 |
| Booster → DC Bus            | `rvData.booster.outputPower`      | RV mode, configured Booster and output > 0                    |
| DC Bus → Cabin Battery      | `rvData.cabinBattery.measuredIn`  | RV mode, configured battery and value > 0                     |
| Cabin Battery → DC Bus      | `rvData.cabinBattery.measuredOut` | RV mode, configured battery and value > 0                     |
| DC Bus → RV                 | `rvData.rvDcConsumption`          | RV mode and value > 0                                         |

No RV flow uses device status as an activation signal. Status remains available for diagnostic and More-Info use. No zero-value RV SVG is rendered, regardless of the Classic `display_zero_lines` setting.

## Bubble values

- Shore bubble: Shore AC input power.
- Solar bubble: Solar Charger DC output power.
- Cabin Battery bubble: measured charge input and discharge output derived from signed net power; SoC remains informational.
- Starter Battery bubble: voltage as primary value, optional measured power as secondary value.
- RV bubble: measured `loads.dc_power` when configured, otherwise the internal DC bus balance.

AC Charger conversion loss (`shore.inputPower - acCharger.outputPower`) is not a flow. Booster conversion loss (`inputPower - outputPower`) is also not rendered.

## Mode separation

`resolveRvMode()` is the single mode resolver. Presence-based priority is:

1. an explicitly present top-level `rv_mode` Boolean;
2. otherwise legacy `main_config.rv_mode`;
3. otherwise house mode.

The RV flow composer returns only DC Bus flows. Classic Grid/Home, Solar/Home, Solar/Battery and Battery/Home flows are composed only in house mode. The house calculator and components remain unchanged.

## Compatibility

Structured RV fields always win over legacy RV and Classic fallbacks. An explicit `0 W` is retained and suppresses fallback. Opening legacy YAML does not migrate or mutate it.

When structured Starter Battery configuration and a matching legacy Individual coexist, only the structured Starter Battery is rendered. An Individual-only configuration keeps its existing behavior.

## Open ticket 8 work

Ticket 8 is still open and was not implemented by ticket 10. It covers only visual and responsive refinement, including breakpoint-specific geometry, overlap prevention, long labels, theme QA and screenshot coverage. It must not change the energy balance or runtime fallback rules documented here.
