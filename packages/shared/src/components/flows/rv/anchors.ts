export const RV_HORIZONTAL_VIEWBOX_HEIGHT = 8;
export const RV_HORIZONTAL_CENTER_Y = RV_HORIZONTAL_VIEWBOX_HEIGHT / 2;
export const RV_VERTICAL_COLUMN_WIDTH = 80;
export const RV_VERTICAL_COLUMN_CENTER_X = RV_VERTICAL_COLUMN_WIDTH / 2;

export const DISTRIBUTION_AC_RIGHT = { x: 0, y: RV_HORIZONTAL_CENTER_Y } as const;
export const DISTRIBUTION_DC_RIGHT = { x: 0, y: RV_HORIZONTAL_CENTER_Y } as const;
export const DC_BUS_CENTER = {
  horizontal: { x: 50, y: RV_HORIZONTAL_CENTER_Y },
  verticalFromAbove: { x: RV_VERTICAL_COLUMN_CENTER_X, y: 100 },
  verticalFromBelow: { x: RV_VERTICAL_COLUMN_CENTER_X, y: 0 },
} as const;
export const RV_AC_LEFT = { x: 100, y: RV_HORIZONTAL_CENTER_Y } as const;
export const RV_DC_LEFT = { x: 100, y: RV_HORIZONTAL_CENTER_Y } as const;
export const CABIN_BATTERY_TOP = { x: RV_VERTICAL_COLUMN_CENTER_X, y: 100 } as const;
export const SOLAR_BOTTOM = { x: RV_VERTICAL_COLUMN_CENTER_X, y: 0 } as const;
