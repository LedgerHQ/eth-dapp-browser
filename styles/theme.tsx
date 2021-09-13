export type ThemeType = typeof defaultTheme; // This is the type definition for my theme object.

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
  type DefaultTheme = ThemeType;
}

export default defaultTheme;
