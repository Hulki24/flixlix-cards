import { css } from "lit";

export const rvStyles = css`
  .rv-dc-bus-container {
    position: relative;
    z-index: 2;
    width: var(--size-circle-entity);
    min-width: var(--size-circle-entity);
    height: var(--size-circle-entity);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transform: translateY(23px);
  }

  .rv-dc-bus-node {
    width: 10px;
    height: 10px;
    box-sizing: border-box;
    border: 2px solid var(--secondary-text-color, #727272);
    border-radius: 50%;
    background: var(--card-background-color, var(--ha-card-background, #fff));
    box-shadow: 0 0 0 2px var(--card-background-color, var(--ha-card-background, #fff));
    opacity: 0.6;
  }

  .rv-dc-bus-node--active {
    background: var(--secondary-text-color, #727272);
    opacity: 0.85;
  }

  .rv-dc-bus-node--narrow {
    width: 8px;
    height: 8px;
  }

  .rv-starter-battery {
    height: 110px;
    justify-content: flex-end;
  }

  .rv-starter-battery .circle {
    border-color: var(--energy-starter-battery-color, var(--energy-battery-out-color, #4db6ac));
  }

  .rv-starter-battery ha-icon {
    color: var(--energy-starter-battery-color, var(--energy-battery-out-color, #4db6ac));
  }

  .rv-booster-node-container {
    position: absolute;
    z-index: 3;
    left: calc(33% - 7px);
    bottom: 93px;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .rv-booster-node-container--narrow {
    left: calc(32% - 6px);
    width: 12px;
    height: 12px;
  }

  .rv-booster-node {
    width: 10px;
    height: 10px;
    box-sizing: border-box;
    border: 2px solid var(--energy-booster-color, var(--primary-color, #03a9f4));
    border-radius: 2px;
    background: var(--card-background-color, var(--ha-card-background, #fff));
    opacity: 0.55;
  }

  .rv-booster-node--active {
    background: var(--energy-booster-color, var(--primary-color, #03a9f4));
    opacity: 0.9;
  }

  path.rv-starter-to-booster-path,
  circle.rv-starter-to-booster-dot,
  path.rv-booster-to-dc-bus-path,
  circle.rv-booster-to-dc-bus-dot {
    stroke: var(--energy-booster-color, var(--primary-color, #03a9f4));
  }

  circle.rv-starter-to-booster-dot,
  circle.rv-booster-to-dc-bus-dot {
    fill: var(--energy-booster-color, var(--primary-color, #03a9f4));
    stroke-width: 4;
  }

  path.rv-shore-dc-bus-path,
  circle.rv-shore-dc-bus-dot {
    stroke: var(--energy-grid-consumption-color, #488fc2);
  }

  circle.rv-shore-dc-bus-dot {
    fill: var(--energy-grid-consumption-color, #488fc2);
    stroke-width: 4;
  }

  path.rv-shore-distribution-path,
  circle.rv-shore-distribution-dot,
  path.rv-distribution-to-rv-ac-path,
  circle.rv-distribution-to-rv-ac-dot {
    stroke: var(--rv-ac-power-color, #d32f2f);
  }

  circle.rv-shore-distribution-dot,
  circle.rv-distribution-to-rv-ac-dot {
    fill: var(--rv-ac-power-color, #d32f2f);
    stroke-width: 4;
  }

  path.rv-solar-dc-bus-path,
  circle.rv-solar-dc-bus-dot {
    stroke: var(--energy-solar-color, #ff9800);
  }

  circle.rv-solar-dc-bus-dot {
    fill: var(--energy-solar-color, #ff9800);
    stroke-width: 4;
  }

  path.rv-dc-bus-to-cabin-battery-path,
  circle.rv-dc-bus-to-cabin-battery-dot {
    stroke: var(--energy-battery-in-color, #f06292);
  }

  circle.rv-dc-bus-to-cabin-battery-dot {
    fill: var(--energy-battery-in-color, #f06292);
    stroke-width: 4;
  }

  path.rv-cabin-battery-to-dc-bus-path,
  circle.rv-cabin-battery-to-dc-bus-dot {
    stroke: var(--energy-battery-out-color, #4db6ac);
  }

  circle.rv-cabin-battery-to-dc-bus-dot {
    fill: var(--energy-battery-out-color, #4db6ac);
    stroke-width: 4;
  }

  path.rv-dc-bus-to-rv-path,
  circle.rv-dc-bus-to-rv-dot {
    stroke: var(--energy-rv-load-color, var(--primary-color, #03a9f4));
  }

  circle.rv-dc-bus-to-rv-dot {
    fill: var(--energy-rv-load-color, var(--primary-color, #03a9f4));
    stroke-width: 4;
  }
`;
