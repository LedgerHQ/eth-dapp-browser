import styled, { css } from "styled-components";

const desktopMQ = `@media only screen and (min-width: 600px)`;
const mobileMQ = `@media only screen and (max-width: 600px)`;

const DappBrowserControlBar = styled.div`
  box-sizing: border-box;
  padding: 12px 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;

  ${(p: { desktop?: boolean; mobile?: boolean }) =>
    p.desktop &&
    css`
      ${mobileMQ} {
        display: none;
      }
    `}

  ${(p: { desktop?: boolean; mobile?: boolean }) =>
    p.mobile &&
    css`
      ${desktopMQ} {
        display: none;
      }
    `}

${mobileMQ} {
    padding: 12px;
    border-top: 1px solid
      ${(p) =>
        p.theme.theme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(20, 37, 51, 0.1)"};
  }
  ${desktopMQ} {
    border-bottom: 1px solid
      ${(p) =>
        p.theme.theme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(20, 37, 51, 0.1)"};
  }
`;

export default DappBrowserControlBar;
