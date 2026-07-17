import { render as renderTemplate } from "lit";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { generalConfigSchema } from "../src/ui-editor/schema/_schema-all";
import { rvEditorSchema } from "../src/ui-editor/schema/rv";
import { PowerFlowCardPlusEditor } from "../src/ui-editor/ui-editor";

const { loadHaFormMock } = vi.hoisted(() => ({
  loadHaFormMock: vi.fn(),
}));

vi.mock("@flixlix-cards/shared/ui-editor/utils/load-ha-form", () => ({
  loadHaForm: loadHaFormMock,
}));

async function renderEditor(config: Record<string, unknown>, currentPage: string | null = null) {
  const editor = new PowerFlowCardPlusEditor();
  (editor as any).hass = { localize: vi.fn(() => undefined) };
  await editor.setConfig(config as any);
  (editor as any)._currentConfigPage = currentPage;
  const container = document.createElement("div");
  renderTemplate((editor as any).render(), container);
  return { editor, container };
}

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

  test("RV editor exposes every neutral group in the intended order", () => {
    expect(rvEditorSchema.map((group) => group.name)).toEqual([
      "shore",
      "ac_charger",
      "solar_charger",
      "booster",
      "cabin_battery",
      "starter_battery",
      "loads",
    ]);
    expect(rvEditorSchema.map((group) => group.title)).toEqual([
      "Shore",
      "AC Charger",
      "Solar Charger",
      "Booster",
      "Cabin Battery",
      "Starter Battery",
      "Loads",
    ]);
    expect(rvEditorSchema.every((group) => group.type === "expandable")).toBe(true);
    expect(
      rvEditorSchema.every((group) => group.schema.every((field) => "entity" in field.selector))
    ).toBe(true);
    expect(JSON.stringify(rvEditorSchema)).not.toMatch(/Victron|Orion|IP22|Shelly/i);
  });

  test("RV group fields cover the complete structured configuration", () => {
    const fields = Object.fromEntries(
      rvEditorSchema.map((group) => [group.name, group.schema.map((field) => field.name)])
    );

    expect(fields).toEqual({
      shore: ["input_power"],
      ac_charger: [
        "state",
        "input_power",
        "input_voltage",
        "input_current",
        "output_power",
        "output_voltage",
        "output_current",
      ],
      solar_charger: ["state", "output_power", "output_voltage", "output_current"],
      booster: [
        "state",
        "input_power",
        "input_voltage",
        "input_current",
        "output_power",
        "output_voltage",
        "output_current",
      ],
      cabin_battery: ["net_power", "voltage", "state_of_charge", "charging_state"],
      starter_battery: ["voltage", "power"],
      loads: ["total_power", "ac_power", "dc_power"],
    });
  });

  test("RV editor link is hidden in house mode while Classic entity pages remain available", async () => {
    const { container } = await renderEditor({
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid" } },
    });

    expect(container.querySelector('link-subpage[path="rv"]')).toBeNull();
    expect(container.querySelector('link-subpage[path="grid"]')).not.toBeNull();
    expect(container.querySelector('link-subpage[path="solar"]')).not.toBeNull();
    expect(container.querySelector('link-subpage[path="battery"]')).not.toBeNull();
    expect(container.querySelector('link-subpage[path="home"]')).not.toBeNull();
  });

  test.each([
    { rv_mode: true },
    { main_config: { rv_mode: true } },
    { rv: {} },
    { rv: { shore: { input_power: "sensor.shore" } } },
  ])("RV editor link is visible for an active or configured RV card", async (rvConfig) => {
    const { container } = await renderEditor({
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.grid" } },
      ...rvConfig,
    });

    expect(container.querySelector('link-subpage[path="rv"]')).not.toBeNull();
  });

  test("RV subpage uses the structured schema and displays all help texts", async () => {
    const config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.grid" } },
      rv: { shore: { input_power: "sensor.shore" } },
    };
    const { container } = await renderEditor(config, "rv");
    const form = container.querySelector("ha-form") as any;
    const help = container.querySelector(".rv-editor-help")?.textContent ?? "";

    expect(form.schema).toBe(rvEditorSchema);
    expect(form.data).toEqual(config.rv);
    expect(help).toContain("Power entities take precedence over voltage × current");
    expect(help).toContain("positive means charging, negative means discharging");
    expect(help).toContain("overrides the internal DC consumption calculation");
    expect(help).toContain("Conversion losses are not rendered as an energy flow");
  });

  test("RV entity selector values are stored as nested entity IDs", () => {
    const editor = new PowerFlowCardPlusEditor();
    const configChanged = vi.fn();
    editor.addEventListener("config-changed", configChanged);
    (editor as any).hass = { localize: vi.fn() };
    (editor as any)._config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.grid" } },
    };
    (editor as any)._currentConfigPage = "rv";

    (editor as any)._valueChanged({
      detail: {
        value: {
          shore: { input_power: "sensor.shore_input" },
          booster: { output_power: "sensor.booster_output" },
        },
      },
    });

    const config = configChanged.mock.calls[0]?.[0]?.detail?.config;
    expect(config.rv).toEqual({
      shore: { input_power: "sensor.shore_input" },
      booster: { output_power: "sensor.booster_output" },
    });
    expect(config.rv_mode).toBe(true);
    expect(config.entities.grid).toEqual({ entity: "sensor.grid" });
  });

  test("empty optional RV fields and empty groups are omitted", () => {
    const editor = new PowerFlowCardPlusEditor();
    const configChanged = vi.fn();
    editor.addEventListener("config-changed", configChanged);
    (editor as any).hass = { localize: vi.fn() };
    (editor as any)._config = {
      type: "custom:power-flow-card-plus",
      rv_mode: true,
      entities: { grid: { entity: "sensor.grid" } },
      rv: { shore: { input_power: "sensor.old_shore" } },
    };
    (editor as any)._currentConfigPage = "rv";

    (editor as any)._valueChanged({
      detail: {
        value: {
          shore: { input_power: "" },
          ac_charger: { state: undefined, output_power: "sensor.ac_output" },
          booster: {},
          loads: { dc_power: null },
        },
      },
    });

    const config = configChanged.mock.calls[0]?.[0]?.detail?.config;
    expect(config.rv).toEqual({ ac_charger: { output_power: "sensor.ac_output" } });
  });

  test.each([{ rv_mode: true }, { main_config: { rv_mode: true } }])(
    "editor config schema accepts and retains RV mode",
    async (modeConfig) => {
      const editor = new PowerFlowCardPlusEditor();
      const config = {
        type: "custom:power-flow-card-plus",
        entities: { grid: { entity: "sensor.shore" } },
        ...modeConfig,
      } as any;

      await expect(editor.setConfig(config)).resolves.toBeUndefined();
      expect((editor as any)._config).toMatchObject(modeConfig);
    }
  );

  test("editor config schema accepts the complete neutral RV structure", async () => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
      rv_mode: true,
      rv: {
        shore: {
          input_power: "sensor.shore_input_power",
        },
        ac_charger: {
          state: "sensor.ac_state",
          input_power: "sensor.ac_input_power",
          input_voltage: "sensor.ac_input_voltage",
          input_current: "sensor.ac_input_current",
          output_power: "sensor.ac_output_power",
          output_voltage: "sensor.ac_output_voltage",
          output_current: "sensor.ac_output_current",
        },
        solar_charger: {
          state: "sensor.solar_state",
          output_power: "sensor.solar_output_power",
          output_voltage: "sensor.solar_output_voltage",
          output_current: "sensor.solar_output_current",
        },
        booster: {
          state: "sensor.booster_state",
          input_power: "sensor.booster_input_power",
          input_voltage: "sensor.booster_input_voltage",
          input_current: "sensor.booster_input_current",
          output_power: "sensor.booster_output_power",
          output_voltage: "sensor.booster_output_voltage",
          output_current: "sensor.booster_output_current",
        },
        cabin_battery: {
          net_power: "sensor.cabin_battery_net_power",
          voltage: "sensor.cabin_battery_voltage",
          state_of_charge: "sensor.cabin_battery_soc",
          charging_state: "binary_sensor.cabin_battery_charging",
        },
        starter_battery: {
          voltage: "sensor.starter_battery_voltage",
          power: "sensor.starter_battery_power",
        },
        loads: {
          total_power: "sensor.rv_total_power",
          ac_power: "sensor.rv_ac_power",
          dc_power: "sensor.rv_dc_power",
        },
      },
    } as any;

    await expect(editor.setConfig(config)).resolves.toBeUndefined();
    expect((editor as any)._config.rv).toEqual(config.rv);
  });

  test.each([
    { rv: {} },
    { rv: { shore: { input_power: "sensor.shore" } } },
    { rv: { cabin_battery: { net_power: "sensor.battery_net" } } },
    { rv: { loads: { dc_power: "sensor.rv_dc_load" } } },
  ])("neutral RV subgroups are independently optional", async (partialConfig) => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
      rv_mode: true,
      ...partialConfig,
    } as any;

    await expect(editor.setConfig(config)).resolves.toBeUndefined();
  });

  test.each([
    { shore: { input_power: 42 } },
    { ac_charger: { output_power: "not-an-entity" } },
    { solar_charger: "sensor.solar" },
    { booster: { input_current: false } },
    { cabin_battery: { charging_state: "invalid" } },
    { starter_battery: { voltage: ["sensor.voltage"] } },
    { loads: { total_power: { entity: "sensor.loads" } } },
  ])("invalid neutral RV field types or entity IDs are rejected", async (rv) => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
      rv_mode: true,
      rv,
    } as any;

    await expect(editor.setConfig(config)).rejects.toThrow();
  });

  test("existing legacy RV YAML remains valid", async () => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: { grid: { entity: "sensor.shore" } },
      rv_mode: true,
      rv: {
        shore_power: { entity: "sensor.shore" },
        solar: { entity: "sensor.solar" },
        house_battery: {
          charge: "sensor.battery_charge",
          discharge: "sensor.battery_discharge",
          soc: "sensor.battery_soc",
        },
        starter_battery: {
          voltage: "sensor.starter_voltage",
          current: "sensor.starter_current",
          power: "sensor.starter_power",
        },
        dc_load: { entity: "sensor.dc_load" },
        ac_load: { entity: "sensor.ac_load" },
        inverter: { entity: "sensor.inverter" },
        orion: { entity: "sensor.orion" },
      },
    } as any;

    await expect(editor.setConfig(config)).resolves.toBeUndefined();
    expect((editor as any)._config.rv).toEqual(config.rv);
  });

  test("existing Classic config remains valid without an RV block", async () => {
    const editor = new PowerFlowCardPlusEditor();
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        solar: { entity: "sensor.solar" },
        battery: { entity: "sensor.battery" },
        home: { entity: "sensor.home" },
      },
    } as any;

    await expect(editor.setConfig(config)).resolves.toBeUndefined();
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
