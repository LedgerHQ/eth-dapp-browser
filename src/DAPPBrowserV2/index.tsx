import {
  useAccounts,
  useCurrencies,
  useWalletAPIClient,
} from "@ledgerhq/wallet-api-client-react";
import { useEffect, useMemo } from "react";
import { Player } from "./Player";
import { ChainConfig, EVMCurrency } from "./types";
import { useAnalytics } from "../useAnalytics";
import { useRouter } from "next/router";

type DappBrowserV2Props = {
  dappUrl: string;
  dappName: string;
  nanoApp?: string;
  initialAccountId: string | undefined;
  chainConfigs: ChainConfig[];
  dappQueryParams: {
    [x: string]: string | string[] | undefined;
  };
};

export function DappBrowserV2(
  props: DappBrowserV2Props
): React.ReactElement | null {
  const { chainConfigs } = props;

  const {
    accounts,
    loading: loadingAccounts,
    updateData: updateAccounts,
  } = useAccounts();
  const { currencies, loading: loadingCurrencies } = useCurrencies();
  const router = useRouter();

  const { init, page } = useAnalytics();
  const { client } = useWalletAPIClient();

  useEffect(() => {
    if (!client) {
      return;
    }
    init(
      {
        dappName: props.dappName,
      },
      { ip: "0.0.0.0" }
    ).then(() => void page(router.pathname));
  }, [client]);

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

  return (
    <Player
      {...props}
      accounts={accounts}
      updateAccounts={updateAccounts}
      currencies={evmCurrencies}
    />
  );
}
