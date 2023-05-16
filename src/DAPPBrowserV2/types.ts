import { Currency } from "@ledgerhq/wallet-api-client";
export type ChainConfig = {
  currency: string;
  nodeURL: string;
  chainID: number;
};

export type EVMCurrency = Currency & {
  chainID: number;
  rpcURL: string;
};
