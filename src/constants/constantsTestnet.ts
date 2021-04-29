const Web3 = require("web3");

// https address
export const bscHttps = "https://data-seed-prebsc-2-s1.binance.org:8545/";

// wss address
export const bscWss = "wss://data-seed-prebsc-1-s1.binance.org:8545/";

// WBNB address
let tempWbnbAddress = "0xae13d989dac2f0debff460ac112a837c89baa7cd";
export const wbnbAddress = Web3.utils.toChecksumAddress(tempWbnbAddress);

//testnet BUSD address
let tempTokenToSwap = "0x731c348e57a88cacd1aa3e660f1aad98008a345f";
export const tokenToSwap = Web3.utils.toChecksumAddress(tempTokenToSwap);

// testnet pancakeswap factory address
let tempCakeFactory = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
export const cakeFactoryContractAdd = Web3.utils.toChecksumAddress(
  tempCakeFactory
);

// testnet pancakeswap router address
let tempCakeRouter = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
export const cakeRouterContractAdd = Web3.utils.toChecksumAddress(
  tempCakeRouter
);

export const bscHttpsList = [
  "https://data-seed-prebsc-1-s1.binance.org:8545/",
  "https://data-seed-prebsc-2-s1.binance.org:8545/",
  "https://data-seed-prebsc-1-s2.binance.org:8545/",
  "https://data-seed-prebsc-2-s2.binance.org:8545/",
  "https://data-seed-prebsc-1-s3.binance.org:8545/",
  "https://data-seed-prebsc-2-s3.binance.org:8545/",
];
