import { EthereumTransaction } from "@ledgerhq/wallet-api-client";
import { BigNumber } from "bignumber.js";
import eip55 from "eip55";

export function convertEthToLiveTX(
  ethTX: Record<string, string>
): EthereumTransaction {
  return {
    family: "ethereum",
    amount:
      ethTX.value !== undefined
        ? new BigNumber(ethTX.value.replace("0x", ""), 16)
        : new BigNumber(0),
    recipient: eip55.encode(ethTX.to),
    maxPriorityFeePerGas: ethTX.maxPriorityFeePerGas
      ? new BigNumber(ethTX.maxPriorityFeePerGas.replace("0x", ""), 16)
      : undefined,
    maxFeePerGas: ethTX.maxFeePerGas
      ? new BigNumber(ethTX.maxFeePerGas.replace("0x", ""), 16)
      : undefined,
    gasPrice:
      ethTX.gasPrice !== undefined
        ? new BigNumber(ethTX.gasPrice.replace("0x", ""), 16)
        : undefined,
    gasLimit:
      ethTX.gas !== undefined
        ? new BigNumber(ethTX.gas.replace("0x", ""), 16)
        : undefined,
    data: ethTX.data
      ? Buffer.from(ethTX.data.replace("0x", ""), "hex")
      : undefined,
  };
}

function isHexPrefixed(str: string): boolean {
  return str[0] === "0" && str[1] === "x";
}

export function stripHexPrefix(str: string): string {
  return isHexPrefixed(str) ? str.slice(2) : str;
}

export function compareEVMAddresses(addr1: string, addr2: string): boolean {
  return addr1.toLowerCase() === addr2.toLowerCase();
}
