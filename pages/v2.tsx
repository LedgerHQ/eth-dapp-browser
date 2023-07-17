import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ChainConfig } from "../src/DAPPBrowser/types";
import { DappBrowserV2 } from "../src/DAPPBrowserV2";
import { getFirstValueFromArray } from "../src/helpers";
import { Transport, WindowMessageTransport } from "@ledgerhq/wallet-api-client";
import { WalletAPIProvider } from "@ledgerhq/wallet-api-client-react";

function getWalletAPITransport(): Transport {
  if (typeof window === "undefined") {
    return {
      onMessage: undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      send: () => {},
    };
  }
  const transport = new WindowMessageTransport();
  transport.connect();
  return transport;
}

const transport = getWalletAPITransport();

const DappBrowserPage = (): JSX.Element | null => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  /**
   * We segregate the dapp browser specific query params from the dapp query params.
   */
  const {
    params: dappBrowserParams,
    accountId,
    ...dappQueryParams
  } = router.query;

  /**
   * We process the dapp browser specific query params.
   */
  /**
   * TODO: Handle the case where the dapp provides and uses query params also used by the dapp browser.
   * Example: if the dapp provides a query param named "accountId" and the dapp browser also uses this query param
   * As of today,only the first value will be taken into account and the rest will be discarded.
   * Also, the values used by the dapp browser will not (and should not) be
   * forwarded to the dapp (like params used by the dapp browser itself, or other
   * live specific params such as accountId).
   */
  const rawParams = getFirstValueFromArray(dappBrowserParams);
  const initialAccountId = getFirstValueFromArray(accountId);

  const params = rawParams ? JSON.parse(rawParams) : {};

  const {
    networks: chainConfigs,
    nanoApp,
    dappUrl,
    dappName = "DApp",
  }: {
    networks: ChainConfig[];
    nanoApp: string;
    dappUrl: string;
    dappName: string;
  } = params;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, [dappName, router]);

  // Early return if the page is not mounted yet
  if (!mounted) {
    return null;
  }

  return (
    <WalletAPIProvider transport={transport}>
      <>
        {dappUrl ? (
          <DappBrowserV2
            dappQueryParams={dappQueryParams}
            dappName={dappName}
            dappUrl={dappUrl}
            nanoApp={nanoApp}
            chainConfigs={chainConfigs}
            initialAccountId={initialAccountId}
          />
        ) : null}
      </>
    </WalletAPIProvider>
  );
};

export default DappBrowserPage;
