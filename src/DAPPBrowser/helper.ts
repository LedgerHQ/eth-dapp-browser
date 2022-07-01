import { EthereumTransaction, FAMILIES } from "@ledgerhq/live-app-sdk";
import { BigNumber } from "bignumber.js";
import eip55 from "eip55";

export function convertEthToLiveTX(ethTX: any): EthereumTransaction {
  return {
    family: FAMILIES.ETHEREUM,
    amount:
      ethTX.value !== undefined
        ? new BigNumber(ethTX.value.replace("0x", ""), 16)
        : new BigNumber(0),
    recipient: eip55.encode(ethTX.to),
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

// Copied from https://www.npmjs.com/package/ethereumjs-util
const isHexPrefixed = (str: string): boolean => {
  if (typeof str !== "string") {
    throw new Error(
      `[isHexPrefixed] input must be type 'string', received type ${typeof str}`
    );
  }

  return str[0] === "0" && str[1] === "x";
};

// Copied from https://www.npmjs.com/package/ethereumjs-util
const stripHexPrefix = (str: string): string => {
  if (typeof str !== "string")
    throw new Error(
      `[stripHexPrefix] input must be type 'string', received ${typeof str}`
    );

  return isHexPrefixed(str) ? str.slice(2) : str;
};

export const msgHexToText = (hex: string): string => {
  try {
    const stripped = stripHexPrefix(hex);
    const buff = Buffer.from(stripped, "hex");
    return buff.length === 32 ? hex : buff.toString("utf8");
  } catch (e) {
    return hex;
  }
};
