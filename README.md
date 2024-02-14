<p align="center">
 <img src="https://user-images.githubusercontent.com/9203826/154288895-670f5c23-81a1-4307-a080-1af83f7f8356.svg" align="center" alt="Ledger" />
 <h2 align="center">ETH Dapp Browser</h2>
 <p align="center">An Ethereum Dapp Browser to run your Dapp inside <a href="https://www.ledger.com/ledger-live">Ledger Live</a></p>
</p>
  <p align="center">
    <a href="https://choosealicense.com/licenses/mit/">
      <img alt="License" src="https://img.shields.io/github/license/LedgerHQ/eth-dapp-browser" />
    </a>
    <a href="https://github.com/LedgerHQ/eth-dapp-browser/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/LedgerHQ/eth-dapp-browser?color=0088ff" />
    </a>
    <a href="https://github.com/LedgerHQ/eth-dapp-browser/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/LedgerHQ/eth-dapp-browser?color=0088ff" />
    </a>
    <a href="https://discord.gg/y6nZhxv2bC">
      <img alt="Discord" src="https://img.shields.io/discord/885256081289379850?color=1C1CE1&label=Ledger%20%7C%20Discord%20%F0%9F%91%8B%20&style=flat-square" />
    </a>
   
   
  </p>

  <p align="center">
    <a href="https://developers.ledger.com/docs/live-app/start-here/">Full documentation</a>
    ·
    <a href="https://github.com/LedgerHQ/eth-dapp-browser/issues/new/choose">Report Bug</a>
    ·
    <a href="https://github.com/LedgerHQ/eth-dapp-browser/issues/new/choose">Request Feature</a>
  </p>
</p>

# Installation

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

# Usage

This application is mainly used by Ledger Live to display a Dapp and provide a bridge between said Dapp and the Ledger Live client.

As a Dapp developer, you can use this application through a manifest, as specified on our [developer portal](https://developers.ledger.com/docs/discover/dapp-browser/manifest), to test the correct integration of your Dapp within Ledger Live.

The list of supported rpc calls can be found in the [receiveDAPPMessage](https://github.com/LedgerHQ/eth-dapp-browser/blob/main/src/DAPPBrowser/index.tsx#:~:text=const-,receiveDAPPMessage,-%3D%20useCallback) function in the `DAPPBrowser` component [index file](src/DAPPBrowser/index.tsx).

Here is an example of a manifest you could use for local test (with the `eth-dapp-browser` accessible on port `3000` and your Dapp accessible on port `4000`):

```json
{
  "id": "test-dapp",
  "name": "Test DApp",
  "url": "http://localhost:3000/",
  "params": {
    "dappUrl": "http://localhost:4000/",
    "nanoApp": "Ethereum",
    "dappName": "Test DApp",
    "networks": [
      {
        "currency": "ethereum",
        "chainID": 1,
        "nodeURL": "wss://eth-mainnet.ws.alchemyapi.io/v2/0fyudoTG94QWC0tEtfJViM9v2ZXJuij2"
      },
      {
        "currency": "bsc",
        "chainID": 56,
        "nodeURL": "https://bsc-dataseed.binance.org/"
      },
      {
        "currency": "polygon",
        "chainID": 137,
        "nodeURL": "https://polygon-mainnet.g.alchemy.com/v2/oPIxZM7kXsPVVY1Sk0kOQwkoIOpSu8PE"
      },
      {
        "currency": "ethereum_goerli",
        "chainID": 5,
        "nodeURL": "https://eth-goerli.g.alchemy.com/v2/vzJoUrfWDBOdwtCL-sybfBzIfNzY0_tk"
      }
    ]
  },
  "homepageUrl": "",
  "supportUrl": "",
  "icon": "",
  "platform": "all",
  "apiVersion": "0.0.1",
  "manifestVersion": "1",
  "branch": "stable",
  "categories": [],
  "currencies": ["ethereum", "bsc"],
  "content": {
    "shortDescription": {
      "en": "Test DApp"
    },
    "description": {
      "en": "Test DApp"
    }
  },
  "permissions": [],
  "domains": ["https://*"]
}
```

Know that your Dapp will **always** be accessed through the url provided under the `dappUrl` field.

If you want to handle different logics for opening your Dapp (for example, opening a specific page or start your app in a specific stage based on some parameters), you can use URL query string alongside [Ledger Live deeplink](https://github.com/LedgerHQ/ledger-live/wiki/LLD:DeepLinking).

Here is an example of a deeplink oppening this test Dapp with some query parameters:

```
ledgerlive://discover/test-dapp/?param1=val1&param2=val2
```

The query params `param1` and `param2` will be forwarded by the eth-dapp-browser to your Dapp (i.e: included as query parameters in your Dapp URL).

Your Dapp could also automatically receive extra query params provided by the client application (Ledger Live for example).

:warning: These query params are reserved, meaning you **should not** provide them as query params, either in the `dappUrl` field through the manifest or in a deeplink.

Here is a list of these reserved query params and the information of wether or not they might be forwarded by the eth-dapp-browser to the Dapp:

| Query param       | Passed to Dapp? |
| ----------------- | :-------------: |
| `params`          |                 |
| `accountId`       |                 |
| `theme`           |        X        |
| `backgroundColor` |        X        |
| `textColor`       |        X        |
| `loadDate`        |        X        |
| `lang`            |        X        |

<!-- Table generated using https://www.tablesgenerator.com/markdown_tables# -->

# Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

# License

[MIT](https://choosealicense.com/licenses/mit/)

---

[We are hiring, join us! 🚀](https://www.ledger.com/join-us)

## See also:

- [Ledger Live](https://github.com/LedgerHQ/ledger-live)
- [Live App SDK](https://github.com/LedgerHQ/live-app-sdk)
