const entityField = (name: string, label: string) => ({
  name,
  label,
  selector: { entity: {} },
});

export const rvEditorSchema = [
  {
    name: "shore",
    title: "Shore",
    type: "expandable",
    schema: [entityField("input_power", "Input power")],
  },
  {
    name: "ac_charger",
    title: "AC Charger",
    type: "expandable",
    schema: [
      entityField("state", "State"),
      entityField("input_power", "Input power"),
      entityField("input_voltage", "Input voltage"),
      entityField("input_current", "Input current"),
      entityField("output_power", "Output power"),
      entityField("output_voltage", "Output voltage"),
      entityField("output_current", "Output current"),
    ],
  },
  {
    name: "solar_charger",
    title: "Solar Charger",
    type: "expandable",
    schema: [
      entityField("state", "State"),
      entityField("output_power", "Output power"),
      entityField("output_voltage", "Output voltage"),
      entityField("output_current", "Output current"),
    ],
  },
  {
    name: "booster",
    title: "Booster",
    type: "expandable",
    schema: [
      entityField("state", "State"),
      entityField("input_power", "Input power"),
      entityField("input_voltage", "Input voltage"),
      entityField("input_current", "Input current"),
      entityField("output_power", "Output power"),
      entityField("output_voltage", "Output voltage"),
      entityField("output_current", "Output current"),
    ],
  },
  {
    name: "cabin_battery",
    title: "Cabin Battery",
    type: "expandable",
    schema: [
      entityField("net_power", "Net power"),
      entityField("voltage", "Voltage"),
      entityField("state_of_charge", "State of charge"),
      entityField("charging_state", "Charging state"),
    ],
  },
  {
    name: "starter_battery",
    title: "Starter Battery",
    type: "expandable",
    schema: [entityField("voltage", "Voltage"), entityField("power", "Power")],
  },
  {
    name: "loads",
    title: "Loads",
    type: "expandable",
    schema: [
      entityField("total_power", "Total power"),
      entityField("ac_power", "AC power"),
      entityField("dc_power", "DC power"),
    ],
  },
] as const;
