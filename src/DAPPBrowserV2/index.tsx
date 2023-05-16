import { useAccounts, useCurrencies } from "@ledgerhq/wallet-api-client-react";
import { useMemo } from "react";
import { Player } from "./Player";
import { ChainConfig, EVMCurrency } from "./types";

type DappBrowserV2Props = {
  dappUrl: string;
  dappName: string;
  nanoApp?: string;
  initialAccountId: string | undefined;
  chainConfigs: ChainConfig[];
  dappQueryParams: { [x: string]: string | string[] | undefined };
};

export function DappBrowserV2(
  props: DappBrowserV2Props
): React.ReactElement | null {
  const { chainConfigs } = props;

  const { accounts, loading: loadingAccounts } = useAccounts();
  const { currencies, loading: loadingCurrencies } = useCurrencies();

  const evmCurrencies = useMemo(() => {
    if (!currencies) {
      return [];
    }

    return currencies.reduce((acc: EVMCurrency[], currency) => {
      const matchingConfig = chainConfigs.find(
        (config) => config.currency === currency.id
      );

      if (matchingConfig) {
        acc.push({
          ...currency,
          chainID: matchingConfig.chainID,
          rpcURL: matchingConfig.nodeURL,
        });
      }
      return acc;
    }, []);
  }, [currencies, chainConfigs]);

  if (loadingAccounts || loadingCurrencies) {
    return null;
  }

  if (!accounts || !currencies) {
    return null;
  }

  return <Player {...props} accounts={accounts} currencies={evmCurrencies} />;
}
