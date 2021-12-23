import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { AppProps } from "next/app";
import Head from "next/head";

import { GlobalStyle } from "../styles/GlobalStyle";
import { StyleProvider } from "@ledgerhq/react-ui";

import "modern-normalize";
import { getQueryVariable } from "../src/helpers";

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  const router = useRouter();

  const themeType = (getQueryVariable("theme", router) || "dark") as
    | "light"
    | "dark";

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />
        <title>Ledger Platform Apps</title>
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <StyleProvider selectedPalette={themeType} fontsPath="/fonts">
        <GlobalStyle />
        <Component {...pageProps} />
      </StyleProvider>
    </>
  );
}
