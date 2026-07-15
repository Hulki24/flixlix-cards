// test that the card renders correctly

import { beforeEach, describe, expect, test, vi } from "vitest";

const { unavailableOrMisconfiguredErrorMock } = vi.hoisted(() => ({
  unavailableOrMisconfiguredErrorMock: vi.fn(),
}));

vi.mock("@flixlix-cards/shared/utils/unavailable-error", () => ({
  unavailableOrMisconfiguredError: unavailableOrMisconfiguredErrorMock,
}));

import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { flowElement } from "@flixlix-cards/shared/components/flows/index";
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
    _computeRenderData: () => ReturnType<typeof computeRenderDataShape>;
  };
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
  rvData: {
    shorePower: { entity?: string; state: number | null };
    houseBattery: {
      charge: { entity?: string; state: number | null };
      discharge: { entity?: string; state: number | null };
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

  test("RV shore charging renders Grid to Battery without a Grid to Home flow", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      display_zero_lines: { mode: "hide" },
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
        home: {},
      },
    } as PowerFlowCardPlusConfig;
    const container = document.createElement("div");

    renderTemplate(
      flowElement(
        config,
        {
          grid: {
            has: true,
            state: { fromGrid: 44, toGrid: 0, toBattery: 36, toHome: 0 },
          },
          battery: {
            has: true,
            state: { fromBattery: 0, toBattery: 36, toGrid: 0, toHome: 0 },
          },
          solar: {
            has: true,
            hasReturnToGrid: false,
            state: { total: 1, toGrid: 0, toBattery: 1, toHome: 0 },
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
        },
        true
      ),
      container
    );

    expect(container.querySelector("#battery-grid-flow")).not.toBeNull();
    expect(container.querySelector("#grid-home-flow")).toBeNull();
    expect(
      container.querySelector("circle.battery-from-grid animateMotion")?.getAttribute("keyPoints")
    ).toBe("1;0");
    expect(container.querySelector("circle.battery-to-grid")).toBeNull();
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
      expect(data.grid.state.toBattery).toBe(500);
      expect(data.solar.state.toBattery).toBe(100);
      expect(data.solar.state.toHome).toBe(0);
      expect(data.battery.state.toBattery).toBe(600);
      expect(data.battery.state.fromBattery).toBe(400);
      expect(data.battery.state.toHome).toBe(400);
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

    expect(data.rvData.shorePower.entity).toBe("sensor.shore");
    expect(data.rvData.houseBattery.charge.entity).toBe("sensor.battery_charge");
    expect(data.rvData.houseBattery.discharge.entity).toBeUndefined();
    expect(data.grid.state.toHome).toBe(0);
    expect(data.grid.state.toBattery).toBe(500);
    expect(data.battery.state.toBattery).toBe(500);
    expect(data.battery.state.fromBattery).toBe(300);
    expect(data.battery.state.toHome).toBe(300);
    expect(data.grid.name).toBe("Configured Shore");
    expect(data.battery.name).toBe("Configured House Battery");
    expect(data.home.name).toBe("Configured RV Loads");
    expect(unavailableOrMisconfiguredErrorMock).not.toHaveBeenCalled();
  });

  test("classic RV fallback derives display values from available source and net power", () => {
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

    expect(data.grid.state.toBattery).toBe(114);
    expect(data.solar.state.toBattery).toBe(0);
    expect(data.battery.state.toBattery).toBe(114);
    expect(data.battery.state.fromBattery).toBe(114);
    expect(data.battery.state.toHome).toBe(114);
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
        "sensor.shore": "218",
        "sensor.solar": "0",
        "sensor.legacy_battery": "0",
        "sensor.ac_output_power": "204",
        "sensor.ac_output_voltage": "20",
        "sensor.ac_output_current": "20",
        "sensor.ac_state": "1",
        "sensor.solar_output_power": "0",
        "sensor.booster_output_power": "0",
        "sensor.cabin_battery_net_power": "159",
      })
    )._computeRenderData();

    expect(data.grid.state.fromGrid).toBe(218);
    expect(data.grid.state.toBattery).toBe(204);
    expect(data.grid.state.toHome).toBe(0);
    expect(data.battery.state.toBattery).toBe(204);
    expect(data.battery.state.fromBattery).toBe(45);
    expect(data.battery.state.toHome).toBe(45);
  });

  test("solar charger output is routed through the cabin battery", () => {
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
    expect(data.battery.state.toBattery).toBe(120);
    expect(data.battery.state.fromBattery).toBe(50);
    expect(data.battery.state.toHome).toBe(50);
  });

  test("booster voltage and current fallback contributes to cabin battery display input", () => {
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

    expect(data.battery.state.toBattery).toBe(300);
    expect(data.battery.state.fromBattery).toBe(50);
    expect(data.battery.state.toHome).toBe(50);
  });

  test("battery discharge without charging sources becomes RV display output", () => {
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
    expect(data.battery.state.toHome).toBe(75);
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
    expect(data.battery.state.toBattery).toBe(0);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(data.battery.state.toHome).toBe(0);
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

    expect(data.rvData.shorePower.entity).toBeUndefined();
    expect(data.rvData.shorePower.state).toBeNull();
    expect(unavailableOrMisconfiguredErrorMock).not.toHaveBeenCalledWith(undefined);
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
