import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

export function resolveRvMode(
  config: Pick<FlowCardPlusConfig, "rv_mode" | "main_config">
): boolean {
  if (Object.prototype.hasOwnProperty.call(config, "rv_mode")) {
    return config.rv_mode === true;
  }

  return config.main_config?.rv_mode === true;
}
