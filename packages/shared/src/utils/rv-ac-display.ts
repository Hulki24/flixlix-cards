export const DEFAULT_RV_AC_MINIMUM_POWER = 0;

interface RvAcDisplayConfig {
  rv?: {
    loads?: {
      ac_display?: {
        minimum_power?: number;
      };
    };
  };
}

export function getRvAcMinimumPower(config: unknown): number {
  const configured = (config as RvAcDisplayConfig)?.rv?.loads?.ac_display?.minimum_power;
  return typeof configured === "number" && Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_RV_AC_MINIMUM_POWER;
}

export function getVisibleRvAcPower(config: unknown, rawPower: number): number {
  const power = Number.isFinite(rawPower) ? Math.max(rawPower, 0) : 0;
  return power >= getRvAcMinimumPower(config) ? power : 0;
}
