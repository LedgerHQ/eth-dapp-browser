export const defaultTheme = {
  type: "light",
  colors: {
    background: "#ffffff",
    text: "#142533",
    primary: "#6490F1",
    contrast: "#ffffff",
    alert: "#ea2e49",
    warning: "#ff7701",
  },
};

declare module "styled-components" {
  export interface DefaultTheme {
    type: string;
    colors: {
      background: string;
      text: string;
      primary: string;
      contrast: string;
      alert: string;
      warning: string;
    };
  }
}

export default defaultTheme;
