import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DAPPBrowser } from "../src/DAPPBrowser";
import { ChainConfig } from "../src/DAPPBrowser/types";
import { getFirstValueFromArray } from "../src/helpers";

const DappBrowserPage = (): JSX.Element | null => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Early return if the page is not mounted yet
  if (!mounted) {
    return null;
  }

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

  // Early return if no dapp provided (no dappUrl available in the query)
  if (!dappUrl) {
    return null;
  }

  return (
    <DAPPBrowser
      dappQueryParams={dappQueryParams}
      dappName={dappName}
      dappUrl={dappUrl}
      nanoApp={nanoApp}
      chainConfigs={chainConfigs}
      initialAccountId={initialAccountId}
    />
  );
};

export default DappBrowserPage;
