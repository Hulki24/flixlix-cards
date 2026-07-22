import localize from "@flixlix-cards/shared/i18n";
import { secondaryInfoSchema } from "@flixlix-cards/shared/ui-editor/schema/_schema-base";

const entityField = (name: string, label: string) => ({
  name,
  label,
  selector: { entity: {} },
});

const decimalsField = {
  name: "decimals",
  label: localize("editor.decimals"),
  selector: { number: { mode: "box", min: 0, max: 10, step: 1 } },
} as const;

const unitField = {
  name: "unit_of_measurement",
  label: localize("editor.unit_of_measurement"),
  selector: { text: {} },
} as const;

const commonDisplayFields = [
  { name: "name", label: localize("editor.name"), selector: { text: {} } },
  { name: "icon", label: localize("editor.icon"), selector: { icon: {} } },
  decimalsField,
  unitField,
] as const;

const secondaryInfoField = {
  name: "secondary_info",
  title: localize("editor.secondary_info"),
  type: "expandable",
  schema: secondaryInfoSchema,
} as const;

const displayZeroField = {
  name: "display_zero",
  label: localize("editor.display_zero"),
  selector: { boolean: {} },
} as const;

const colorValueField = {
  name: "color_value",
  label: localize("editor.color_value"),
  selector: { boolean: {} },
} as const;

const batteryFlowColors = {
  name: "color",
  title: localize("editor.color"),
  type: "expandable",
  schema: [
    {
      name: "production",
      label: localize("editor.rv_battery_input_color"),
      selector: { color_rgb: {} },
    },
    {
      name: "consumption",
      label: localize("editor.rv_battery_output_color"),
      selector: { color_rgb: {} },
    },
  ],
} as const;

const displayGroup = (schema: readonly unknown[]) => ({
  name: "display",
  title: localize("editor.rv_display_options"),
  type: "expandable",
  schema,
});

const starterSecondaryInfo = {
  name: "secondary_info",
  title: localize("editor.secondary_info"),
  type: "expandable",
  schema: [decimalsField, unitField, displayZeroField],
} as const;

const shoreTotalSecondaryInfo = {
  name: "secondary_info",
  title: localize("editor.secondary_info"),
  type: "expandable",
  schema: [
    entityField("entity", localize("editor.entity")),
    { name: "icon", label: localize("editor.icon"), selector: { icon: {} } },
    decimalsField,
    unitField,
    {
      name: "unit_white_space",
      label: localize("editor.unit_white_space"),
      selector: { boolean: {} },
    },
    displayZeroField,
  ],
} as const;

const shoreTotalDisplay = {
  name: "total_display",
  title: localize("editor.rv_shore_total_display"),
  type: "expandable",
  schema: [
    ...commonDisplayFields,
    { name: "color", label: localize("editor.color"), selector: { color_rgb: {} } },
    displayZeroField,
    shoreTotalSecondaryInfo,
  ],
} as const;

const distributionDisplay = {
  name: "distribution_display",
  title: localize("editor.rv_distribution_display"),
  type: "expandable",
  schema: [
    { name: "name", label: localize("editor.name"), selector: { text: {} } },
    { name: "icon", label: localize("editor.icon"), selector: { icon: {} } },
    decimalsField,
    displayZeroField,
    { name: "color", label: localize("editor.color"), selector: { color_rgb: {} } },
  ],
} as const;

export const rvEditorSchema = [
  {
    name: "shore",
    title: localize("editor.rv_shore"),
    type: "expandable",
    schema: [
      entityField("input_power", localize("editor.rv_input_power")),
      shoreTotalDisplay,
      distributionDisplay,
    ],
  },
  {
    name: "ac_charger",
    title: localize("editor.rv_ac_charger"),
    type: "expandable",
    schema: [
      entityField("state", localize("editor.rv_state")),
      entityField("input_power", localize("editor.rv_input_power")),
      entityField("input_voltage", localize("editor.rv_input_voltage")),
      entityField("input_current", localize("editor.rv_input_current")),
      entityField("output_power", localize("editor.rv_output_power")),
      entityField("output_voltage", localize("editor.rv_output_voltage")),
      entityField("output_current", localize("editor.rv_output_current")),
    ],
  },
  {
    name: "solar_charger",
    title: localize("editor.rv_solar_charger"),
    type: "expandable",
    schema: [
      entityField("state", localize("editor.rv_state")),
      entityField("output_power", localize("editor.rv_output_power")),
      entityField("output_voltage", localize("editor.rv_output_voltage")),
      entityField("output_current", localize("editor.rv_output_current")),
      displayGroup([
        ...commonDisplayFields,
        colorValueField,
        displayZeroField,
        { name: "color", label: localize("editor.color"), selector: { color_rgb: {} } },
        secondaryInfoField,
      ]),
    ],
  },
  {
    name: "booster",
    title: localize("editor.rv_booster"),
    type: "expandable",
    schema: [
      entityField("state", localize("editor.rv_state")),
      entityField("input_power", localize("editor.rv_input_power")),
      entityField("input_voltage", localize("editor.rv_input_voltage")),
      entityField("input_current", localize("editor.rv_input_current")),
      entityField("output_power", localize("editor.rv_output_power")),
      entityField("output_voltage", localize("editor.rv_output_voltage")),
      entityField("output_current", localize("editor.rv_output_current")),
      { name: "color", label: localize("editor.color"), selector: { color_rgb: {} } },
    ],
  },
  {
    name: "cabin_battery",
    title: localize("editor.rv_cabin_battery"),
    type: "expandable",
    schema: [
      entityField("net_power", localize("editor.rv_net_power")),
      entityField("voltage", localize("editor.rv_voltage")),
      entityField("state_of_charge", localize("editor.state_of_charge")),
      entityField("charging_state", localize("editor.rv_charging_state")),
      displayGroup([
        ...commonDisplayFields,
        colorValueField,
        displayZeroField,
        batteryFlowColors,
        {
          name: "state_of_charge_decimals",
          label: localize("editor.state_of_charge_decimals"),
          selector: { number: { mode: "box", min: 0, max: 4, step: 1 } },
        },
        {
          name: "state_of_charge_unit",
          label: localize("editor.state_of_charge_unit"),
          selector: { text: {} },
        },
        {
          name: "show_state_of_charge",
          label: localize("editor.show_state_of_charge"),
          selector: { boolean: {} },
        },
      ]),
    ],
  },
  {
    name: "starter_battery",
    title: localize("editor.rv_starter_battery"),
    type: "expandable",
    schema: [
      entityField("voltage", localize("editor.rv_voltage")),
      entityField("power", localize("editor.rv_power")),
      ...commonDisplayFields,
      { name: "color", label: localize("editor.color"), selector: { color_rgb: {} } },
      starterSecondaryInfo,
    ],
  },
  {
    name: "loads",
    title: localize("editor.rv_loads"),
    type: "expandable",
    schema: [
      entityField("total_power", localize("editor.rv_total_power")),
      entityField("ac_power", localize("editor.rv_ac_power")),
      entityField("dc_power", localize("editor.rv_dc_power")),
      displayGroup([...commonDisplayFields, colorValueField, displayZeroField, secondaryInfoField]),
    ],
  },
] as const;
