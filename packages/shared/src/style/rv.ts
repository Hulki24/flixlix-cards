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

  path.rv-shore-dc-bus-path,
  circle.rv-shore-dc-bus-dot {
    stroke: var(--energy-grid-consumption-color, #488fc2);
  }

  circle.rv-shore-dc-bus-dot {
    fill: var(--energy-grid-consumption-color, #488fc2);
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
