import { css } from "lit";

export const rvStyles = css`
  .card-content:has(.rv-dc-bus-container) {
    --rv-top-row-circle-bottom-y: 100px;
    --rv-main-row-top-y: 130px;
    --rv-circle-radius: 40px;
    --rv-ac-flow-center-y: 157px;
    --rv-dc-bus-offset-y: 23px;
    --rv-dc-bus-center-y: calc(
      var(--rv-main-row-top-y) + var(--rv-circle-radius) + var(--rv-dc-bus-offset-y)
    );
    --rv-cabin-battery-top-y: 240px;
  }

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
    transform: translateY(var(--rv-dc-bus-offset-y));
  }

  .rv-flow-lines {
    position: absolute;
    z-index: 1;
    box-sizing: border-box;
    padding: 0;
    pointer-events: none;
  }

  .rv-flow-lines svg {
    position: static;
    display: block;
    width: 100%;
    max-width: none;
    height: 100%;
    overflow: visible;
  }

  .rv-horizontal-flow-lines {
    right: var(--size-circle-entity);
    left: var(--size-circle-entity);
    width: auto;
    height: 8px;
  }

  .rv-distribution-ac-flow-lines {
    top: calc(var(--rv-ac-flow-center-y) - 4px);
  }

  .rv-dc-source-flow-lines,
  .rv-dc-load-flow-lines {
    top: calc(var(--rv-dc-bus-center-y) - 4px);
  }

  .rv-middle-column-flow-lines,
  .rv-battery-column-flow-lines {
    left: calc(50% - var(--rv-circle-radius));
    width: var(--size-circle-entity);
  }

  .rv-solar-dc-bus-flow-lines {
    top: var(--rv-top-row-circle-bottom-y);
    height: calc(var(--rv-dc-bus-center-y) - var(--rv-top-row-circle-bottom-y));
  }

  .rv-battery-column-flow-lines {
    top: var(--rv-dc-bus-center-y);
    height: calc(var(--rv-cabin-battery-top-y) - var(--rv-dc-bus-center-y));
  }

  .rv-booster-to-dc-bus-flow-lines {
    top: var(--rv-dc-bus-center-y);
    right: 50%;
    bottom: 100px;
    left: 33%;
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
