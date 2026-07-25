// test that the card renders correctly

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import { styles as cardStyles } from "@flixlix-cards/shared/style";
import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { render as renderTemplate } from "lit";
import { PowerFlowCardPlus } from "../src/power-flow-card-plus";

const sharedFlowSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), `../../shared/src/components/flows/${relativePath}`), {
    encoding: "utf8",
  });

// jsdom does not provide ResizeObserver; stub it so the card's `updated` hook doesn't throw
(globalThis as any).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

type HassState = {
  state: string;
  attributes: Record<string, unknown>;
  last_updated?: string;
};

type HassStateInput = string | { state: string; last_updated?: string };

function makeHass(states: Record<string, HassStateInput> = {}) {
  const hassStates: Record<string, HassState> = {};
  for (const [entityId, input] of Object.entries(states)) {
    const state = typeof input === "string" ? input : input.state;
    hassStates[entityId] = {
      state,
      attributes: { friendly_name: entityId, unit_of_measurement: "W" },
      ...(typeof input === "string" ? {} : { last_updated: input.last_updated }),
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

function updateHassState(
  hass: ReturnType<typeof makeHass>,
  entityId: string,
  state: number,
  lastUpdated: string
): void {
  hass.states[entityId] = {
    ...hass.states[entityId],
    state: String(state),
    last_updated: lastUpdated,
  };
}

function makeCard(config: PowerFlowCardPlusConfig, hass: ReturnType<typeof makeHass>) {
  const card = new PowerFlowCardPlus();
  card.setConfig(config);
  card.hass = hass;
  card.connectedCallback();
  return card as unknown as {
    hass: ReturnType<typeof makeHass>;
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
  shoreInput,
  acOutput = 0,
  acState = "unknown",
  solarOutput = 0,
  solarState = "unknown",
  batteryNet = 0,
  acPower,
  dcPower,
  boosterInput,
  boosterOutput,
  boosterState,
  starterVoltage,
  starterPower,
  gridSecondary,
  baseDecimals,
  gridDecimals,
  acMinimumPower,
  acDecimals,
  acDisplayZero,
  homeDecimals,
  homeDisplayZero,
}: {
  shoreInput?: number;
  acOutput?: number;
  acState?: string;
  solarOutput?: number;
  solarState?: string;
  batteryNet?: number;
  acPower?: number | "unavailable";
  dcPower?: number | "unavailable";
  boosterInput?: number;
  boosterOutput?: number;
  boosterState?: string;
  starterVoltage?: number;
  starterPower?: number;
  gridSecondary?: number;
  baseDecimals?: number;
  gridDecimals?: number;
  acMinimumPower?: number;
  acDecimals?: number;
  acDisplayZero?: boolean;
  homeDecimals?: number;
  homeDisplayZero?: boolean;
}) {
  const resolvedShoreInput = shoreInput ?? Math.max(acOutput, 0);
  const boosterConfigured =
    boosterInput !== undefined || boosterOutput !== undefined || boosterState !== undefined;
  const starterConfigured = starterVoltage !== undefined || starterPower !== undefined;
  const config = {
    type: "custom:power-flow-card-plus",
    rv_mode: true,
    ...(baseDecimals === undefined ? {} : { base_decimals: baseDecimals }),
    display_zero_lines: { mode: "show" },
    entities: {
      grid: {
        entity: "sensor.shore",
        ...(gridDecimals === undefined ? {} : { decimals: gridDecimals }),
        ...(gridSecondary === undefined
          ? {}
          : { secondary_info: { entity: "sensor.shore_daily" } }),
      },
      solar: { entity: "sensor.classic_solar" },
      battery: { entity: "sensor.legacy_battery" },
      home: {
        entity: "sensor.classic_home",
        name: "RV",
        override_state: true,
        ...(homeDecimals === undefined ? {} : { decimals: homeDecimals }),
        ...(homeDisplayZero === undefined ? {} : { display_zero: homeDisplayZero }),
      },
    },
    rv: {
      shore: { input_power: "sensor.shore" },
      ac_charger: { state: "sensor.ac_state", output_power: "sensor.ac_output" },
      solar_charger: { state: "sensor.solar_state", output_power: "sensor.solar_output" },
      cabin_battery: { net_power: "sensor.battery_net" },
      ...(boosterConfigured
        ? {
            booster: {
              state: "sensor.booster_state",
              input_power: "sensor.booster_input",
              output_power: "sensor.booster_output",
            },
          }
        : {}),
      ...(starterConfigured
        ? {
            starter_battery: {
              voltage: "sensor.starter_voltage",
              power: "sensor.starter_power",
            },
          }
        : {}),
      ...(dcPower === undefined && acPower === undefined
        ? {}
        : {
            loads: {
              ...(acPower === undefined ? {} : { ac_power: "sensor.ac_load" }),
              ...(dcPower === undefined ? {} : { dc_power: "sensor.dc_load" }),
              ...(acMinimumPower === undefined &&
              acDecimals === undefined &&
              acDisplayZero === undefined
                ? {}
                : {
                    ac_display: {
                      ...(acMinimumPower === undefined ? {} : { minimum_power: acMinimumPower }),
                      ...(acDecimals === undefined ? {} : { decimals: acDecimals }),
                      ...(acDisplayZero === undefined ? {} : { display_zero: acDisplayZero }),
                    },
                  }),
            },
          }),
    },
  } as PowerFlowCardPlusConfig;
  const hass = makeHass({
    "sensor.shore": String(resolvedShoreInput),
    "sensor.classic_solar": String(Math.max(solarOutput, 0)),
    "sensor.legacy_battery": "0",
    "sensor.ac_output": String(acOutput),
    "sensor.ac_state": acState,
    "sensor.solar_output": String(solarOutput),
    "sensor.solar_state": solarState,
    "sensor.battery_net": String(batteryNet),
    "sensor.classic_home": "999",
    ...(gridSecondary === undefined ? {} : { "sensor.shore_daily": String(gridSecondary) }),
    ...(boosterConfigured
      ? {
          "sensor.booster_state": boosterState ?? "unknown",
          "sensor.booster_input": String(boosterInput ?? 0),
          "sensor.booster_output": String(boosterOutput ?? 0),
        }
      : {}),
    ...(starterConfigured
      ? {
          "sensor.starter_voltage": String(starterVoltage ?? 0),
          "sensor.starter_power": String(starterPower ?? 0),
        }
      : {}),
    ...(acPower === undefined ? {} : { "sensor.ac_load": String(acPower) }),
    ...(dcPower === undefined ? {} : { "sensor.dc_load": String(dcPower) }),
  });

  const rendered = renderCard(config, hass, 500);
  return { ...rendered, data: rendered.card._computeRenderData() };
}

function makeRvTransitionCard({
  acOutput,
  solarOutput,
  boosterOutput = 0,
  batteryNet,
  dcPower,
  lastUpdated = "2026-07-22T10:00:00.000Z",
}: {
  acOutput: number;
  solarOutput: number;
  boosterOutput?: number;
  batteryNet: number;
  dcPower?: number;
  lastUpdated?: string;
}) {
  const config = {
    type: "custom:power-flow-card-plus",
    rv_mode: true,
    entities: {
      grid: { entity: "sensor.shore" },
      solar: { entity: "sensor.solar_output" },
      battery: { entity: "sensor.battery_net" },
      home: { name: "RV" },
    },
    rv: {
      shore: { input_power: "sensor.shore" },
      ac_charger: { output_power: "sensor.ac_output" },
      solar_charger: { output_power: "sensor.solar_output" },
      booster: { output_power: "sensor.booster_output" },
      cabin_battery: { net_power: "sensor.battery_net" },
      ...(dcPower === undefined ? {} : { loads: { dc_power: "sensor.dc_load" } }),
    },
  } as PowerFlowCardPlusConfig;
  const timedState = (state: number) => ({ state: String(state), last_updated: lastUpdated });
  const hass = makeHass({
    "sensor.shore": timedState(acOutput > 0 ? acOutput : 0),
    "sensor.ac_output": timedState(acOutput),
    "sensor.solar_output": timedState(solarOutput),
    "sensor.booster_output": timedState(boosterOutput),
    "sensor.battery_net": timedState(batteryNet),
    ...(dcPower === undefined ? {} : { "sensor.dc_load": timedState(dcPower) }),
  });
  return { card: makeCard(config, hass), hass };
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
    acCharger: { has: boolean; state: string | null; outputPower: number };
    solarCharger: { has: boolean; outputPower: number; state: string | null };
    booster: { has: boolean; state: string | null; inputPower: number; outputPower: number };
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
      acPowerConfigured: boolean;
      acPowerAvailable: boolean;
      acEntity?: string;
      dcPower: number;
      dcPowerConfigured: boolean;
    };
  };
  individualObjs: Array<{ has: boolean; state: number | null }>;
};

beforeEach(() => {
  unavailableOrMisconfiguredErrorMock.mockReset();
});

describe("RV flow isolation", () => {
  const rvFlows = [
    { relativePath: "rv/solar-to-dc-bus.ts" },
    { relativePath: "rv/distribution-to-rv-ac.ts" },
    { relativePath: "rv/shore-to-dc-bus.ts" },
    { relativePath: "rv/dc-bus-to-rv.ts" },
    { relativePath: "rv/dc-bus-to-cabin-battery.ts" },
    { relativePath: "rv/cabin-battery-to-dc-bus.ts" },
  ];

  test.each(rvFlows)("$relativePath owns its RV wrapper and SVG", ({ relativePath }) => {
      const source = sharedFlowSource(relativePath);

      expect(source).not.toContain("classic-straight-flow");
      expect(source).toContain("rv-flow-lines");
      expect(source).toContain("checkShouldShowDots");
    });

  test("Classic straight flows retain their own original renderers", () => {
    const gridSource = sharedFlowSource("grid-to-home.ts");
    const solarBatterySource = sharedFlowSource("solart-to-battery.ts");

    expect(gridSource).not.toContain("classic-straight-flow");
    expect(gridSource).toContain('class="lines ${classMap');
    expect(gridSource).toContain('d="M0,${battery.has ? 50 : solar.has ? 56 : 53} H100"');
    expect(solarBatterySource).not.toContain("classic-straight-flow");
    expect(solarBatterySource).toContain('d="M50,0 V100"');
  });

  test("RV anchors replace the removed shared coordinate engines", () => {
    expect(
      existsSync(resolve(process.cwd(), "../../shared/src/components/flows/rv/layout.ts"))
    ).toBe(false);
    expect(
      existsSync(
        resolve(process.cwd(), "../../shared/src/components/flows/rv/rv-flow-network.ts")
      )
    ).toBe(false);
    expect(
      existsSync(resolve(process.cwd(), "../../shared/src/components/flows/rv/anchors.ts"))
    ).toBe(true);
  });
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

  test("RV splits shore total from AC and DC distribution", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 952,
      acPower: 897,
      acOutput: 43,
      gridSecondary: 0.9,
      baseDecimals: 2,
      gridDecimals: 0,
    });
    const inputRow = container.querySelector(".rv-shore-ac-input");
    const outputRow = container.querySelector(".rv-shore-dc-output");
    const inputArrow = inputRow?.querySelector("ha-icon") as any;
    const outputArrow = outputRow?.querySelector("ha-icon") as any;

    expect(container.querySelector("#rv-shore-total")?.textContent).toContain("952");
    expect(container.querySelector("#rv-shore-total .secondary-info")?.textContent).toContain(
      "0.9"
    );
    expect(container.querySelector(".circle-container.grid .secondary-info")).toBeNull();
    expect(container.querySelector(".circle-container.grid .label")?.textContent).toBe(
      "Distribution"
    );
    expect(inputRow?.textContent).toContain("897");
    expect(outputRow?.textContent).toContain("43");
    expect(inputRow?.textContent).not.toMatch(/\bAC\b/);
    expect(outputRow?.textContent).not.toMatch(/\bDC\b/);
    expect(inputArrow.icon).toBe("mdi:arrow-right");
    expect(outputArrow.icon).toBe("mdi:arrow-right");
    expect(inputRow?.children[0]).toBe(inputArrow);
    expect(outputRow?.children[1]).toBe(outputArrow);
    expect(inputArrow.classList).toContain("rv-shore-power-arrow--ac");
    expect(outputArrow.classList).toContain("rv-shore-power-arrow--dc");
    expect(container.querySelector(".rv-shore-power-values")?.textContent).not.toContain("→");
    expect(container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "43"
    );
    expect(
      container.querySelector("#rv-shore-distribution-flow")?.getAttribute("data-power-watts")
    ).toBe("952");
    expect(
      container.querySelector("#rv-distribution-to-rv-ac-flow")?.getAttribute("data-power-watts")
    ).toBe("897");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")).not.toBeNull();
  });

  test("structured RV YAML renders distribution defaults without display blocks", () => {
    const { container, data } = renderRvFlowScenario({
      shoreInput: 894,
      acPower: 855,
      acOutput: 33,
    });
    const distribution = container.querySelector(".circle-container.grid");

    expect(data.rvData.loads.acPower).toBe(855);
    expect(data.rvData.acCharger.outputPower).toBe(33);
    expect(container.querySelector("#rv-shore-total")?.textContent).toContain("894");
    expect(distribution).not.toBeNull();
    expect(distribution?.querySelector(".label")?.textContent).toBe("Distribution");
    expect((distribution?.querySelector("#grid-icon") as any)?.icon).toBe(
      "mdi:transit-connection-variant"
    );
    expect(distribution?.querySelector(".rv-shore-ac-input")?.textContent).toContain("855");
    expect(distribution?.querySelector(".rv-shore-dc-output")?.textContent).toContain("33");
    expect(
      container.querySelector("#rv-shore-distribution-flow")?.getAttribute("data-power-watts")
    ).toBe("894");
    expect(
      container.querySelector("#rv-distribution-to-rv-ac-flow")?.getAttribute("data-power-watts")
    ).toBe("855");
    expect(container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "33"
    );
  });

  test("default AC minimum 0 keeps a positive load visible", () => {
    const { container } = renderRvFlowScenario({ shoreInput: 220, acPower: 8 });

    expect(
      container.querySelector("#rv-distribution-to-rv-ac-flow")?.getAttribute("data-power-watts")
    ).toBe("8");
    expect(container.querySelector(".rv-home-ac-power")?.getAttribute("data-power-watts")).toBe(
      "8"
    );
  });

  test("explicit AC minimum 150 suppresses lower loads and remains inclusive", () => {
    const below = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 149,
      acMinimumPower: 150,
    });
    const { container } = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 150,
      acMinimumPower: 150,
    });

    expect(below.container.querySelector("#rv-distribution-to-rv-ac-flow")).toBeNull();
    expect(
      below.container.querySelector(".rv-home-ac-power")?.getAttribute("data-power-watts")
    ).toBe("0");
    expect(
      container.querySelector("#rv-distribution-to-rv-ac-flow")?.getAttribute("data-power-watts")
    ).toBe("150");
    expect(container.querySelector(".rv-home-ac-power")?.getAttribute("data-power-watts")).toBe(
      "150"
    );
  });

  test("suppressed AC zero can be hidden without hiding an active DC branch", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 8,
      acOutput: 100,
      batteryNet: 90,
      acMinimumPower: 150,
      acDisplayZero: false,
    });

    expect(container.querySelector(".rv-shore-ac-input")).toBeNull();
    expect(container.querySelector(".rv-home-ac-power")).toBeNull();
    expect(container.querySelector("#home-icon")).not.toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")).not.toBeNull();
  });

  test("active AC keeps the RV bubble stable when DC display is hidden at zero", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 200,
      acOutput: 0,
      homeDisplayZero: false,
    });

    expect(container.querySelector(".circle-container.home")).not.toBeNull();
    expect(container.querySelector(".rv-home-ac-power")?.textContent).toContain("200");
    expect(container.querySelector("#home-icon")).not.toBeNull();
    expect(container.querySelector(".rv-home-dc-power")).toBeNull();
    expect(container.querySelector("#rv-distribution-to-rv-ac-flow")).not.toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")).toBeNull();
  });

  test("RV AC and DC branches use visible local anchors", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 894,
      acPower: 855,
      acOutput: 100,
      batteryNet: 50,
      solarOutput: 20,
    });
    const shorePath = container.querySelector("#rv-shore-distribution-path")?.getAttribute("d");
    const acPath = container.querySelector("#rv-distribution-to-rv-ac-path")?.getAttribute("d");
    const chargerPath = container.querySelector("#rv-shore-dc-bus-path")?.getAttribute("d");
    const dcPath = container.querySelector("#rv-dc-bus-to-rv-path")?.getAttribute("d");
    const solarPath = container.querySelector("#rv-solar-dc-bus-path")?.getAttribute("d");
    const batteryPath = container
      .querySelector("#rv-dc-bus-to-cabin-battery-path")
      ?.getAttribute("d");

    expect(shorePath).toBe("M40 -10 v40");
    expect(shorePath).not.toMatch(/[CQ]/);
    expect(acPath).toBe("M0,4 H100");
    expect(chargerPath).toBe("M0,4 H50");
    expect(dcPath).toBe("M50,4 H100");
    expect(solarPath).toBe("M40,0 V100");
    expect(batteryPath).toBe("M40,0 V100");
    expect(acPath).not.toMatch(/[CQ]/);
    expect(chargerPath?.split("H")[1]).toBe(dcPath?.match(/^M(\d+),/)?.[1]);
    expect(dcPath).not.toMatch(/[CQ]/);
    expect(
      container.querySelector("#rv-solar-dc-bus-path.rv-distribution-to-rv-ac-path")
    ).toBeNull();
  });

  test("RV renderer uses three classic rows with three fixed fields each", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 100,
      acOutput: 204,
      solarOutput: 120,
      batteryNet: 70,
      starterVoltage: 13.2,
    });
    const rows = Array.from(container.querySelectorAll(".card-content > .row"));

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.children.length)).toEqual([3, 3, 3]);
    expect(rows[0].children[0].id).toBe("rv-shore-total");
    expect(rows[0].children[1].classList).toContain("solar");
    expect(rows[0].children[2].classList).toContain("spacer");
    expect(rows[1].children[0].classList).toContain("grid");
    expect(rows[1].children[1].id).toBe("rv-dc-bus");
    expect(rows[1].children[2].classList).toContain("home");
    expect(rows[2].children[0].id).toBe("rv-starter-battery");
    expect(rows[2].children[1].classList).toContain("battery");
    expect(rows[2].children[2].classList).toContain("spacer");
  });

  test("RV flows use isolated semantic wrappers outside Classic lines", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 100,
      acOutput: 204,
      solarOutput: 120,
      batteryNet: 70,
    });
    const cardContent = container.querySelector(".card-content");
    const rows = Array.from(container.querySelectorAll(".card-content > .row"));
    const lines = Array.from(container.querySelectorAll(".card-content > .rv-flow-lines"));
    const flowIds = [
      "#rv-distribution-to-rv-ac-flow",
      "#rv-shore-dc-bus-flow",
      "#rv-solar-dc-bus-flow",
      "#rv-dc-bus-to-cabin-battery-flow",
      "#rv-dc-bus-to-rv-flow",
    ];

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.parentElement === cardContent)).toBe(true);
    expect(container.querySelector(".circle-container .rv-flow-lines")).toBeNull();
    expect(
      rows[2].compareDocumentPosition(lines[0]) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    for (const id of flowIds) {
      const svg = container.querySelector(id);
      expect(svg?.parentElement?.classList).toContain("rv-flow-lines");
      expect(svg?.parentElement?.classList).not.toContain("lines");
      expect(svg?.getAttribute("preserveAspectRatio")).toBe("none");
    }
  });

  test("RV Shore owns its non-fossil-style flow inside the circle container", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 220,
      acPower: 100,
      acOutput: 204,
      solarOutput: 120,
      batteryNet: 70,
    });
    const shoreContainer = container.querySelector("#rv-shore-total");
    const cssText = cardStyles.toString();
    const shoreSvg = container.querySelector("#rv-shore-distribution-flow");
    const flowSource = sharedFlowSource("index.ts");

    expect(Array.from(shoreContainer?.children ?? []).map((child) => child.tagName)).toEqual([
      "SPAN",
      "DIV",
      "svg",
    ]);
    expect(shoreContainer?.children[0].classList).toContain("label");
    expect(shoreContainer?.children[1].classList).toContain("circle");
    expect(shoreContainer?.children[2]).toBe(shoreSvg);
    expect(shoreSvg?.parentElement).toBe(shoreContainer);
    expect(shoreSvg?.getAttribute("width")).toBe("80");
    expect(shoreSvg?.getAttribute("height")).toBe("30");
    expect(shoreSvg?.getAttribute("viewBox")).toBeNull();
    expect(shoreSvg?.getAttribute("preserveAspectRatio")).toBeNull();
    expect(
      container.querySelector("#rv-shore-distribution-path")?.getAttribute("d")
    ).toBe("M40 -10 v40");
    expect(
      container.querySelector("#rv-shore-distribution-flow")?.getAttribute("data-build-marker")
    ).toBe("shore-direct-80x30");
    expect(
      container
        .querySelector("#rv-shore-distribution-flow animateMotion mpath")
        ?.getAttribute("xlink:href")
    ).toBe("#rv-shore-distribution-path");
    expect(container.querySelectorAll("#rv-shore-distribution-flow")).toHaveLength(1);
    expect(container.querySelector(".rv-shore-distribution-flow-lines")).toBeNull();
    expect(flowSource).not.toContain("flowShoreTotalToDistribution");
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "../../shared/src/components/flows/rv/shore-total-to-distribution.ts"
        )
      )
    ).toBe(false);
    expect(cssText).not.toContain(".rv-shore-distribution-flow-lines");
    expect(cssText).toMatch(
      /\.rv-horizontal-flow-lines[\s\S]*right:\s*var\(--size-circle-entity\)[\s\S]*left:\s*var\(--size-circle-entity\)/
    );
    expect(cssText).toMatch(/\.rv-flow-lines[\s\S]*padding:\s*0/);
    expect(cssText).toMatch(
      /--rv-dc-bus-center-y:[\s\S]*--rv-dc-bus-offset-y[\s\S]*transform:\s*translateY\(var\(--rv-dc-bus-offset-y\)\)/
    );
  });

  test("RV empty fields use the same Classic spacer and no-label rules", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      no_labels: true,
      entities: {
        grid: { entity: "sensor.shore" },
        home: { entity: "sensor.home", override_state: true },
      },
      rv: {
        shore: { input_power: "sensor.shore" },
        ac_charger: { output_power: "sensor.ac_output" },
      },
    } as PowerFlowCardPlusConfig;
    const { container } = renderCard(
      config,
      makeHass({
        "sensor.shore": "220",
        "sensor.home": "0",
        "sensor.ac_output": "204",
      })
    );
    const rows = Array.from(container.querySelectorAll(".card-content > .row"));

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.children.length)).toEqual([3, 3, 3]);
    expect(rows[0].children[1].classList).toContain("spacer");
    expect(rows[0].children[2].classList).toContain("spacer");
    expect(rows[2].children[0].classList).toContain("spacer");
    expect(rows[2].children[1].classList).toContain("spacer");
    expect(rows[2].children[2].classList).toContain("spacer");
    expect(container.querySelector(".card-content")?.classList).toContain("no-labels");
  });

  test("RV bubble orders AC value, icon, and DC value without text labels", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 400,
      acPower: 200,
      acOutput: 100,
      batteryNet: 50,
    });
    const homeCircle = container.querySelector("#home-circle");
    const ordered = homeCircle?.querySelectorAll(
      ".rv-home-ac-power, #home-icon, .rv-home-dc-power"
    );

    expect(ordered?.length).toBe(3);
    expect(ordered?.[0].classList).toContain("rv-home-ac-power");
    expect(ordered?.[1].id).toBe("home-icon");
    expect(ordered?.[2].classList).toContain("rv-home-dc-power");
    expect(homeCircle?.textContent).not.toMatch(/\bAC\b|\bDC\b|AC Load|DC Load/);
    expect(container.querySelector("#rv-distribution-to-rv-ac-flow")).not.toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")).not.toBeNull();
  });

  test("RV AC and DC values honor their independent zero decimals", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 400,
      acPower: 200.4,
      acOutput: 100.4,
      batteryNet: 50,
      acDecimals: 0,
      homeDecimals: 0,
    });

    expect(container.querySelector(".rv-home-ac-power")?.textContent).toMatch(/200\s*W/);
    expect(container.querySelector(".rv-home-dc-power")?.textContent).toMatch(/50\s*W/);
    expect(container.querySelector(".rv-home-ac-power")?.textContent).not.toContain(".");
    expect(container.querySelector(".rv-home-dc-power")?.textContent).not.toContain(".");
  });

  test.each([
    { acPower: 0, acOutput: 33, absentFlow: "#rv-distribution-to-rv-ac-flow" },
    { acPower: 855, acOutput: 0, absentFlow: "#rv-shore-dc-bus-flow" },
  ])(
    "RV distribution remains visible when one output is zero",
    ({ acPower, acOutput, absentFlow }) => {
      const { container } = renderRvFlowScenario({ shoreInput: 894, acPower, acOutput });

      expect(container.querySelector(".circle-container.grid")).not.toBeNull();
      expect(container.querySelector(absentFlow)).toBeNull();
    }
  );

  test("configured AC/DC outputs show the distribution without a structured shore group", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.classic_grid" },
        home: { entity: "sensor.home" },
      },
      rv: {
        ac_charger: { output_power: "sensor.ac_output" },
        loads: { ac_power: "sensor.ac_load" },
      },
    } as PowerFlowCardPlusConfig;
    const { container } = renderCard(
      config,
      makeHass({
        "sensor.classic_grid": "0",
        "sensor.home": "0",
        "sensor.ac_output": "33",
        "sensor.ac_load": "855",
      })
    );

    expect(container.querySelector(".circle-container.grid")).not.toBeNull();
    expect(container.querySelector(".rv-shore-ac-input")?.textContent).toContain("855");
    expect(container.querySelector(".rv-shore-dc-output")?.textContent).toContain("33");
  });

  test("RV shore arrow values honor one component decimal over the global fallback", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 17.14,
      acPower: 10.14,
      acOutput: 7.16,
      baseDecimals: 0,
      gridDecimals: 1,
      acMinimumPower: 0,
    });
    const inputText =
      container.querySelector(".rv-shore-ac-input .rv-shore-power-value")?.textContent ?? "";
    const outputText =
      container.querySelector(".rv-shore-dc-output .rv-shore-power-value")?.textContent ?? "";

    expect(container.querySelector("#rv-shore-total .rv-shore-total-value")?.textContent).toMatch(
      /17[,.]1\s*W/
    );
    expect(inputText).toMatch(/10[,.]1\s*W/);
    expect(outputText).toMatch(/7[,.]2\s*W/);
  });

  test("RV shore arrow colors distinguish AC input and match the DC bus flow", () => {
    const cssText = cardStyles.cssText;

    expect(cssText).toMatch(/--rv-ac-power-color:[^;]*#d32f2f/);
    expect(cssText).toMatch(/rv-shore-power-arrow--ac[\s\S]*var\(--rv-ac-power-color\)/);
    expect(cssText).toMatch(/rv-shore-ac-input \.rv-shore-power-value[\s\S]*rv-ac-power-color/);
    expect(cssText).toMatch(/rv-shore-total[\s\S]*var\(--rv-ac-power-color\)/);
    expect(cssText).toMatch(/rv-distribution-to-rv-ac-path[\s\S]*rv-ac-power-color/);
    expect(cssText).toMatch(/rv-shore-power-arrow--dc[\s\S]*energy-grid-consumption-color/);
    expect(cssText).toMatch(
      /rv-shore-dc-output \.rv-shore-power-value[\s\S]*energy-grid-consumption-color/
    );
    expect(cssText).toMatch(/rv-shore-dc-bus-path[\s\S]*energy-grid-consumption-color/);
  });

  test("RV renders AC loads from the distribution without changing the DC residual", () => {
    const { container, data } = renderRvFlowScenario({
      shoreInput: 927,
      acOutput: 38.64,
      solarOutput: 11.05,
      batteryNet: 13.7,
      acPower: 850,
    });

    expect(data.rvData.loads.acPower).toBe(850);
    expect(data.rvData.rvDcConsumption).toBeCloseTo(35.99, 10);
    expect(container.querySelector("#rv-shore-total")?.textContent).toContain("927");
    expect(container.querySelector(".rv-shore-ac-input")?.textContent).toContain("850");
    expect(
      container.querySelector("#rv-distribution-to-rv-ac-flow")?.getAttribute("data-power-watts")
    ).toBe("850");
    expect(container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "38.64"
    );
    expect(
      Number(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts"))
    ).toBeCloseTo(35.99, 10);
    expect(container.querySelector(".circle-container.home")?.textContent).toContain("36");
  });

  test.each([
    { acPower: 0 as const, label: "zero" },
    { acPower: "unavailable" as const, label: "unavailable" },
  ])("RV AC load $label never renders a distribution flow", ({ acPower }) => {
    const { container, data } = renderRvFlowScenario({ shoreInput: 927, acPower });

    expect(data.rvData.loads.acPower).toBe(0);
    expect(container.querySelector("#rv-distribution-to-rv-ac-flow")).toBeNull();
    expect(container.querySelector(".rv-shore-ac-input")).not.toBeNull();
    expect(container.querySelector(".rv-shore-ac-input")?.classList).toContain(
      "rv-shore-power-row--inactive"
    );
  });

  test("RV distribution display_zero false hides zero power rows", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.shore" } },
      rv: {
        shore: {
          input_power: "sensor.shore",
          distribution_display: { display_zero: false },
        },
        loads: { ac_power: "sensor.ac_load" },
      },
    } as PowerFlowCardPlusConfig;
    const { container } = renderCard(
      config,
      makeHass({ "sensor.shore": "927", "sensor.ac_load": "0" })
    );

    expect(container.querySelector(".circle-container.grid")).not.toBeNull();
    expect(container.querySelector(".rv-shore-ac-input")).toBeNull();
    expect(container.querySelector(".rv-shore-dc-output")).toBeNull();
    expect(container.querySelector("#rv-distribution-to-rv-ac-flow")).toBeNull();
  });

  test("RV shore total display options affect the visible component", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      base_decimals: 0,
      entities: { grid: { entity: "sensor.shore" } },
      rv: {
        shore: {
          input_power: "sensor.shore",
          total_display: {
            name: "Landstrom gesamt",
            icon: "mdi:power-plug",
            color: [200, 20, 30],
            decimals: 1,
            unit_of_measurement: "W",
            secondary_info: {
              entity: "sensor.ac_daily",
              icon: "mdi:counter",
              decimals: 1,
              unit_of_measurement: "kWh",
            },
          },
        },
        loads: { ac_power: "sensor.ac_load" },
      },
    } as PowerFlowCardPlusConfig;
    const { card, container } = renderCard(
      config,
      makeHass({
        "sensor.shore": "100.14",
        "sensor.ac_load": "17.14",
        "sensor.ac_daily": "12.34",
      })
    );

    expect(container.querySelector("#rv-shore-total")?.textContent).toContain("Landstrom gesamt");
    expect(container.querySelector("#rv-shore-total .rv-shore-total-value")?.textContent).toMatch(
      /100[,.]1\s*W/
    );
    expect(container.querySelector("#rv-shore-total .secondary-info")?.textContent).toMatch(
      /12[,.]3\s*kWh/
    );
    expect((container.querySelector("#rv-shore-total-icon") as any)?.icon).toBe("mdi:power-plug");
    expect((card as any).style.getPropertyValue("--rv-configured-ac-power-color")).toBe("#c8141e");
  });

  test("stale AC load remains inactive when shore input is zero", () => {
    const { container, data } = renderRvFlowScenario({ shoreInput: 0, acPower: 850 });

    expect(data.rvData.loads.acPower).toBe(850);
    expect(container.querySelector("#rv-shore-total")?.getAttribute("data-active")).toBe("false");
    expect(container.querySelector(".rv-shore-ac-input")?.classList).toContain(
      "rv-shore-power-row--inactive"
    );
    expect(container.querySelector("#rv-distribution-to-rv-ac-flow")).toBeNull();
  });

  test("RV shore bubble retains configured secondary information", () => {
    const { container } = renderRvFlowScenario({
      shoreInput: 457,
      acOutput: 426,
      gridSecondary: 12,
    });

    expect(
      container.querySelector("#rv-shore-total span.secondary-info.rv-shore-total")
    ).not.toBeNull();
    expect(
      container.querySelector("#rv-shore-total span.secondary-info.rv-shore-total")?.textContent
    ).toContain("12");
    expect(container.querySelector(".circle-container.grid span.secondary-info")).toBeNull();
    expect(container.querySelector(".rv-shore-power-values")).not.toBeNull();
  });

  test("RV bubble display_zero options hide only configured zero-value bubbles", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore", display_zero: false },
        solar: { entity: "sensor.solar", display_zero: false },
        battery: { entity: "sensor.battery", display_zero: false },
        home: { entity: "sensor.home", display_zero: false },
      },
      rv: {
        shore: { input_power: "sensor.shore" },
        solar_charger: { output_power: "sensor.solar" },
        cabin_battery: { net_power: "sensor.battery" },
      },
    } as PowerFlowCardPlusConfig;
    const { container } = renderCard(
      config,
      makeHass({
        "sensor.shore": "0",
        "sensor.solar": "0",
        "sensor.battery": "0",
        "sensor.home": "0",
      })
    );

    expect(container.querySelector(".circle-container.grid")).toBeNull();
    expect(container.querySelector(".circle-container.solar")).toBeNull();
    expect(container.querySelector(".circle-container.battery")).toBeNull();
    expect(container.querySelector(".circle-container.home")).toBeNull();
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
    expect(container.querySelector("#rv-starter-to-booster-flow")).toBeNull();
    expect(container.querySelector("#rv-booster-to-dc-bus-flow")).toBeNull();
  });

  test.each(["on", "bulk", "float"])(
    "active AC charger status %s cannot render a zero-power shore flow",
    (acState) => {
      const { container, data } = renderRvFlowScenario({
        shoreInput: 0,
        acOutput: 0,
        acState,
      });

      expect(data.rvData.acCharger.state).toBe(acState);
      expect(data.rvData.shore.inputPower).toBe(0);
      expect(data.grid.has).toBe(true);
      expect(container.querySelector("#rv-shore-dc-bus-flow")).toBeNull();
      expect(container.querySelector(".rv-shore-power-values")?.getAttribute("data-active")).toBe(
        "false"
      );
      expect(
        container
          .querySelector(".rv-shore-ac-input .rv-shore-power-value")
          ?.getAttribute("data-power-watts")
      ).toBe("0");
      expect(
        container
          .querySelector(".rv-shore-dc-output .rv-shore-power-value")
          ?.getAttribute("data-power-watts")
      ).toBe("0");
      expect((container.querySelector(".rv-shore-ac-input ha-icon") as any)?.icon).toBe(
        "mdi:arrow-right"
      );
      expect((container.querySelector(".rv-shore-dc-output ha-icon") as any)?.icon).toBe(
        "mdi:arrow-right"
      );
      expect(container.querySelector(".rv-shore-ac-input")?.classList).toContain(
        "rv-shore-power-row--inactive"
      );
      expect(container.querySelector(".rv-shore-dc-output")?.classList).toContain(
        "rv-shore-power-row--inactive"
      );
    }
  );

  test("stale AC charger output cannot render a shore flow while shore input is zero", () => {
    const { container, data } = renderRvFlowScenario({
      shoreInput: 0,
      acOutput: 20.4,
      acState: "bulk",
      baseDecimals: 1,
    });

    expect(data.rvData.acCharger.outputPower).toBe(20.4);
    expect(data.rvData.rvDcConsumption).toBe(20.4);
    expect(container.querySelector("#rv-shore-dc-bus-flow")).toBeNull();
    expect(container.querySelector(".rv-shore-power-values")?.getAttribute("data-active")).toBe(
      "false"
    );
    expect(
      container
        .querySelector(".rv-shore-ac-input .rv-shore-power-value")
        ?.getAttribute("data-power-watts")
    ).toBe("0");
    expect(
      container
        .querySelector(".rv-shore-dc-output .rv-shore-power-value")
        ?.getAttribute("data-power-watts")
    ).toBe("20.4");
    expect(
      container.querySelector(".rv-shore-ac-input .rv-shore-power-value")?.textContent
    ).toMatch(/0\s*W/);
    expect(
      container.querySelector(".rv-shore-dc-output .rv-shore-power-value")?.textContent
    ).toMatch(/20[,.]4\s*W/);
    expect(container.querySelector(".rv-shore-dc-output")?.classList).toContain(
      "rv-shore-power-row--inactive"
    );
  });

  test("shore and charger output remain distinct measurement points in the RV balance", () => {
    const { container, data } = renderRvFlowScenario({
      shoreInput: 13,
      acOutput: 46,
      solarOutput: 23,
      batteryNet: 0,
    });

    expect(data.rvData.shore.inputPower).toBe(13);
    expect(data.rvData.acCharger.outputPower).toBe(46);
    expect(data.rvData.solarCharger.outputPower).toBe(23);
    expect(data.rvData.cabinBattery.measuredIn).toBe(0);
    expect(data.rvData.cabinBattery.measuredOut).toBe(0);
    expect(data.rvData.rvDcConsumption).toBe(69);
    expect(container.querySelector("#rv-shore-total")?.textContent).toContain("13");
    expect(container.querySelector(".rv-shore-dc-output")?.textContent).toContain("46");
    expect(container.querySelector(".circle-container.solar .circle")?.textContent).toContain("23");
    expect(container.querySelector("#home-circle")?.textContent).toContain("69");
    expect(container.querySelector("#home-circle")?.textContent).not.toContain("999");
    expect(container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "46"
    );
  });

  test("unavailable AC output uses UxI before legacy and never Classic battery power", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        solar: { entity: "sensor.classic_solar" },
        battery: { entity: { production: "sensor.classic_battery_charge" } },
        home: { entity: "sensor.classic_home", override_state: true },
      },
      rv: {
        shore: { input_power: "sensor.shore" },
        ac_charger: {
          output_power: "sensor.ac_output",
          output_voltage: "sensor.ac_voltage",
          output_current: "sensor.ac_current",
        },
        solar_charger: { output_power: "sensor.solar_output" },
        cabin_battery: { net_power: "sensor.battery_net" },
      },
    } as PowerFlowCardPlusConfig;
    const unavailable = makeHass({
      "sensor.shore": "13",
      "sensor.classic_solar": "23",
      "sensor.classic_battery_charge": "46",
      "sensor.classic_home": "69",
      "sensor.ac_output": "unavailable",
      "sensor.ac_voltage": "unavailable",
      "sensor.ac_current": "unavailable",
      "sensor.solar_output": "23",
      "sensor.battery_net": "0",
    });
    const withoutUxI = renderCard(config, unavailable);
    const withoutUxIData = withoutUxI.card._computeRenderData();

    expect(withoutUxIData.rvData.acCharger.outputPower).toBe(0);
    expect(withoutUxIData.rvData.rvDcConsumption).toBe(23);
    expect(withoutUxI.container.querySelector("#home-circle")?.textContent).toContain("23");
    expect(withoutUxI.container.querySelector("#home-circle")?.textContent).not.toContain("69");
    expect(withoutUxI.container.querySelector("#rv-shore-dc-bus-flow")).toBeNull();

    unavailable.states["sensor.ac_voltage"].state = "23";
    unavailable.states["sensor.ac_current"].state = "2";
    const withUxI = renderCard(config, unavailable);
    const withUxIData = withUxI.card._computeRenderData();

    expect(withUxIData.rvData.acCharger.outputPower).toBe(46);
    expect(withUxIData.rvData.rvDcConsumption).toBe(69);
    expect(withUxI.container.querySelector("#home-circle")?.textContent).toContain("69");
  });

  test.each(["unknown", "unavailable"])(
    "measured shore and charger power render independently of AC status %s",
    (acState) => {
      const { container, data } = renderRvFlowScenario({
        shoreInput: 220,
        acOutput: 204,
        acState,
      });

      expect(data.rvData.acCharger.state).toBeNull();
      expect(
        container.querySelector("#rv-shore-dc-bus-flow")?.getAttribute("data-power-watts")
      ).toBe("204");
    }
  );

  test("active solar status cannot render a zero-output solar flow", () => {
    const { container, data } = renderRvFlowScenario({
      solarOutput: 0,
      solarState: "active",
    });

    expect(data.rvData.solarCharger.state).toBe("active");
    expect(container.querySelector("#rv-solar-dc-bus-flow")).toBeNull();
  });

  test("active booster status cannot render zero-output booster flows", () => {
    const { container, data } = renderRvFlowScenario({
      boosterInput: 320,
      boosterOutput: 0,
      boosterState: "active",
      starterVoltage: 12.8,
    });

    expect(data.rvData.booster.state).toBe("active");
    expect(container.querySelector("#rv-booster-node")).toBeNull();
    expect(container.querySelector("#rv-starter-to-booster-flow")).toBeNull();
    expect(container.querySelector("#rv-booster-to-dc-bus-flow")).toBeNull();
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

  test("solar charging is subtracted from the calculated DC load", () => {
    const { container, data } = renderRvFlowScenario({
      shoreInput: 0,
      acOutput: 0,
      solarOutput: 56.13,
      boosterOutput: 0,
      batteryNet: 22.8,
    });

    expect(data.rvData.cabinBattery.measuredIn).toBe(22.8);
    expect(data.rvData.cabinBattery.measuredOut).toBe(0);
    expect(data.rvData.loads.dcPowerConfigured).toBe(false);
    expect(data.rvData.rvDcConsumption).toBeCloseTo(33.33, 10);
    expect(data.battery.state.toBattery).toBe(22.8);
    expect(data.battery.state.fromBattery).toBe(0);
    expect(container.querySelector("#home-circle")?.textContent).toContain("33");
    expect(container.querySelector("#rv-solar-dc-bus-flow")?.getAttribute("data-power-watts")).toBe(
      "56.13"
    );
    expect(
      container.querySelector("#rv-dc-bus-to-cabin-battery-flow")?.getAttribute("data-power-watts")
    ).toBe("22.8");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "33.33"
    );
  });

  test("battery discharge is added to the calculated DC load", () => {
    const { data } = renderRvFlowScenario({
      shoreInput: 0,
      acOutput: 0,
      solarOutput: 0,
      boosterOutput: 0,
      batteryNet: -22.8,
    });

    expect(data.rvData.cabinBattery.measuredIn).toBe(0);
    expect(data.rvData.cabinBattery.measuredOut).toBe(22.8);
    expect(data.rvData.loads.dcPowerConfigured).toBe(false);
    expect(data.rvData.rvDcConsumption).toBe(22.8);
  });

  test("zero battery net power leaves the calculated source sum unchanged", () => {
    const { data } = renderRvFlowScenario({
      acOutput: 7.1,
      solarOutput: 25.58,
      boosterOutput: 0,
      batteryNet: 0,
    });

    expect(data.rvData.cabinBattery.measuredIn).toBe(0);
    expect(data.rvData.cabinBattery.measuredOut).toBe(0);
    expect(data.rvData.loads.dcPowerConfigured).toBe(false);
    expect(data.rvData.rvDcConsumption).toBeCloseTo(32.68, 10);
  });

  test("stable source and battery timestamps expose the physical residual load", () => {
    const { card } = makeRvTransitionCard({
      acOutput: 426,
      solarOutput: 35,
      batteryNet: 408,
    });
    const data = card._computeRenderData();
    const container = document.createElement("div");
    renderTemplate(card.render() as any, container);

    expect(data.rvData.rvDcConsumption).toBe(53);
    expect(container.querySelector("#home-circle")?.textContent).toContain("53");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "53"
    );
  });

  test("holds the last stable load until battery net power updates after shore starts", () => {
    const { card, hass } = makeRvTransitionCard({
      acOutput: 0,
      solarOutput: 35,
      batteryNet: 22,
    });
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(13);

    updateHassState(hass, "sensor.ac_output", 426, "2026-07-22T10:00:01.000Z");
    const waiting = card._computeRenderData();
    expect(waiting.rvData.acCharger.outputPower).toBe(426);
    expect(waiting.rvData.cabinBattery.measuredIn).toBe(22);
    expect(waiting.rvData.rvDcConsumption).toBe(13);

    updateHassState(hass, "sensor.battery_net", 408, "2026-07-22T10:00:02.000Z");
    const settled = card._computeRenderData();
    expect(settled.rvData.cabinBattery.measuredIn).toBe(408);
    expect(settled.rvData.rvDcConsumption).toBe(53);
  });

  test("releases a held residual load after fifteen seconds without a battery update", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:00:00.000Z"));
    const { card, hass } = makeRvTransitionCard({
      acOutput: 0,
      solarOutput: 35,
      batteryNet: 22,
    });
    try {
      expect(card._computeRenderData().rvData.rvDcConsumption).toBe(13);
      updateHassState(hass, "sensor.ac_output", 426, "2026-07-22T10:00:01.000Z");
      expect(card._computeRenderData().rvData.rvDcConsumption).toBe(13);

      vi.advanceTimersByTime(14_999);
      expect(card._computeRenderData().rvData.rvDcConsumption).toBe(13);
      vi.advanceTimersByTime(1);
      expect(card._computeRenderData().rvData.rvDcConsumption).toBe(439);
    } finally {
      card.disconnectedCallback();
      vi.useRealTimers();
    }
  });

  test("holds the last stable load until battery net power updates after shore stops", () => {
    const { card, hass } = makeRvTransitionCard({
      acOutput: 426,
      solarOutput: 35,
      batteryNet: 408,
    });
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(53);

    updateHassState(hass, "sensor.ac_output", 0, "2026-07-22T10:00:01.000Z");
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(53);

    updateHassState(hass, "sensor.battery_net", 22, "2026-07-22T10:00:02.000Z");
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(13);
  });

  test("an explicit DC load bypasses source-transition stabilization", () => {
    const { card, hass } = makeRvTransitionCard({
      acOutput: 0,
      solarOutput: 35,
      batteryNet: 22,
      dcPower: 41,
    });
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(41);

    updateHassState(hass, "sensor.ac_output", 426, "2026-07-22T10:00:01.000Z");
    updateHassState(hass, "sensor.dc_load", 42, "2026-07-22T10:00:01.000Z");
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(42);
  });

  test("source changes below five watts do not start a hold", () => {
    const { card, hass } = makeRvTransitionCard({
      acOutput: 0,
      solarOutput: 35,
      batteryNet: 22,
    });
    expect(card._computeRenderData().rvData.rvDcConsumption).toBe(13);

    updateHassState(hass, "sensor.solar_output", 39.99, "2026-07-22T10:00:01.000Z");
    expect(card._computeRenderData().rvData.rvDcConsumption).toBeCloseTo(17.99, 10);
  });

  test("mixed RV sources balance only at the DC bus without classic direct flows", () => {
    const { container, data } = renderRvFlowScenario({
      acOutput: 204,
      solarOutput: 120,
      boosterInput: 320,
      boosterOutput: 300,
      starterVoltage: 13.4,
      batteryNet: 500,
    });

    expect(data.rvData.rvDcConsumption).toBe(124);
    expect(container.querySelector("#rv-shore-dc-bus-flow")).not.toBeNull();
    expect(container.querySelector("#rv-solar-dc-bus-flow")).not.toBeNull();
    expect(container.querySelector("#rv-booster-to-dc-bus-flow")).not.toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-flow")).not.toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "124"
    );
    expect(container.querySelector("#grid-home-flow")).toBeNull();
    expect(container.querySelector("#solar-battery-flow")).toBeNull();
    expect(container.querySelector("#solar-home-flow")).toBeNull();
    expect(container.querySelector("#battery-home-flow")).toBeNull();
  });

  test("battery net zero sends charger output only from the DC bus to RV", () => {
    const { container, data } = renderRvFlowScenario({ acOutput: 100, batteryNet: 0 });

    expect(data.rvData.rvDcConsumption).toBe(100);
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-flow")).toBeNull();
    expect(container.querySelector("#rv-cabin-battery-to-dc-bus-flow")).toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-path")).toBeNull();
    expect(container.querySelector("#rv-cabin-battery-to-dc-bus-path")).toBeNull();
    expect(container.querySelector(".rv-dc-bus-to-cabin-battery-dot")).toBeNull();
    expect(container.querySelector(".rv-cabin-battery-to-dc-bus-dot")).toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "100"
    );
  });

  test("booster input and output render the starter-to-booster-to-bus path", () => {
    const { container, data } = renderRvFlowScenario({
      boosterInput: 320,
      boosterOutput: 300,
      boosterState: "on",
      starterVoltage: 12.8,
      starterPower: 320,
    });

    expect(data.rvData.booster.inputPower).toBe(320);
    expect(data.rvData.booster.outputPower).toBe(300);
    expect(
      container.querySelector("#rv-starter-to-booster-flow")?.getAttribute("data-power-watts")
    ).toBe("320");
    expect(
      container.querySelector("#rv-booster-to-dc-bus-flow")?.getAttribute("data-power-watts")
    ).toBe("300");
    expect(container.querySelector('[data-power-watts="20"]')).toBeNull();
    expect(container.querySelector("#rv-booster-node")?.getAttribute("data-active")).toBe("true");
    expect(container.querySelector("#rv-starter-battery")?.textContent).toContain("12.8");
  });

  test("zero booster power hides its node and both flows but keeps the starter battery visible", () => {
    const { container } = renderRvFlowScenario({
      boosterInput: 0,
      boosterOutput: 0,
      boosterState: "off",
      starterVoltage: 12.7,
    });

    expect(container.querySelector("#rv-starter-to-booster-flow")).toBeNull();
    expect(container.querySelector("#rv-booster-to-dc-bus-flow")).toBeNull();
    expect(container.querySelector("#rv-starter-battery")).not.toBeNull();
    expect(container.querySelector("#rv-booster-node")).toBeNull();
  });

  test("booster output contributes to battery charging and the remaining RV load", () => {
    const { container, data } = renderRvFlowScenario({
      boosterInput: 320,
      boosterOutput: 300,
      boosterState: "active",
      starterVoltage: 13.8,
      batteryNet: 250,
    });

    expect(data.rvData.rvDcConsumption).toBe(50);
    expect(
      container.querySelector("#rv-booster-to-dc-bus-flow")?.getAttribute("data-power-watts")
    ).toBe("300");
    expect(
      container.querySelector("#rv-dc-bus-to-cabin-battery-flow")?.getAttribute("data-power-watts")
    ).toBe("250");
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")?.getAttribute("data-power-watts")).toBe(
      "50"
    );
  });

  test.each(["unknown", "unavailable"])(
    "booster output renders safely when status is %s",
    (boosterState) => {
      const { container, data } = renderRvFlowScenario({
        boosterInput: 320,
        boosterOutput: 300,
        boosterState,
        starterVoltage: 13.5,
      });

      expect(data.rvData.booster.state).toBeNull();
      expect(container.querySelector("#rv-booster-to-dc-bus-flow")).not.toBeNull();
      expect(container.querySelector("#rv-starter-to-booster-flow")).not.toBeNull();
    }
  );

  test("configured zero DC load suppresses the RV flow and every zero-line", () => {
    const { container, data } = renderRvFlowScenario({ acOutput: 100, dcPower: 0 });

    expect(data.rvData.loads.dcPowerConfigured).toBe(true);
    expect(data.rvData.rvDcConsumption).toBe(0);
    expect(container.querySelector("#rv-dc-bus-to-rv-flow")).toBeNull();
    expect(container.querySelector("#rv-dc-bus-to-cabin-battery-flow")).toBeNull();
    expect(container.querySelector("#rv-cabin-battery-to-dc-bus-flow")).toBeNull();
  });

  test("RV bubble uses an available DC load override and falls back when it is unavailable", () => {
    const measured = renderRvFlowScenario({ acOutput: 100, solarOutput: 20, dcPower: 42 });
    const unavailable = renderRvFlowScenario({
      acOutput: 100,
      solarOutput: 20,
      dcPower: "unavailable",
    });

    expect(measured.data.rvData.loads.dcPowerConfigured).toBe(true);
    expect(measured.data.rvData.loads.dcPower).toBe(42);
    expect(measured.data.rvData.rvDcConsumption).toBe(42);
    expect(measured.container.querySelector("#home-circle")?.textContent).toContain("42");
    expect(measured.container.querySelector("#home-circle")?.textContent).not.toContain("999");

    expect(unavailable.data.rvData.loads.dcPowerConfigured).toBe(false);
    expect(unavailable.data.rvData.rvDcConsumption).toBe(120);
    expect(unavailable.container.querySelector("#home-circle")?.textContent).toContain("120");
    expect(unavailable.container.querySelector("#home-circle")?.textContent).not.toContain("999");
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

  test("house mode retains the classic single-value grid bubble", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid" } },
    } as PowerFlowCardPlusConfig;
    const { container } = renderCard(config, makeHass({ "sensor.grid": "44" }));

    expect(container.querySelector(".rv-shore-power-values")).toBeNull();
    expect(container.querySelector(".circle-container.grid span.consumption")).not.toBeNull();
    expect(
      container.querySelector(".circle-container.grid span.consumption")?.textContent
    ).toContain("44");
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
      rv: {
        booster: { output_power: "sensor.booster_output" },
        starter_battery: { voltage: "sensor.starter_voltage" },
      },
    } as PowerFlowCardPlusConfig;

    const rv = renderCard(rvConfig, makeHass({ "sensor.grid": "0" }));
    const home = renderCard(homeConfig, makeHass({ "sensor.grid": "0" }));

    expect(rv.container.querySelector("#rv-dc-bus")).not.toBeNull();
    expect(home.container.querySelector("#rv-dc-bus")).toBeNull();
    expect(home.container.querySelector("#rv-booster-node")).toBeNull();
    expect(home.container.querySelector("#rv-starter-battery")).toBeNull();
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
      rv: {
        shore: { input_power: "sensor.shore" },
        ac_charger: { output_power: "sensor.ac_output" },
      },
    } as PowerFlowCardPlusConfig;

    const { container } = renderCard(
      config,
      makeHass({ "sensor.grid": "0", "sensor.shore": "10", "sensor.ac_output": "10" }),
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
      expect(data.grid.state.toBattery).toBe(0);
      expect(data.solar.state.toBattery).toBe(0);
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
    expect(data.grid.state.toBattery).toBe(0);
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
    expect(data.grid.state.toBattery).toBe(0);
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

    expect(data.solar.state.toBattery).toBe(0);
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
        "sensor.ac_power": { state: "204", last_updated: "2026-07-22T10:00:03.000Z" },
        "sensor.ac_voltage": { state: "20", last_updated: "2026-07-22T10:00:01.000Z" },
        "sensor.ac_current": { state: "20", last_updated: "2026-07-22T10:00:02.000Z" },
        "sensor.classic_grid": "0",
      })
    )._computeRenderData();

    expect(data.rvData.acCharger.has).toBe(true);
    expect(data.rvData.acCharger.outputPower).toBe(204);
    expect(data.rvData.acCharger.outputLastUpdated).toBe(Date.parse("2026-07-22T10:00:03.000Z"));
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
        "sensor.booster_voltage": {
          state: "15",
          last_updated: "2026-07-22T10:00:01.000Z",
        },
        "sensor.booster_current": {
          state: "20",
          last_updated: "2026-07-22T10:00:02.000Z",
        },
      })
    )._computeRenderData();

    expect(data.rvData.booster.has).toBe(true);
    expect(data.rvData.booster.outputPower).toBe(300);
    expect(data.rvData.booster.outputLastUpdated).toBe(Date.parse("2026-07-22T10:00:02.000Z"));
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

  test("an explicit top-level RV mode value has presence-based priority", () => {
    const base = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid" } },
    } as PowerFlowCardPlusConfig;
    const hass = makeHass({ "sensor.grid": "0" });

    expect(
      makeCard(
        { ...base, rv_mode: true, main_config: { rv_mode: false } },
        hass
      )._computeRenderData().rvMode
    ).toBe(true);
    expect(
      makeCard(
        { ...base, rv_mode: false, main_config: { rv_mode: true } },
        hass
      )._computeRenderData().rvMode
    ).toBe(false);
    expect(
      makeCard({ ...base, main_config: { rv_mode: true } }, hass)._computeRenderData().rvMode
    ).toBe(true);
    expect(makeCard(base, hass)._computeRenderData().rvMode).toBe(false);
  });

  test("an explicit structured zero stops voltage-current and legacy fallbacks", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.shore" },
        battery: { entity: { production: "sensor.classic_charge" } },
      },
      rv: {
        ac_charger: {
          output_power: "sensor.structured_power",
          output_voltage: "sensor.structured_voltage",
          output_current: "sensor.structured_current",
        },
        house_battery: { charge: "sensor.legacy_charge" },
      },
    } as PowerFlowCardPlusConfig;
    const { card, container } = renderCard(
      config,
      makeHass({
        "sensor.shore": "220",
        "sensor.structured_power": "0",
        "sensor.structured_voltage": "20",
        "sensor.structured_current": "10",
        "sensor.legacy_charge": "150",
        "sensor.classic_charge": "100",
      })
    );
    const data = card._computeRenderData();

    expect(data.rvData.acCharger.outputPower).toBe(0);
    expect(container.querySelector("#rv-shore-dc-bus-flow")).toBeNull();
  });

  test("unavailable structured values fall back without adding legacy sources", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.classic_shore" },
        solar: { entity: "sensor.classic_solar" },
      },
      rv: {
        shore: { input_power: "sensor.new_shore" },
        shore_power: { entity: "sensor.legacy_shore" },
        solar_charger: { output_power: "sensor.new_solar" },
        solar: { entity: "sensor.legacy_solar" },
      },
    } as PowerFlowCardPlusConfig;
    const data = makeCard(
      config,
      makeHass({
        "sensor.new_shore": "unavailable",
        "sensor.legacy_shore": "220",
        "sensor.classic_shore": "330",
        "sensor.new_solar": "unknown",
        "sensor.legacy_solar": "120",
        "sensor.classic_solar": "80",
      })
    )._computeRenderData();

    expect(data.rvData.shore.inputPower).toBe(220);
    expect(data.rvData.solarCharger.outputPower).toBe(120);
  });

  test("legacy-only RV fields still produce normalized runtime data and bus flows", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      main_config: { rv_mode: true },
      entities: {
        grid: { entity: "sensor.classic_grid" },
        solar: { entity: "sensor.classic_solar" },
        battery: {
          entity: {
            production: "sensor.classic_charge",
            consumption: "sensor.classic_discharge",
          },
        },
      },
      rv: {
        shore_power: { entity: "sensor.legacy_shore" },
        solar: { entity: "sensor.legacy_solar" },
        house_battery: {
          charge: "sensor.legacy_charge",
          discharge: "sensor.legacy_discharge",
        },
        dc_load: { entity: "sensor.legacy_dc_load" },
        ac_load: { entity: "sensor.legacy_ac_load" },
        orion: { entity: "sensor.legacy_booster" },
      },
    } as PowerFlowCardPlusConfig;
    const { card, container } = renderCard(
      config,
      makeHass({
        "sensor.classic_grid": "900",
        "sensor.classic_solar": "90",
        "sensor.classic_charge": "80",
        "sensor.classic_discharge": "10",
        "sensor.legacy_shore": "220",
        "sensor.legacy_solar": "120",
        "sensor.legacy_charge": "100",
        "sensor.legacy_discharge": "25",
        "sensor.legacy_dc_load": "45",
        "sensor.legacy_ac_load": "15",
        "sensor.legacy_booster": "30",
      })
    );
    const data = card._computeRenderData();

    expect(data.rvData.shore.inputPower).toBe(220);
    expect(data.rvData.acCharger.outputPower).toBe(100);
    expect(data.rvData.solarCharger.outputPower).toBe(120);
    expect(data.rvData.booster.outputPower).toBe(30);
    expect(data.rvData.cabinBattery.netPower).toBe(75);
    expect(data.rvData.loads.dcPower).toBe(45);
    expect(data.rvData.loads.acPower).toBe(15);
    expect(data.rvData.loads.acPowerConfigured).toBe(true);
    expect(container.querySelector("#rv-shore-total")).not.toBeNull();
    expect(
      container.querySelector("#rv-distribution-to-rv-ac-flow")?.getAttribute("data-power-watts")
    ).toBe("15");
    expect(container.querySelector("#rv-shore-dc-bus-flow")).not.toBeNull();
    expect(container.querySelector("#rv-solar-dc-bus-flow")).not.toBeNull();
    expect(container.querySelector("#rv-booster-to-dc-bus-flow")).not.toBeNull();
    expect(container.querySelector("#grid-home-flow")).toBeNull();
    expect(container.querySelector("#solar-home-flow")).toBeNull();
  });

  test.each([
    { structuredState: "0", expectedAvailable: true },
    { structuredState: "unavailable", expectedAvailable: false },
  ])(
    "structured AC load $structuredState does not fall back to a positive legacy load",
    ({ structuredState, expectedAvailable }) => {
      const config = {
        type: "custom:power-flow-card-plus",
        rv_mode: true,
        entities: { grid: { entity: "sensor.shore" } },
        rv: {
          shore: { input_power: "sensor.shore" },
          loads: { ac_power: "sensor.structured_ac" },
          ac_load: { entity: "sensor.legacy_ac" },
        },
      } as PowerFlowCardPlusConfig;
      const { card, container } = renderCard(
        config,
        makeHass({
          "sensor.shore": "927",
          "sensor.structured_ac": structuredState,
          "sensor.legacy_ac": "850",
        })
      );
      const data = card._computeRenderData();

      expect(data.rvData.loads.acPower).toBe(0);
      expect(data.rvData.loads.acPowerAvailable).toBe(expectedAvailable);
      expect(data.rvData.loads.acEntity).toBe("sensor.structured_ac");
      expect(container.querySelector("#rv-distribution-to-rv-ac-flow")).toBeNull();
    }
  );

  test("a structured starter suppresses only its matching legacy individual", () => {
    const base = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: {
        grid: { entity: "sensor.grid" },
        individual: [
          { entity: "sensor.starter_power", name: "Starter Battery" },
          { entity: "sensor.fridge", name: "Fridge" },
        ],
      },
    } as PowerFlowCardPlusConfig;
    const hass = makeHass({
      "sensor.grid": "0",
      "sensor.starter_power": "25",
      "sensor.fridge": "10",
    });
    const structured = makeCard(
      { ...base, rv: { starter_battery: { power: "sensor.starter_power" } } },
      hass
    )._computeRenderData();
    const legacyOnly = makeCard(base, hass)._computeRenderData();

    expect(structured.rvData.starterBattery.has).toBe(true);
    expect(structured.individualObjs).toHaveLength(1);
    expect(structured.individualObjs[0]?.state).toBe(10);
    expect(legacyOnly.rvData.starterBattery.has).toBe(false);
    expect(legacyOnly.individualObjs).toHaveLength(2);
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
