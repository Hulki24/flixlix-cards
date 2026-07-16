// test that the card renders correctly

import { beforeEach, describe, expect, test, vi } from "vitest";

const { unavailableOrMisconfiguredErrorMock } = vi.hoisted(() => ({
  unavailableOrMisconfiguredErrorMock: vi.fn(),
}));

vi.mock("@flixlix-cards/shared/utils/unavailable-error", () => ({
  unavailableOrMisconfiguredError: unavailableOrMisconfiguredErrorMock,
}));

import { flowElement } from "@flixlix-cards/shared/components/flows/index";
import {
  isConfiguredEntity,
  normalizeRvBatteryFlows,
  resolveEntityPower,
  resolveOptionalState,
  resolveVoltageCurrentPower,
} from "@flixlix-cards/shared/states/rv/get-rv-runtime-data";
import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { render as renderTemplate } from "lit";
import { PowerFlowCardPlus } from "../src/power-flow-card-plus";

// jsdom does not provide ResizeObserver; stub it so the card's `updated` hook doesn't throw
(globalThis as any).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

type HassState = { state: string; attributes: Record<string, unknown> };

function makeHass(states: Record<string, string> = {}) {
  const hassStates: Record<string, HassState> = {};
  for (const [entityId, state] of Object.entries(states)) {
    hassStates[entityId] = {
      state,
      attributes: { friendly_name: entityId, unit_of_measurement: "W" },
    };
  }
  return {
    localize: (key: string) => key,
    locale: { language: "en", number_format: "comma_decimal" },
    states: hassStates,
    config: {},
    user: { name: "test" },
    connection: {},
  } as any;
}

function makeCard(config: PowerFlowCardPlusConfig, hass: ReturnType<typeof makeHass>) {
  const card = new PowerFlowCardPlus();
  card.setConfig(config);
  card.hass = hass;
  card.connectedCallback();
  return card as unknown as {
    render: () => unknown;
    _width: number;
    _computeRenderData: () => ReturnType<typeof computeRenderDataShape>;
  };
}

function renderCard(
  config: PowerFlowCardPlusConfig,
  hass: ReturnType<typeof makeHass>,
  width?: number
) {
  const card = makeCard(config, hass);
  if (width !== undefined) card._width = width;
  const container = document.createElement("div");
  renderTemplate(card.render() as any, container);
  return { card, container };
}

function renderRvFlowScenario({
  acOutput = 0,
  solarOutput = 0,
  batteryNet = 0,
  dcPower,
}: {
  acOutput?: number;
  solarOutput?: number;
  batteryNet?: number;
  dcPower?: number;
}) {
  const config = {
    type: "custom:power-flow-card-plus",
    rv_mode: true,
    display_zero_lines: { mode: "show" },
    entities: {
      grid: { entity: "sensor.shore" },
      solar: { entity: "sensor.classic_solar" },
      battery: { entity: "sensor.legacy_battery" },
      home: { name: "RV" },
    },
    rv: {
      shore: { input_power: "sensor.shore" },
      ac_charger: { output_power: "sensor.ac_output" },
      solar_charger: { output_power: "sensor.solar_output" },
      cabin_battery: { net_power: "sensor.battery_net" },
      ...(dcPower === undefined ? {} : { loads: { dc_power: "sensor.dc_load" } }),
    },
  } as PowerFlowCardPlusConfig;
  const hass = makeHass({
    "sensor.shore": String(Math.max(acOutput, 0)),
    "sensor.classic_solar": String(Math.max(solarOutput, 0)),
    "sensor.legacy_battery": "0",
    "sensor.ac_output": String(acOutput),
    "sensor.solar_output": String(solarOutput),
    "sensor.battery_net": String(batteryNet),
    ...(dcPower === undefined ? {} : { "sensor.dc_load": String(dcPower) }),
  });

  const rendered = renderCard(config, hass, 500);
  return { ...rendered, data: rendered.card._computeRenderData() };
}

// Used only as a type reference — actual return shape is inferred from _computeRenderData
declare function computeRenderDataShape(): {
  grid: {
    has: boolean;
    name: string;
    state: {
      fromGrid: number | null;
      toGrid: number | null;
      toBattery: number | null;
      toHome: number | null;
    };
  };
  solar: {
    has: boolean;
    name: string;
    state: {
      total: number | null;
      toHome: number | null;
      toGrid: number | null;
      toBattery: number | null;
    };
  };
  battery: {
    has: boolean | string;
    name: string;
    state: {
      fromBattery: number | null;
      toBattery: number | null;
      toGrid: number | null;
      toHome: number | null;
    };
  };
  home: { name: string };
  rvMode: boolean;
  dcBus: { has: boolean; active: boolean; className: string };
  rvData: {
    rvMode: boolean;
    rvDcConsumption: number;
    shore: { has: boolean; inputPower: number; entity?: string };
    acCharger: { has: boolean; outputPower: number };
    solarCharger: { has: boolean; outputPower: number; state: string | null };
    booster: { has: boolean; outputPower: number };
    cabinBattery: {
      has: boolean;
      netPower: number;
      measuredIn: number;
      measuredOut: number;
    };
    starterBattery: { has: boolean; voltage: number | null; power: number };
    loads: {
      totalPower: number;
      acPower: number;
      dcPower: number;
      dcPowerConfigured: boolean;
    };
  };
  individualObjs: Array<{ has: boolean; state: number | null }>;
};

beforeEach(() => {
  unavailableOrMisconfiguredErrorMock.mockReset();
});

describe("render", () => {
  test("renders correctly", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
      },
    } as PowerFlowCardPlusConfig;
    const card = new PowerFlowCardPlus();
    card.setConfig(config);
    card.connectedCallback();
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("RV routes charger and solar outputs to the DC bus without direct source flows", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      display_zero_lines: { mode: "hide" },
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.classic_solar" },
        battery: { entity: "sensor.legacy_battery" },
        home: { entity: "sensor.loads" },
      },
      rv: {
        shore: { input_power: "sensor.shore" },
        ac_charger: { output_power: "sensor.ac_output" },
        solar_charger: { output_power: "sensor.solar_output" },
        cabin_battery: { net_power: "sensor.battery_net" },
      },
    } as PowerFlowCardPlusConfig;
    const { card, container } = renderCard(
      config,
      makeHass({
        "sensor.shore": "220",
        "sensor.ac_output": "204",
        "sensor.classic_solar": "120",
        "sensor.solar_output": "120",
        "sensor.legacy_battery": "0",
        "sensor.battery_net": "324",
        "sensor.loads": "0",
      }),
      500
    );
    const data = card._computeRenderData();

    expect(data.rvData.shore.inputPower).toBe(220);
    expect(data.grid.state.fromGrid).toBe(220);
    expect(container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "204"
    );
    expect(container.querySelector("#rv-solar-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "120"
    );
    expect(container.querySelector("#battery-grid-flow")).toBeNull();
    expect(container.querySelector("#grid-home-flow")).toBeNull();
    expect(container.querySelector("#solar-battery-flow")).toBeNull();
    expect(container.querySelector("#solar-home-flow")).toBeNull();
  });

  test("RV source flows suppress zero values even when zero-lines are enabled", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      display_zero_lines: { mode: "show" },
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.classic_solar" },
      },
      rv: {
        ac_charger: { output_power: "sensor.ac_output" },
        solar_charger: { output_power: "sensor.solar_output" },
      },
    } as PowerFlowCardPlusConfig;
    const { container } = renderCard(
      config,
      makeHass({
        "sensor.shore": "220",
        "sensor.classic_solar": "0",
        "sensor.ac_output": "0",
        "sensor.solar_output": "0",
      })
    );

    expect(container.querySelector("#rv-shore-dc-bus-flow")).toBeNull();
    expect(container.querySelector("#rv-solar-dc-bus-flow")).toBeNull();
  });

  test("AC 204 W and measured battery input 159 W render a 45 W RV load", () => {
    const { container, data } = renderRvFlowScenario({ acOutput: 204, batteryNet: 159 });

    expect(data.battery.state.toBattery).toBe(159);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(45);
    expect(
      container.querySelector("#rv-dc-bus-to-cabin-battery-flow")?.getAttribute("data-power-watts")
    ).toBe("159");
    expect(container.querySelector("#rv-cabin-battery-to-dc-bus-flow")).toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "45"
    );
    expect(container.querySelector("#battery-home-flow")).toBeNull();
    expect(container.querySelector("#home-circle")?.textContent).toContain("45");
  });

  test("battery discharge 75 W supplies the DC bus and RV without direct battery-home flow", () => {
    const { container, data } = renderRvFlowScenario({ batteryNet: -75 });

    expect(data.battery.state.toBattery).toBe(0);
    expect(data.battery.state.fromBattery).toBe(75);
    expect(data.rvData.rvDcConsumption).toBe(75);
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-flow")).toBeNull();
    expect(
      container.querySelector("#rv-cabin-battery-to-dc-bus-flow")?.getAttribute("data-power-watts")
    ).toBe("75");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "75"
    );
    expect(container.querySelector("#battery-home-flow")).toBeNull();
  });

  test("solar 120 W, battery input 70 W, and RV load 50 W remain separate bus flows", () => {
    const { container, data } = renderRvFlowScenario({ solarOutput: 120, batteryNet: 70 });

    expect(data.rvData.rvDcConsumption).toBe(50);
    expect(container.querySelector("#rv-solar-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "120"
    );
    expect(
      container.querySelector("#rv-dc-bus-to-cabin-battery-flow")?.getAttribute("data-power-watts")
    ).toBe("70");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "50"
    );
  });

  test("battery net zero sends charger output only from the DC bus to RV", () => {
    const { container, data } = renderRvFlowScenario({ acOutput: 100, batteryNet: 0 });

    expect(data.rvData.rvDcConsumption).toBe(100);
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-flow")).toBeNull();
    expect(container.querySelector("#rv-cabin-battery-to-dc-bus-flow")).toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "100"
    );
  });

  test("configured zero DC load suppresses the RV flow and every zero-line", () => {
    const { container, data } = renderRvFlowScenario({ acOutput: 100, dcPower: 0 });

    expect(data.rvData.loads.dcPowerConfigured).toBe(true);
    expect(data.rvData.rvDcConsumption).toBe(0);
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")).toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-flow")).toBeNull();
    expect(container.querySelector("#rv-cabin-battery-to-dc-bus-flow")).toBeNull();
  });

  test("simultaneous positive battery raw flows are conservatively netted", () => {
    expect(normalizeRvBatteryFlows(100, 40)).toEqual({ measuredIn: 60, measuredOut: 0 });
    expect(normalizeRvBatteryFlows(40, 100)).toEqual({ measuredIn: 0, measuredOut: 60 });
    expect(normalizeRvBatteryFlows(50, 50)).toEqual({ measuredIn: 0, measuredOut: 0 });
  });

  test("house mode retains the existing source flow components", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      display_zero_lines: { mode: "hide" },
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
        home: {},
      },
    } as PowerFlowCardPlusConfig;
    const container = document.createElement("div");

    renderTemplate(
      flowElement(config, {
        grid: {
          has: true,
          state: { fromGrid: 44, toGrid: 0, toBattery: 36, toHome: 8 },
        },
        battery: {
          has: true,
          state: { fromBattery: 0, toBattery: 36, toGrid: 0, toHome: 0 },
        },
        solar: {
          has: true,
          hasReturnToGrid: false,
          state: { total: 20, toGrid: 0, toBattery: 12, toHome: 8 },
        },
        individual: [],
        newDur: {
          batteryGrid: 1,
          batteryToHome: 1,
          gridToHome: 1,
          solarToBattery: 1,
          solarToGrid: 1,
          solarToHome: 1,
          individual: [],
          nonFossil: 1,
        },
      }),
      container
    );

    expect(container.querySelector("#battery-grid-flow")).not.toBeNull();
    expect(container.querySelector("#grid-home-flow")).not.toBeNull();
    expect(container.querySelector("#solar-battery-flow")).not.toBeNull();
    expect(container.querySelector("#solar-home-flow")).not.toBeNull();
    expect(container.querySelector("#rv-shore-dc-bus-flow")).toBeNull();
    expect(container.querySelector("#rv-solar-dc-bus-flow")).toBeNull();
  });

  test("DC bus layout node is rendered only in RV mode", () => {
    const rvConfig = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.grid" } },
    } as PowerFlowCardPlusConfig;
    const homeConfig = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid" } },
    } as PowerFlowCardPlusConfig;

    const rv = renderCard(rvConfig, makeHass({ "sensor.grid": "0" }));
    const home = renderCard(homeConfig, makeHass({ "sensor.grid": "0" }));

    expect(rv.container.querySelector("#rv-dc-bus")).not.toBeNull();
    expect(home.container.querySelector("#rv-dc-bus")).toBeNull();
  });

  test("configured zero-watt RV structure keeps an inactive DC bus node visible", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.grid" } },
      rv: { shore: { input_power: "sensor.shore" } },
    } as PowerFlowCardPlusConfig;
    const { card, container } = renderCard(
      config,
      makeHass({ "sensor.grid": "0", "sensor.shore": "0" })
    );
    const data = card._computeRenderData();
    const node = container.querySelector("#rv-dc-bus > span");

    expect(data.dcBus).toEqual({
      has: true,
      active: false,
      className: "rv-dc-bus-node rv-dc-bus-node--narrow",
    });
    expect(node).not.toBeNull();
    expect(node?.getAttribute("data-active")).toBe("false");
  });

  test("narrow RV cards retain the DC bus node without render errors", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.grid" } },
      rv: { ac_charger: { output_power: "sensor.ac_output" } },
    } as PowerFlowCardPlusConfig;

    const { container } = renderCard(
      config,
      makeHass({ "sensor.grid": "0", "sensor.ac_output": "10" }),
      320
    );

    expect(container.querySelector("#rv-dc-bus .rv-dc-bus-node--narrow")).not.toBeNull();
    expect(container.querySelector(".circle-container.grid .circle")).not.toBeNull();
    expect(container.querySelector("#home-circle")).not.toBeNull();
    expect(container.querySelector("#rv-shore-dc-bus-flow")).not.toBeNull();
  });
});

describe("_computeRenderData", () => {
  test.each([{ rv_mode: true }, { main_config: { rv_mode: true } }])(
    "RV mode uses classic entities, preserves configured names, and derives shore flows",
    (modeConfig) => {
      const config = {
        type: "custom:power-flow-card-plus",
        ...modeConfig,
        entities: {
          grid: { entity: "sensor.shore", name: "Configured Shore" },
          solar: { entity: "sensor.solar", name: "Configured Solar" },
          battery: {
            entity: {
              consumption: "sensor.battery_discharge",
              production: "sensor.battery_charge",
            },
            name: "Configured House Battery",
          },
          home: { entity: "sensor.loads", name: "Configured RV Loads" },
        },
      } as PowerFlowCardPlusConfig;
      const hass = makeHass({
        "sensor.shore": "500",
        "sensor.solar": "100",
        "sensor.battery_charge": "200",
        "sensor.battery_discharge": "0",
        "sensor.loads": "300",
      });
      const data = makeCard(config, hass)._computeRenderData();

      expect(data.rvMode).toBe(true);
      expect(data.grid.state.toHome).toBe(0);
      expect(data.grid.state.toBattery).toBe(200);
      expect(data.solar.state.toBattery).toBe(100);
      expect(data.solar.state.toHome).toBe(0);
      expect(data.battery.state.toBattery).toBe(200);
      expect(data.battery.state.fromBattery).toBe(0);
      expect(data.battery.state.toHome).toBe(0);
      expect(data.rvData.rvDcConsumption).toBe(100);
      expect(data.grid.name).toBe("Configured Shore");
      expect(data.solar.name).toBe("Configured Solar");
      expect(data.battery.name).toBe("Configured House Battery");
      expect(data.home.name).toBe("Configured RV Loads");
    }
  );

  test("classic RV fallback skips missing split entities without reading Unknown", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: {
          entity: { consumption: "sensor.shore" },
          name: "Configured Shore",
        },
        battery: {
          entity: { production: "sensor.battery_charge" },
          name: "Configured House Battery",
        },
        home: { entity: "sensor.loads", name: "Configured RV Loads" },
      },
    } as unknown as PowerFlowCardPlusConfig;
    const hass = makeHass({
      "sensor.shore": "500",
      "sensor.battery_charge": "200",
      "sensor.loads": "300",
    });

    const data = makeCard(config, hass)._computeRenderData();

    expect(data.rvData.shore.entity).toBe("sensor.shore");
    expect(data.rvData.acCharger.outputPower).toBe(200);
    expect(data.rvData.cabinBattery.netPower).toBe(200);
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(200);
    expect(data.battery.state.toBattery).toBe(200);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.grid.name).toBe("Configured Shore");
    expect(data.battery.name).toBe("Configured House Battery");
    expect(data.home.name).toBe("Configured RV Loads");
    expect(unavailableOrMisconfiguredErrorMock).not.toHaveBeenCalled();
  });

  test("classic RV fallback does not replace missing charger output with shore power", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.cabin_battery" },
        home: { entity: "sensor.rv_consumption" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.shore": "114",
        "sensor.solar": "0",
        "sensor.cabin_battery": "0",
        "sensor.rv_consumption": "75",
      })
    )._computeRenderData();

    expect(data.grid.state.toBattery).toBe(0);
    expect(data.solar.state.toBattery).toBe(0);
    expect(data.battery.state.toBattery).toBe(0);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.grid.state.toHome).toBe(0);
    expect(data.solar.state.toHome).toBe(0);
  });

  test("AC charger conversion losses are not rendered as Shore to RV flow", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.legacy_battery" },
      },
      rv: {
        ac_charger: {
          output_power: "sensor.ac_output_power",
          output_voltage: "sensor.ac_output_voltage",
          output_current: "sensor.ac_output_current",
          state: "sensor.ac_state",
        },
        solar_charger: { output_power: "sensor.solar_output_power" },
        booster: { output_power: "sensor.booster_output_power" },
        cabin_battery: { net_power: "sensor.cabin_battery_net_power" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.shore": "220",
        "sensor.solar": "0",
        "sensor.legacy_battery": "0",
        "sensor.ac_output_power": "204",
        "sensor.ac_output_voltage": "20",
        "sensor.ac_output_current": "20",
        "sensor.ac_state": "1",
        "sensor.solar_output_power": "0",
        "sensor.booster_output_power": "0",
        "sensor.cabin_battery_net_power": "102",
      })
    )._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(220);
    expect(data.grid.state.toBattery).toBe(204);
    expect(data.grid.state.toHome).toBe(0);
    expect(data.battery.state.toBattery).toBe(102);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(102);

    const container = document.createElement("div");
    renderTemplate(
      flowElement(
        config,
        {
          battery: data.battery,
          grid: data.grid,
          individual: [],
          solar: data.solar,
          rvData: data.rvData,
          newDur: {
            batteryGrid: 1,
            batteryToHome: 1,
            gridToHome: 1,
            solarToBattery: 1,
            solarToGrid: 1,
            solarToHome: 1,
            individual: [],
            nonFossil: 1,
            shoreToDcBus: 1,
            solarToDcBus: 1,
            dcBusToCabinBattery: 1,
            cabinBatteryToDcBus: 1,
            dcBusToRv: 1,
          },
        },
        true
      ),
      container
    );

    expect(container.querySelector("#grid-home-flow")).toBeNull();
    expect(container.querySelector("#battery-grid-flow")).toBeNull();
    expect(container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "204"
    );
    expect(
      container.querySelector("#rv-dc-bus-to-cabin-battery-flow")?.getAttribute("data-power-watts")
    ).toBe("102");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "102"
    );
  });

  test("solar output, measured battery input, and RV load stay distinct", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.legacy_battery" },
      },
      rv: {
        ac_charger: { output_power: "sensor.ac_output_power" },
        solar_charger: { output_power: "sensor.solar_output_power" },
        booster: { output_power: "sensor.booster_output_power" },
        cabin_battery: { net_power: "sensor.cabin_battery_net_power" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.shore": "0",
        "sensor.solar": "0",
        "sensor.legacy_battery": "0",
        "sensor.ac_output_power": "0",
        "sensor.solar_output_power": "120",
        "sensor.booster_output_power": "0",
        "sensor.cabin_battery_net_power": "70",
      })
    )._computeRenderData();

    expect(data.solar.state.toBattery).toBe(120);
    expect(data.solar.state.toHome).toBe(0);
    expect(data.battery.state.toBattery).toBe(70);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(50);
  });

  test("booster fallback contributes to RV load without changing measured battery input", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.legacy_battery" },
      },
      rv: {
        ac_charger: { output_power: "sensor.ac_output_power" },
        solar_charger: { output_power: "sensor.solar_output_power" },
        booster: {
          output_voltage: "sensor.booster_output_voltage",
          output_current: "sensor.booster_output_current",
        },
        cabin_battery: { net_power: "sensor.cabin_battery_net_power" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.shore": "0",
        "sensor.solar": "0",
        "sensor.legacy_battery": "0",
        "sensor.ac_output_power": "0",
        "sensor.solar_output_power": "0",
        "sensor.booster_output_voltage": "15",
        "sensor.booster_output_current": "20",
        "sensor.cabin_battery_net_power": "250",
      })
    )._computeRenderData();

    expect(data.battery.state.toBattery).toBe(250);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(50);
  });

  test("battery discharge remains measured output while RV load is derived separately", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.legacy_battery" },
      },
      rv: {
        ac_charger: { output_power: "sensor.ac_output_power" },
        solar_charger: { output_power: "sensor.solar_output_power" },
        booster: { output_power: "sensor.booster_output_power" },
        cabin_battery: { net_power: "sensor.cabin_battery_net_power" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.shore": "0",
        "sensor.solar": "0",
        "sensor.legacy_battery": "0",
        "sensor.ac_output_power": "0",
        "sensor.solar_output_power": "0",
        "sensor.booster_output_power": "0",
        "sensor.cabin_battery_net_power": "-75",
      })
    )._computeRenderData();

    expect(data.battery.state.toBattery).toBe(0);
    expect(data.battery.state.fromBattery).toBe(75);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(75);
  });

  test("negative source measurements never produce negative display values", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.legacy_battery" },
      },
      rv: {
        ac_charger: { output_power: "sensor.ac_output_power" },
        solar_charger: { output_power: "sensor.solar_output_power" },
        booster: { output_power: "sensor.booster_output_power" },
        cabin_battery: { net_power: "sensor.cabin_battery_net_power" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.shore": "0",
        "sensor.solar": "0",
        "sensor.legacy_battery": "0",
        "sensor.ac_output_power": "-10",
        "sensor.solar_output_power": "-20",
        "sensor.booster_output_power": "-30",
        "sensor.cabin_battery_net_power": "10",
      })
    )._computeRenderData();

    expect(data.grid.state.toBattery).toBe(0);
    expect(data.solar.state.toBattery).toBe(0);
    expect(data.battery.state.toBattery).toBe(10);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(0);
  });

  test("invalid RV entity objects are ignored before entity state reads", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.shore" } },
      rv: {
        shore_power: {
          entity: { entity: "sensor.shore" },
        },
      },
    } as unknown as PowerFlowCardPlusConfig;
    const data = makeCard(config, makeHass({ "sensor.shore": "500" }))._computeRenderData();

    expect(data.rvData.shore.entity).toBe("sensor.shore");
    expect(data.rvData.shore.inputPower).toBe(500);
    expect(unavailableOrMisconfiguredErrorMock).not.toHaveBeenCalledWith(undefined);
  });

  test("structured runtime data prefers power over voltage times current", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.classic_grid" } },
      rv: {
        ac_charger: {
          output_power: "sensor.ac_power",
          output_voltage: "sensor.ac_voltage",
          output_current: "sensor.ac_current",
        },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.ac_power": "204",
        "sensor.ac_voltage": "20",
        "sensor.ac_current": "20",
        "sensor.classic_grid": "0",
      })
    )._computeRenderData();

    expect(data.rvData.acCharger.has).toBe(true);
    expect(data.rvData.acCharger.outputPower).toBe(204);
  });

  test("structured runtime data falls back to voltage times current", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.classic_grid" } },
      rv: {
        booster: {
          output_voltage: "sensor.booster_voltage",
          output_current: "sensor.booster_current",
        },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.classic_grid": "0",
        "sensor.booster_voltage": "15",
        "sensor.booster_current": "20",
      })
    )._computeRenderData();

    expect(data.rvData.booster.has).toBe(true);
    expect(data.rvData.booster.outputPower).toBe(300);
  });

  test("unknown and unavailable structured values resolve safely", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.classic_grid" } },
      rv: {
        solar_charger: {
          state: "sensor.solar_state",
          output_power: "sensor.solar_power",
        },
        cabin_battery: { voltage: "sensor.battery_voltage" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.solar_state": "unknown",
        "sensor.solar_power": "unavailable",
        "sensor.battery_voltage": "undefined",
        "sensor.classic_grid": "0",
      })
    )._computeRenderData();

    expect(data.rvData.solarCharger.has).toBe(true);
    expect(data.rvData.solarCharger.state).toBeNull();
    expect(data.rvData.solarCharger.outputPower).toBe(0);
    expect(data.rvData.cabinBattery.has).toBe(true);
    expect(unavailableOrMisconfiguredErrorMock).not.toHaveBeenCalled();
  });

  test("a configured zero-watt entity keeps its runtime node present", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.classic_grid" } },
      rv: { shore: { input_power: "sensor.shore_input" } },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({ "sensor.classic_grid": "0", "sensor.shore_input": "0" })
    )._computeRenderData();

    expect(data.rvData.shore.has).toBe(true);
    expect(data.rvData.shore.inputPower).toBe(0);
  });

  test("new neutral fields override legacy and classic runtime values", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.classic_shore" },
        solar: { entity: "sensor.classic_solar" },
        home: { entity: "sensor.classic_load" },
      },
      rv: {
        shore: { input_power: "sensor.neutral_shore" },
        shore_power: { entity: "sensor.legacy_shore" },
        solar_charger: { output_power: "sensor.neutral_solar" },
        solar: { entity: "sensor.legacy_solar" },
        loads: { total_power: "sensor.neutral_load" },
        dc_load: { entity: "sensor.legacy_load" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.classic_shore": "100",
        "sensor.legacy_shore": "200",
        "sensor.neutral_shore": "300",
        "sensor.classic_solar": "10",
        "sensor.legacy_solar": "20",
        "sensor.neutral_solar": "30",
        "sensor.classic_load": "1",
        "sensor.legacy_load": "2",
        "sensor.neutral_load": "3",
      })
    )._computeRenderData();

    expect(data.rvData.shore.inputPower).toBe(300);
    expect(data.rvData.solarCharger.outputPower).toBe(30);
    expect(data.rvData.loads.totalPower).toBe(3);
  });

  test("runtime helpers reject entity objects before any state read", () => {
    const hass = makeHass({ "sensor.valid": "12" });
    const entityObject = { entity: "sensor.valid" };

    expect(isConfiguredEntity(entityObject)).toBe(false);
    expect(resolveEntityPower(hass, entityObject)).toBeNull();
    expect(resolveVoltageCurrentPower(hass, entityObject, "sensor.valid")).toBeNull();
    expect(resolveOptionalState(hass, entityObject)).toBeNull();
    expect(unavailableOrMisconfiguredErrorMock).not.toHaveBeenCalled();
  });

  test("case 1: grid-only consumption — fromGrid is the entity value and toHome follows", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
      },
    } as PowerFlowCardPlusConfig;
    const hass = makeHass({ "sensor.grid": "500" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(500);
    // toHome = max(fromGrid - toBattery, 0) = max(500 - 0, 0) = 500
    expect(data.grid.state.toHome).toBe(500);
    // No solar entity configured
    expect(data.solar.has).toBe(false);
    // No battery entity configured → battery.has is falsy
    expect(data.battery.has).toBeFalsy();
  });

  test("case 2: solar covers home and grid is zero — dependency rule zeroes grid toHome", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
      },
    } as PowerFlowCardPlusConfig;
    // grid produces nothing (0W), solar produces 1000W
    const hass = makeHass({ "sensor.grid": "0", "sensor.solar": "1000" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.solar.state.total).toBe(1000);
    // fromGrid === 0 → the dependency rule at lines 791-794 forces toHome and toBattery to 0
    expect(data.grid.state.fromGrid).toBe(0);
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(0);
    // Solar covers all home consumption
    expect(data.solar.state.toHome).toBe(1000);
  });

  test("case 3: tolerance zeroing — grid below tolerance is treated as 0", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid", display_zero_tolerance: 5 } as any,
      },
    } as PowerFlowCardPlusConfig;
    // 3W is below the 5W tolerance
    const hass = makeHass({ "sensor.grid": "3" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(0);
    // Dependency rule: fromGrid === 0 → toHome and toBattery also zeroed
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(0);
  });

  test("case 4: negative individual entity stays visible (Plan 001 regression guard)", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        individual: [{ entity: "sensor.device" }],
      },
    } as PowerFlowCardPlusConfig;
    // Individual state is negative; getIndividualState applies Math.abs so state === 50
    const hass = makeHass({ "sensor.grid": "100", "sensor.device": "-50" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(data.individualObjs).toHaveLength(1);
    const individual = data.individualObjs[0];
    // has === true: the device is visible even with a negative raw state
    expect(individual.has).toBe(true);
    // getIndividualState returns Math.abs of the raw value
    expect(individual.state).toBe(50);
  });

  test("case 5: unavailable entity — no NaN in grid state fields", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
      },
    } as PowerFlowCardPlusConfig;
    // "unavailable" is not a number; getEntityState returns null → getEntityStateWatts returns 0
    const hass = makeHass({ "sensor.grid": "unavailable", "sensor.solar": "unavailable" });
    const card = makeCard(config, hass);
    const data = card._computeRenderData();

    expect(Number.isNaN(data.grid.state.fromGrid)).toBe(false);
    expect(Number.isNaN(data.grid.state.toGrid)).toBe(false);
    expect(Number.isNaN(data.grid.state.toBattery)).toBe(false);
    expect(Number.isNaN(data.grid.state.toHome)).toBe(false);
    expect(Number.isNaN(data.solar.state.total)).toBe(false);
  });
});
