import { beforeEach, describe, expect, test, vi } from "vitest";

import { generalConfigSchema } from "../src/ui-editor/schema/_schema-all";
import { PowerFlowCardPlusEditor } from "../src/ui-editor/ui-editor";

const { loadHaFormMock } = vi.hoisted(() => ({
  loadHaFormMock: vi.fn(),
}));

vi.mock("@flixlix-cards/shared/ui-editor/utils/load-ha-form", () => ({
  loadHaForm: loadHaFormMock,
}));

describe("power flow ui editor", () => {
  beforeEach(() => {
    loadHaFormMock.mockReset();
  });

  test("connectedCallback triggers ha-form loader", () => {
    const editor = new PowerFlowCardPlusEditor();

    editor.connectedCallback();

    expect(loadHaFormMock).toHaveBeenCalledTimes(1);
  });

  test("general schema exposes RV mode as a boolean switch", () => {
    const rvModeField = generalConfigSchema.find((field) => field.name === "rv_mode");

    expect(rvModeField).toEqual({
      name: "rv_mode",
      label: "RV Mode",
      selector: { boolean: {} },
    });
  });

  test("editor config schema accepts and retains top-level RV mode", async () => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
      rv_mode: true,
    } as any;

    await expect(editor.setConfig(config)).resolves.toBeUndefined();
    expect((editor as any)._config.rv_mode).toBe(true);
  });

  test("editor config schema accepts neutral RV charger and cabin battery fields", async () => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
      rv_mode: true,
      rv: {
        ac_charger: {
          output_power: "sensor.ac_output_power",
          output_voltage: "sensor.ac_output_voltage",
          output_current: "sensor.ac_output_current",
          state: "sensor.ac_state",
        },
        solar_charger: {
          output_power: "sensor.solar_output_power",
          state: "sensor.solar_state",
        },
        booster: {
          output_power: "sensor.booster_output_power",
          output_voltage: "sensor.booster_output_voltage",
          output_current: "sensor.booster_output_current",
          state: "sensor.booster_state",
        },
        cabin_battery: { net_power: "sensor.cabin_battery_net_power" },
      },
    } as any;

    await expect(editor.setConfig(config)).resolves.toBeUndefined();
    expect((editor as any)._config.rv).toEqual(config.rv);
  });

  test("valueChanged preserves RV mode as a top-level boolean", () => {
    const editor = new PowerFlowCardPlusEditor();
    const configChanged = vi.fn();
    editor.addEventListener("config-changed", configChanged);
    (editor as any).hass = { localize: vi.fn() };
    (editor as any)._config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
    };
    (editor as any)._currentConfigPage = null;

    (editor as any)._valueChanged({
      detail: {
        value: {
          type: "custom:power-flow-card-plus",
          entities: { grid: { entity: "sensor.shore" } },
          rv_mode: true,
        },
      },
    });

    const config = configChanged.mock.calls[0]?.[0]?.detail?.config;
    expect(config.rv_mode).toBe(true);
    expect(typeof config.rv_mode).toBe("boolean");
  });

  test("migrateLegacyFields maps legacy power decimal and threshold fields", () => {
    const editor = new PowerFlowCardPlusEditor();
    const configChanged = vi.fn();
    editor.addEventListener("config-changed", configChanged);
    (editor as any)._config = {
      type: "custom:power-flow-card-plus",
      entities: {},
      watt_threshold: 900,
      w_decimals: 1,
      kw_decimals: 2,
    };

    (editor as any)._migrateLegacyFields();

    const config = configChanged.mock.calls[0]?.[0]?.detail?.config;
    expect(config.kilo_threshold).toBe(900);
    expect(config.base_decimals).toBe(1);
    expect(config.kilo_decimals).toBe(2);
    expect(config.watt_threshold).toBeUndefined();
    expect(config.w_decimals).toBeUndefined();
    expect(config.kw_decimals).toBeUndefined();
  });

  test("migrateLegacyIndividualFields moves legacy slots into entities.individual", () => {
    const editor = new PowerFlowCardPlusEditor();
    const configChanged = vi.fn();
    editor.addEventListener("config-changed", configChanged);
    (editor as any)._config = {
      type: "custom:power-flow-card-plus",
      entities: {
        individual: [{ entity: "sensor.existing" }],
        individual1: { entity: "sensor.legacy_1" },
        individual2: [{ entity: "sensor.legacy_2" }, { entity: "sensor.legacy_3" }],
      },
    };

    (editor as any)._migrateLegacyIndividualFields();

    const config = configChanged.mock.calls[0]?.[0]?.detail?.config;
    expect(config.entities.individual).toEqual([
      { entity: "sensor.existing" },
      { entity: "sensor.legacy_1" },
      { entity: "sensor.legacy_2" },
      { entity: "sensor.legacy_3" },
    ]);
    expect(config.entities.individual1).toBeUndefined();
    expect(config.entities.individual2).toBeUndefined();
  });

  test("valueChanged nests updates into current entity page", () => {
    const editor = new PowerFlowCardPlusEditor();
    const configChanged = vi.fn();
    editor.addEventListener("config-changed", configChanged);
    (editor as any).hass = { localize: vi.fn() };
    (editor as any)._config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.old_grid" },
      },
    };
    (editor as any)._currentConfigPage = "grid";

    (editor as any)._valueChanged({
      detail: {
        value: { entity: "sensor.new_grid" },
      },
    });

    const config = configChanged.mock.calls[0]?.[0]?.detail?.config;
    expect(config.entities.grid).toEqual({ entity: "sensor.new_grid" });
  });
});
