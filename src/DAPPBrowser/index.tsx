import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import styled, { keyframes } from "styled-components";
import { JSONRPCRequest, JSONRPCResponse } from "json-rpc-2.0";
import CSSTransition from "react-transition-group/CSSTransition";

import LedgerLivePlarformSDK, {
  WindowMessageTransport,
  Account,
} from "@ledgerhq/live-app-sdk";
import AccountSelector from "../components/AccountSelector";
import AccountRequest from "../components/AccountRequest";
import ControlBar from "../components/ControlBar";

import { SmartWebsocket } from "./SmartWebsocket";
import { convertEthToLiveTX } from "./helper";
import { ChainConfig } from "./types";
import axios from "axios";

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
};

const initialState = {
  accounts: [],
  selectedAccount: undefined,
  clientLoaded: false,
  fetchingAccounts: false,
  connected: false,
};

export function DAPPBrowser({
  dappUrl,
  dappName,
  theme,
  nanoApp,
  initialAccountId,
  chainConfigs,
}: DAPPBrowserProps) {
  const [state, setState] = useState<DAPPBrowserState>(initialState);
  const {
    accounts,
    selectedAccount,
    clientLoaded,
    connected,
    fetchingAccounts,
  } = state;

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

  const selectAccount = useCallback(
    (account: Account | undefined) => {
      setState((currentState) => ({
        ...currentState,
        selectedAccount: account,
      }));

      if (account) {
        if (typeof window !== "undefined") {
          localStorage.setItem("accountId", account.id);
        }

        sendMessageToDAPP({
          jsonrpc: "2.0",
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
          case "eth_chainId": {
            sendMessageToDAPP({
              id: data.id,
              jsonrpc: "2.0",
              result: `0x${chainConfig.chainID.toString(16)}`,
            });
            break;
          }
          case "eth_requestAccounts": {
            sendMessageToDAPP({
              id: data.id,
              jsonrpc: "2.0",
              result: [selectedAccount.address],
            });
            break;
          }
          case "enable": {
            sendMessageToDAPP({
              id: data.id,
              jsonrpc: "2.0",
              result: [selectedAccount.address],
            });
            break;
          }
          case "eth_accounts": {
            sendMessageToDAPP({
              id: data.id,
              jsonrpc: "2.0",
              result: [selectedAccount.address],
            });
            break;
          }
          case "eth_sendTransaction": {
            const ethTX = data.params[0];
            const tx = convertEthToLiveTX(ethTX);
            if (
              selectedAccount &&
              selectedAccount.address.toLowerCase() === ethTX.from.toLowerCase()
            ) {
              try {
                if (ledgerAPIRef.current) {
                  const signedTransaction =
                    await ledgerAPIRef.current.signTransaction(
                      selectedAccount.id,
                      tx,
                      { useApp: nanoApp }
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
                sendMessageToDAPP({
                  id: data.id,
                  jsonrpc: "2.0",
                  error: {
                    code: 3,
                    message: "Transaction declined",
                    data: [
                      {
                        code: 104,
                        message: "Rejected",
                      },
                    ],
                  },
                });
              }
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
    if (!chainConfig) {
      throw new Error("No chain config selected");
    }

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
  }, [chainConfig]);

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
    const filteredAccounts = accounts.filter((account: Account) =>
      enabledCurrencies.includes(account.currency)
    );

    const initialAccount = initialAccountId
      ? filteredAccounts.find((account) => account.id === initialAccountId)
      : undefined;
    const storedAccountId: string | null =
      typeof window !== "undefined" ? localStorage.getItem("accountId") : null;
    const storedAccount =
      storedAccountId !== null
        ? filteredAccounts.find((account) => account.id === storedAccountId)
        : undefined;

    const selectedAccount =
      filteredAccounts.length > 0
        ? initialAccount || storedAccount || filteredAccounts[0]
        : undefined;

    const selectedChainConfig = selectedAccount
      ? chainConfigs.find(
          (chainConfig) => chainConfig.currency === selectedAccount.currency
        )
      : undefined;

    if (!selectedChainConfig) {
      throw new Error("No chain config selected");
    }

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
            <Loader>
              {!connected
                ? "Connecting ..."
                : fetchingAccounts
                ? "Loading accounts ..."
                : accounts.length === 0
                ? "You don't have any accounts"
                : `Loading ${dappName} ...`}
            </Loader>
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
