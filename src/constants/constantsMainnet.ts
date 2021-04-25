const Web3 = require('web3');

// mainnet https address
//const bscHttps = "https://apis.ankr.com/961925be316b4169aa178dc9f989b74a/09bc802376bb9bd75c33d54a2606f880/binance/full/main"
export const bscHttps = "https://bsc-dataseed.binance.org/";

// mainnet wss address
export const bscWss = "wss://apis.ankr.com/wss/961925be316b4169aa178dc9f989b74a/09bc802376bb9bd75c33d54a2606f880/binance/full/main"
//const bscWss = "wss://bsc-ws-node.nariox.org:443"

// $WBNB address
let tempWbnbAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

// constant checksummed address of WBNB 
export const wbnbAddress = Web3.utils.toChecksumAddress(tempWbnbAddress);

// $BUSD address
//let tempTokenToSwap = '0xe9e7CeA3dedca5984780bafc599bd69add087d56';

// $CAKE address
//let tempTokenToSwap = '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82';

// $1MLN NFT address
let tempTokenToSwap = '0xa4eF4b0B23C1fc81d3f9ecF93510e64f58A4A016';

// constatnt checksummed address of token to swap
export const tokenToSwap = Web3.utils.toChecksumAddress(tempTokenToSwap)

// Pancakeswap Factory Address
let tempCakeFactory = "0xBCfCcbde45cE874adCB698cC183deBcF17952812";

// mainnet pancakeswap factory address
export const cakeFactoryContractAdd = Web3.utils.toChecksumAddress(tempCakeFactory);

// Pancakeswap Router Address
//let tempCakeRouter  = "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F"; //v1
let tempCakeRouter  = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; //v2
// mainnet pancakeswap router address
export const cakeRouterContractAdd = Web3.utils.toChecksumAddress(tempCakeRouter);