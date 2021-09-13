import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { DAPPBrowser } from "../src/DAPPBrowser";
import { ChainConfig } from "../src/DAPPBrowser/types";
import { getQueryVariable } from "../src/helpers";

function DappBrowserPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const theme = getQueryVariable("theme", router);
  const isMock = getQueryVariable("mock", router) === "true";
  const initialAccountId = getQueryVariable("accountId", router);
  const rawParams = getQueryVariable("params", router);

  const params = rawParams ? JSON.parse(rawParams) : {};
  const chainConfigs: ChainConfig[] = params.networks;
  const nanoApp = params.nanoApp;
  const dappUrl = params.dappUrl;
  const dappName = params.dappName || "DApp";

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (mounted) {
    return dappUrl ? (
      <DAPPBrowser
        dappName={dappName}
        dappUrl={dappUrl}
        nanoApp={nanoApp}
        theme={theme}
        chainConfigs={chainConfigs}
        mock={isMock}
        initialAccountId={initialAccountId}
      />
    ) : null;
  }
  return null;
}

export default DappBrowserPage;
