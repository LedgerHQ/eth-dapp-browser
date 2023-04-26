import { ColorPalette } from "@ledgerhq/ui-shared";

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
  export interface Font {
    weight: number;
    style: string;
  }
  export interface DefaultTheme {
    theme: string;
    sizes: {
      topBarHeight: number;
      sideBarWidth: number;
      drawer: {
        side: {
          big: {
            width: number;
          };
          small: {
            width: number;
          };
        };
        popin: {
          min: {
            height: number;
            width: number;
          };
          max: {
            height: number;
            width: number;
          };
        };
      };
    };
    radii: number[];
    fontFamilies: Record<string, Record<string, Font>>;
    fontSizes: number[];
    space: number[];
    shadows: string[];
    colors: ColorPalette & { palette: ColorPalette };
    fontWeights: Record<string, string>;
    zIndexes: number[];
  }
}

export default defaultTheme;
