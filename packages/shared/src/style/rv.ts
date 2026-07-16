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
`;
