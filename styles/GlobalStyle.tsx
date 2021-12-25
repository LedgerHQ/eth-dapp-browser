/* eslint-disable no-unused-expressions */

import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  html,
  body {
    background-color: ${(p) => p.theme.colors.background.main};
    color: ${(p) => p.theme.colors.neutral.c80};
    padding: 0;
    margin: 0;
  }
  
  a {
    color: inherit;
    text-decoration: none;
  }
  
  * {
    box-sizing: border-box;
  }
  
  html,
  body,
  div#__next {
    height: 100%;
  }
`;
