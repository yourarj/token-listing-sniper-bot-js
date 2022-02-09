const Web3 = require("web3");

// mainnet https address
//export const bscHttps = process.env.ankr_https
export const bscHttps = "https://bsc-dataseed.binance.org/";

// mainnet wss address
export const bscWss = process.env.ankr_wss
//export const bscWss = "wss://bsc-ws-node.nariox.org:443"

// $WBNB address
let tempWbnbAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";

// constant checksummed address of WBNB
export const wbnbAddress = Web3.utils.toChecksumAddress(tempWbnbAddress);

// $BUSD address
//let tempTokenToSwap = '0xe9e7CeA3dedca5984780bafc599bd69add087d56';

// $CAKE address
//let tempTokenToSwap = '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82';

// $bRing address
//let tempTokenToSwap = '0x939d5a13cf0074586a2dcf17bc692b2d3ccdd517';

// $tsx address
let tempTokenToSwap = "0x270388e0ca29cfd7c7e73903d9d933a23d1bab39";

// constatnt checksummed address of token to swap
export const tokenToSwap = Web3.utils.toChecksumAddress(tempTokenToSwap);

// Pancakeswap Factory Address
//let tempCakeFactory = "0xBCfCcbde45cE874adCB698cC183deBcF17952812"; //v1
let tempCakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"; //v2

// mainnet pancakeswap factory address
export const cakeFactoryContractAdd = Web3.utils.toChecksumAddress(
  tempCakeFactory
);

// Pancakeswap Router Address
//let tempCakeRouter  = "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F"; //v1
let tempCakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; //v2
// mainnet pancakeswap router address
export const cakeRouterContractAdd = Web3.utils.toChecksumAddress(
  tempCakeRouter
);

export const bscHttpsList = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
  "https://bsc-dataseed2.defibit.io/",
  "https://bsc-dataseed3.defibit.io/",
  "https://bsc-dataseed4.defibit.io/",
  "https://bsc-dataseed2.ninicoin.io/",
  "https://bsc-dataseed3.ninicoin.io/",
  "https://bsc-dataseed4.ninicoin.io/",
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
];
