/* eslint-disable no-console */
import { Button, Flex, Text } from "@ledgerhq/react-ui";
import { Account } from "@ledgerhq/wallet-api-client";
import {
  useRequestAccount,
  useWalletAPIClient,
} from "@ledgerhq/wallet-api-client-react";
import axios from "axios";
import {
  JSONRPC,
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "json-rpc-2.0";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import AccountRequest from "../components/AccountRequest";
import ControlBar from "../components/ControlBar";
import { useAnalytics } from "../useAnalytics";
import {
  compareEVMAddresses,
  convertEthToLiveTX,
  stripHexPrefix,
} from "./helper";
import { SmartWebsocket } from "./SmartWebsocket";
import { EVMCurrency } from "./types";

const AppLoaderPageContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;

  &.overlay-enter {
    opacity: 1;
  }
  &.overlay-enter-active {
    opacity: 0;
    transition: opacity 300ms;
  }
  &.overlay-enter-done {
    display: none;
    opacity: 0;
  }
  &.overlay-exit {
    opacity: 0;
  }
  &.overlay-exit-active {
    opacity: 1;
    transition: opacity 200ms;
  }
  &.overlay-exit-done {
    opacity: 1;
  }
`;

const DappContainer = styled.div`
  width: 100%;
  flex: 1;
  position: relative;
`;

const DappIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: 0;
`;

type DAPPBrowserProps = {
  dappUrl: string;
  dappName: string;
  nanoApp?: string;
  dependencies?: string[];
  updateAccounts: () => Promise<void>;
  initialAccountId: string | undefined;
  dappQueryParams: { [x: string]: string | string[] | undefined };
  accounts: Account[];
  currencies: EVMCurrency[];
};

function getStoredAccountId() {
  try {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("accountId");
    }
  } catch (error) {
    // do nothing
  }
  return null;
}

function saveStoredAccountId(accountId: string) {
  try {
    if (typeof window !== "undefined") {
      return window.localStorage.setItem("accountId", accountId);
    }
  } catch (error) {
    // do nothing
  }
}

export function Player({
  dappUrl,
  nanoApp,
  dependencies,
  initialAccountId,
  dappQueryParams,
  accounts,
  updateAccounts,
  currencies,
}: DAPPBrowserProps): React.ReactElement {
  const previousAddressRef = useRef<string | null>(null);
  const previousChainIdRef = useRef<number | null>(null);

  const { requestAccount, account: userRequestedAccount } = useRequestAccount();

  const { client } = useWalletAPIClient();

  const { track } = useAnalytics();

  const currentAccount = useMemo(() => {
    const initialAccount = initialAccountId
      ? accounts.find((account) => account.id === initialAccountId)
      : undefined;

    // get accountId from localstorage
    const storedAccountId = getStoredAccountId();

    // check if an account was saved in localstotage
    const storedAccount =
      storedAccountId !== null
        ? accounts.find((account) => account.id === storedAccountId)
        : undefined;

    // establish the selected account by order of importance

    if (userRequestedAccount) {
      return userRequestedAccount;
    }

    if (initialAccount) {
      return initialAccount;
    }

    if (storedAccount) {
      return storedAccount;
    }

    if (accounts.length > 0) {
      return accounts[0];
    }

    return undefined;
  }, [userRequestedAccount, initialAccountId, accounts]);

  const currentCurrency = useMemo(
    () =>
      currentAccount
        ? currencies.find((currency) => currency.id === currentAccount.currency)
        : undefined,
    [currentAccount, currencies]
  );

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    if (
      previousAddressRef.current &&
      !compareEVMAddresses(previousAddressRef.current, currentAccount.address)
    ) {
      // account changed. notify dapp
      sendMessageToDAPP({
        jsonrpc: JSONRPC,
        method: "accountsChanged",
        params: [[currentAccount.address]],
      });
    }

    saveStoredAccountId(currentAccount.id);
    previousAddressRef.current = currentAccount.address;
  }, [currentAccount]);

  useEffect(() => {
    if (!currentCurrency) {
      return;
    }

    if (
      previousChainIdRef.current &&
      previousChainIdRef.current !== currentCurrency.chainID
    ) {
      sendMessageToDAPP({
        jsonrpc: "2.0",
        method: "chainChanged",
        params: [`0x${currentCurrency.chainID.toString(16)}`],
      });
    }
    previousChainIdRef.current = currentCurrency.chainID;
  }, [currentCurrency]);

  const dappURL = useMemo(() => {
    const urlObject = new URL(dappUrl);

    /**
     * Append each dapp specific query param to the url.
     * This takes into account query params that might be defined multiple times
     * ex: ?foo=bar&foo=baz
     */
    if (dappQueryParams) {
      Object.entries(dappQueryParams).forEach(([key, val]) => {
        if (!val) {
          return;
        }

        if (Array.isArray(val)) {
          val.forEach((v) => urlObject.searchParams.append(key, v));
          return;
        }

        urlObject.searchParams.append(key, val);
      });
    }
    return urlObject;
  }, [dappUrl, dappQueryParams]);

  const connector = useRef<SmartWebsocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendMessageToDAPP = useCallback(
    (message: JSONRPCResponse | JSONRPCRequest) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log("sending answer to app: ", message, dappURL.origin);
        iframeRef.current.contentWindow.postMessage(message, dappURL.origin);
      }
    },
    [dappURL]
  );

  type ResponseToDAPP = {
    id: string;
    result?: string;
    error?: JSONRPCError;
  };
  const sendResponseToDAPP = ({ id, result, error }: ResponseToDAPP) => {
    if (result) {
      sendMessageToDAPP({
        id,
        jsonrpc: JSONRPC,
        result,
      });
      return;
    }
    if (error) {
      sendMessageToDAPP({
        id,
        jsonrpc: JSONRPC,
        error,
      });
      return;
    }
  };
  const rejectedError = (message: string): JSONRPCError => ({
    code: 3,
    message,
    data: [
      {
        code: 104,
        message: "Rejected",
      },
    ],
  });

  const receiveDAPPMessage = useCallback(
    async (event: MessageEvent) => {
      if (
        client &&
        currentAccount &&
        currentCurrency &&
        event.origin === dappURL.origin
      ) {
        const data = event.data;

        if (data.jsonrpc !== "2.0") {
          return;
        }

        console.log(`MESSAGE FROM APP ${data.method}`, data, data.jsonrpc);

        switch (data.method) {
          // https://eips.ethereum.org/EIPS/eip-695
          case "eth_chainId": {
            sendMessageToDAPP({
              id: data.id,
              jsonrpc: "2.0",
              result: `0x${currentCurrency.chainID.toString(16)}`,
            });
            break;
          }
          // https://eips.ethereum.org/EIPS/eip-1102
          // https://docs.metamask.io/guide/rpc-api.html#eth-requestaccounts
          case "eth_requestAccounts":
          // legacy method, cf. https://docs.metamask.io/guide/ethereum-provider.html#legacy-methods
          // eslint-disbale-next-line eslintno-fallthrough
          case "enable":
          // https://eips.ethereum.org/EIPS/eip-1474#eth_accounts
          // https://eth.wiki/json-rpc/API#eth_accounts
          // eslint-disbale-next-line eslintno-fallthrough
          case "eth_accounts": {
            sendMessageToDAPP({
              id: data.id,
              jsonrpc: "2.0",
              result: [currentAccount.address],
            });
            break;
          }

          // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-3326.md
          case "wallet_switchEthereumChain": {
            const { chainId } = data.params[0];

            // Check chanId is valid hex string
            const decimalChainId = parseInt(chainId, 16);

            if (isNaN(decimalChainId)) {
              sendResponseToDAPP({
                id: data.id,
                error: rejectedError("Invalid chainId"),
              });
              break;
            }

            // Check chain ID is known to the wallet
            const requestedCurrency = currencies.find(
              (currency) => currency.chainID === decimalChainId
            );

            if (!requestedCurrency) {
              sendResponseToDAPP({
                id: data.id,
                error: rejectedError(`Chain ID ${chainId} is not supported`),
              });
              break;
            }

            try {
              await requestAccount({
                currencyIds: [requestedCurrency.id],
              });
              sendMessageToDAPP({
                id: data.id,
                jsonrpc: "2.0",
                result: null,
              });
            } catch (error) {
              sendResponseToDAPP({
                id: data.id,
                error: rejectedError(`error switching chain: ${error}`),
              });
            }
            break;
          }

          // https://eth.wiki/json-rpc/API#eth_sendtransaction
          case "eth_sendTransaction": {
            const ethTX = data.params[0];
            const tx = convertEthToLiveTX(ethTX);
            if (
              currentAccount &&
              currentAccount.address.toLowerCase() === ethTX.from.toLowerCase()
            ) {
              try {
                const params = nanoApp
                  ? { hwAppId: nanoApp, dependencies }
                  : undefined;
                void track("EVMDAppBrowser SendTransaction Init");
                const hash = await client.transaction.signAndBroadcast(
                  currentAccount.id,
                  tx,
                  params
                );
                void track("EVMDAppBrowser SendTransaction Success");

                sendMessageToDAPP({
                  id: data.id,
                  jsonrpc: "2.0",
                  result: hash,
                });
              } catch (error) {
                void track("EVMDAppBrowser SendTransaction Fail");
                sendResponseToDAPP({
                  id: data.id,
                  error: rejectedError("Transaction declined"),
                });
              }
            }
            break;
          }
          // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-191.md
          // https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sign
          // https://docs.walletconnect.com/json-rpc-api-methods/ethereum
          // Discussion about the diff between eth_sign and personal_sign:
          // https://github.com/WalletConnect/walletconnect-docs/issues/32#issuecomment-644697172
          case "personal_sign": {
            try {
              /**
               * The message is received as a prefixed hex string.
               * We need to strip the "0x" prefix.
               */
              const message = stripHexPrefix(data.params[0]);
              void track("EVMDAppBrowser PersonalSign Init");
              const signedMessage = await client.message.sign(
                currentAccount.id,
                Buffer.from(message, "hex")
              );
              void track("EVMDAppBrowser PersonalSign Success");
              sendResponseToDAPP({
                id: data.id,
                result: `0x${signedMessage.toString("hex")}`,
              });
            } catch (error) {
              void track("EVMDAppBrowser PersonalSign Fail");
              sendResponseToDAPP({
                id: data.id,
                error: rejectedError("Personal message signed declined"),
              });
            }
            break;
          }

          // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
          case data.method.match(/eth_signTypedData(_v.)?$/)?.input: {
            try {
              const message = data.params[1];

              void track("EVMDAppBrowser SignTypedData Init");
              const signedMessage = await client.message.sign(
                currentAccount.id,
                Buffer.from(message)
              );
              void track("EVMDAppBrowser SignTypedData Success");
              sendResponseToDAPP({
                id: data.id,
                result: `0x${signedMessage.toString("hex")}`,
              });
            } catch (error) {
              void track("EVMDAppBrowser SignTypedData Fail");
              sendResponseToDAPP({
                id: data.id,
                error: rejectedError("Typed Data message signed declined"),
              });
            }
            break;
          }

          default: {
            if (connector.current) {
              connector.current.send(data);
            } else if (currentCurrency.rpcURL.startsWith("https:")) {
              axios.post(currentCurrency.rpcURL, data).then((answer) => {
                sendMessageToDAPP(answer.data);
              });
            }
            break;
          }
        }
      }
    },
    [
      client,
      currentCurrency,
      currentAccount,
      dappURL,
      accounts,
      sendMessageToDAPP,
    ]
  );

  const handleRequestAccount = useCallback(async () => {
    const enabledCurrencyIds = currencies.map((currency) => currency.id);

    try {
      await requestAccount({
        currencyIds: enabledCurrencyIds,
      });
      if (accounts.length === 0) {
        await updateAccounts();
      }
    } catch (error) {
      // TODO: handle error
    }
  }, [currencies, requestAccount]);

  useEffect(() => {
    window.addEventListener("message", receiveDAPPMessage, false);

    return () => {
      window.removeEventListener("message", receiveDAPPMessage, false);
    };
  }, [receiveDAPPMessage]);

  useEffect(() => {
    if (currentCurrency) {
      const rpcURL = new URL(currentCurrency.rpcURL);
      if (rpcURL.protocol === "wss:") {
        const websocket = new SmartWebsocket(rpcURL.toString(), {
          reconnect: true,
          reconnectMaxAttempts: Infinity,
        });

        websocket.on("message", (message) => {
          sendMessageToDAPP(message);
        });

        websocket.connect();

        connector.current = websocket;
        return () => {
          websocket.close();
          connector.current = null;
        };
      }
    }
  }, [currentCurrency, sendMessageToDAPP]);

  const showOverlay = accounts.length === 0;

  return (
    <AppLoaderPageContainer>
      <ControlBar desktop>
        <AccountRequest
          selectedAccount={currentAccount || undefined}
          onRequestAccount={handleRequestAccount}
        />
      </ControlBar>
      <DappContainer>
        {showOverlay ? (
          <Overlay>
            {accounts.length === 0 ? (
              <Flex flexDirection="column" alignItems="center">
                <Text mb={6} color="neutral.c100">
                  {"You need an account to access this app."}
                </Text>
                <Button onClick={handleRequestAccount} variant="main">
                  {"Add Account"}
                </Button>
              </Flex>
            ) : null}
          </Overlay>
        ) : null}
        {accounts.length > 0 ? (
          <DappIframe
            ref={iframeRef}
            src={dappURL.toString()}
            allow="clipboard-read; clipboard-write"
          />
        ) : null}
      </DappContainer>
      {!!accounts.length && (
        <ControlBar mobile>
          <AccountRequest
            selectedAccount={currentAccount || undefined}
            onRequestAccount={handleRequestAccount}
          />
        </ControlBar>
      )}
    </AppLoaderPageContainer>
  );
}
