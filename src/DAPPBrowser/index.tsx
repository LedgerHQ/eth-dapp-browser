import LedgerLivePlarformSDK, {
  Account,
  WindowMessageTransport,
} from "@ledgerhq/live-app-sdk";
import { Button, Flex, Text } from "@ledgerhq/react-ui";
import axios from "axios";
import {
  JSONRPC,
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
} from "json-rpc-2.0";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CSSTransition from "react-transition-group/CSSTransition";
import styled, { keyframes } from "styled-components";
import AccountRequest from "../components/AccountRequest";
import AccountSelector from "../components/AccountSelector";
import ControlBar from "../components/ControlBar";
import CookiesBlocked from "../components/CookiesBlocked";
import { convertEthToLiveTX, msgHexToText } from "./helper";
import { SmartWebsocket } from "./SmartWebsocket";
import { ChainConfig } from "./types";

const loading = keyframes`
  0% { opacity:0.8; }
  50% { opacity:0.4; }
  100% { opacity:0.8; }
`;

const AppLoaderPageContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Loader = styled.div`
  animation: ${loading} 1s ease-in-out infinite;
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
  theme?: string;
  nanoApp?: string;
  initialAccountId: string | undefined;
  chainConfigs: ChainConfig[];
};

type DAPPBrowserState = {
  accounts: Account[];
  selectedAccount: Account | undefined;
  clientLoaded: boolean;
  fetchingAccounts: boolean;
  connected: boolean;
  cookiesBlocked: boolean;
};

const initialState = {
  accounts: [],
  selectedAccount: undefined,
  clientLoaded: false,
  fetchingAccounts: false,
  connected: false,
  cookiesBlocked: false,
};

export function DAPPBrowser({
  dappUrl,
  dappName,
  theme,
  nanoApp,
  initialAccountId,
  chainConfigs,
}: DAPPBrowserProps): React.ReactElement {
  const [state, setState] = useState<DAPPBrowserState>(initialState);
  const {
    accounts,
    selectedAccount,
    clientLoaded,
    connected,
    fetchingAccounts,
    cookiesBlocked,
  } = state;

  const wrapThirdPartyCookiesErrorHandler =
    <T extends unknown[], R>(cb: (...args: T) => R) =>
    (...args: T) => {
      try {
        return cb(...args);
      } catch (err) {
        // specifically catch 'Access is denied...' error on `localStorage`
        // (means that third-party cookies are disabled on host)
        if (err instanceof DOMException && err.code === 18) {
          setState((s) => ({ ...s, cookiesBlocked: true }));
        } else {
          throw err;
        }
      }
    };

  const localStorageSet = wrapThirdPartyCookiesErrorHandler(
    (key: string, val: string) => localStorage.setItem(key, val)
  );

  const localStorageGet = wrapThirdPartyCookiesErrorHandler((key: string) =>
    localStorage.getItem(key)
  );

  const dappURL = useMemo(() => {
    const urlObject = new URL(dappUrl);

    if (theme) {
      urlObject.searchParams.set("theme", theme);
    }
    return urlObject;
  }, [dappUrl]);
  const chainConfig = useMemo(
    () =>
      selectedAccount
        ? chainConfigs.find(
            (config) => config.currency === selectedAccount.currency
          )
        : undefined,
    [selectedAccount, chainConfigs]
  );

  const connector = useRef<SmartWebsocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ledgerAPIRef = useRef<LedgerLivePlarformSDK | null>(null);

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
    sendMessageToDAPP({
      id,
      jsonrpc: JSONRPC,
      result,
      error,
    });
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

  const selectAccount = useCallback(
    (account: Account | undefined) => {
      setState((currentState) => ({
        ...currentState,
        selectedAccount: account,
      }));

      if (account) {
        if (typeof window !== "undefined") {
          localStorageSet("accountId", account.id);
        }

        sendMessageToDAPP({
          jsonrpc: JSONRPC,
          method: "accountsChanged",
          params: [[account.address]],
        });
      }
    },
    [setState, sendMessageToDAPP]
  );

  const receiveDAPPMessage = useCallback(
    async (event: MessageEvent) => {
      if (selectedAccount && chainConfig && event.origin === dappURL.origin) {
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
              result: `0x${chainConfig.chainID.toString(16)}`,
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
              result: [selectedAccount.address],
            });
            break;
          }
          // https://eth.wiki/json-rpc/API#eth_sendtransaction
          case "eth_sendTransaction": {
            const ethTX = data.params[0];
            const tx = convertEthToLiveTX(ethTX);
            if (
              selectedAccount &&
              selectedAccount.address.toLowerCase() === ethTX.from.toLowerCase()
            ) {
              try {
                if (ledgerAPIRef.current) {
                  const params = nanoApp ? { useApp: nanoApp } : undefined;
                  const signedTransaction =
                    await ledgerAPIRef.current.signTransaction(
                      selectedAccount.id,
                      tx,
                      params
                    );
                  const hash =
                    await ledgerAPIRef.current.broadcastSignedTransaction(
                      selectedAccount.id,
                      signedTransaction
                    );
                  sendMessageToDAPP({
                    id: data.id,
                    jsonrpc: "2.0",
                    result: hash,
                  });
                }
              } catch (error) {
                sendResponseToDAPP({
                  id: data.id,
                  error: rejectedError("Transaction declined"),
                });
              }
            }
            break;
          }
          // https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sign
          // https://docs.walletconnect.com/json-rpc-api-methods/ethereum
          // Discussion about the diff between eth_sign and personal_sign:
          // https://github.com/WalletConnect/walletconnect-docs/issues/32#issuecomment-644697172
          case "personal_sign": {
            try {
              if (ledgerAPIRef.current) {
                const message = msgHexToText(data.params[0]);

                const signedMessage = await ledgerAPIRef.current.signMessage(
                  selectedAccount.id,
                  message
                );
                sendResponseToDAPP({ id: data.id, result: signedMessage });
              }
            } catch (error) {
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
              if (ledgerAPIRef.current) {
                const message = data.params[1];

                const signedMessage = await ledgerAPIRef.current.signMessage(
                  selectedAccount.id,
                  message
                );
                sendResponseToDAPP({ id: data.id, result: signedMessage });
              }
            } catch (error) {
              sendResponseToDAPP({
                id: data.id,
                error: rejectedError("Personal message signed declined"),
              });
            }
            break;
          }

          default: {
            if (connector.current) {
              connector.current.send(data);
            } else if (chainConfig.nodeURL.startsWith("https:")) {
              axios.post(chainConfig.nodeURL, data).then((answer) => {
                sendMessageToDAPP(answer.data);
              });
            }
            break;
          }
        }
      }
    },
    [
      selectAccount,
      chainConfig,
      selectedAccount,
      dappURL,
      accounts,
      sendMessageToDAPP,
    ]
  );

  const setClientLoaded = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      clientLoaded: true,
    }));
  }, [setState]);

  const requestAccount = useCallback(async () => {
    const enabledCurrencies = chainConfigs.map(
      (chainConfig) => chainConfig.currency
    );

    try {
      const payload = {
        currencies: enabledCurrencies,
        allowAddAccount: true,
      };
      if (ledgerAPIRef.current) {
        const account = await ledgerAPIRef.current.requestAccount(payload);
        selectAccount(account);
      }
    } catch (error) {
      // TODO: handle error
    }
  }, [chainConfigs]);

  const fetchAccounts = useCallback(async () => {
    if (!ledgerAPIRef.current) {
      return;
    }
    const enabledCurrencies = chainConfigs.map(
      (chainConfig) => chainConfig.currency
    );

    setState((currentState) => ({
      ...currentState,
      fetchingAccounts: true,
    }));

    const accounts = await ledgerAPIRef.current.listAccounts();

    // filter all accounts matching allowed currencies
    const filteredAccounts = accounts.filter((account: Account) =>
      enabledCurrencies.includes(account.currency)
    );

    // check if there is a initial account
    const initialAccount = initialAccountId
      ? filteredAccounts.find((account) => account.id === initialAccountId)
      : undefined;

    // get accountId from localstorage
    const storedAccountId: string | null =
      typeof window !== "undefined"
        ? localStorageGet("accountId") || null
        : null;

    // check if an account was saved in localstotage
    const storedAccount =
      storedAccountId !== null
        ? filteredAccounts.find((account) => account.id === storedAccountId)
        : undefined;

    // establish the selected account by order of importance
    const selectedAccount =
      filteredAccounts.length > 0
        ? initialAccount || storedAccount || filteredAccounts[0]
        : undefined;

    setState((currentState) => ({
      ...currentState,
      accounts: filteredAccounts,
      fetchingAccounts: false,
      selectedAccount,
    }));
  }, [chainConfigs, setState, initialAccountId]);

  useEffect(() => {
    window.addEventListener("message", receiveDAPPMessage, false);

    return () => {
      window.removeEventListener("message", receiveDAPPMessage, false);
    };
  }, [receiveDAPPMessage]);

  useEffect(() => {
    const ledgerAPI = new LedgerLivePlarformSDK(new WindowMessageTransport());
    ledgerAPI.connect();
    ledgerAPIRef.current = ledgerAPI;

    return () => {
      setState((currentState) => ({
        ...currentState,
        connected: false,
      }));
    };
  }, []);

  useEffect(() => {
    fetchAccounts().then(() => {
      setState((currentState) => ({
        ...currentState,
        connected: true,
      }));
    });
  }, [fetchAccounts]);

  useEffect(() => {
    if (chainConfig) {
      const nodeURL = new URL(chainConfig.nodeURL);
      sendMessageToDAPP({
        jsonrpc: "2.0",
        method: "chainChanged",
        params: [`0x${chainConfig.chainID.toString(16)}`],
      });
      if (nodeURL.protocol === "wss:") {
        const websocket = new SmartWebsocket(nodeURL.toString(), {
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
  }, [chainConfig, sendMessageToDAPP]);

  if (cookiesBlocked) {
    return <CookiesBlocked />;
  }

  return (
    <AppLoaderPageContainer>
      {!!accounts.length && (
        <ControlBar desktop>
          <AccountSelector
            selectedAccount={selectedAccount}
            accounts={accounts}
            onAccountChange={selectAccount}
          />
        </ControlBar>
      )}
      <DappContainer>
        <CSSTransition in={clientLoaded} timeout={300} classNames="overlay">
          <Overlay>
            {!connected ? (
              <Loader>
                <Text color="neutral.c100">{"Connecting ..."}</Text>
              </Loader>
            ) : fetchingAccounts ? (
              <Loader>
                <Text color="neutral.c100">{"Loading accounts ..."}</Text>
              </Loader>
            ) : accounts.length === 0 ? (
              <Flex flexDirection="column" alignItems="center">
                <Text mb={6} color="neutral.c100">
                  {"You need an account to access this app."}
                </Text>
                <Button onClick={requestAccount} variant="main">
                  {"Add Account"}
                </Button>
              </Flex>
            ) : (
              <Loader>
                <Text
                  variant="h5"
                  color="neutral.c100"
                >{`Loading ${dappName} ...`}</Text>
              </Loader>
            )}
          </Overlay>
        </CSSTransition>
        {connected && accounts.length > 0 ? (
          <DappIframe
            ref={iframeRef}
            src={dappURL.toString()}
            onLoad={setClientLoaded}
          />
        ) : null}
      </DappContainer>
      {!!accounts.length && (
        <ControlBar mobile>
          <AccountRequest
            selectedAccount={selectedAccount}
            onRequestAccount={requestAccount}
          />
        </ControlBar>
      )}
    </AppLoaderPageContainer>
  );
}
