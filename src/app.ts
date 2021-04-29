const Web3 = require("web3");
const fs = require("fs");
const abiDecoder = require("abi-decoder");
const EventEmitter = require("events");

import { Contract } from "@ethersproject/contracts";
import {
  bscHttps,
  cakeRouterContractAdd,
  cakeFactoryContractAdd,
  tokenToSwap,
  wbnbAddress,
  bscHttpsList,
} from "./constants/constantsMainnet";
import {
  logImportantMessage,
  logTimestampedMessage,
  logTimestampedError,
  sleep,
  askQuestion,
  getHttpProviders,
  doSpendApproval,
} from "./utils/utils";
import {
  getOutputToken,
  swapExactETHForToken,
  swapExactTokensForETH,
} from "./swap/tokenSwap";
import { getBalance } from "./utils/bep20";
import { getPairInfo } from "./swap/factoryOps";
import {
  watchForNewBlocks,
  findLiquidityForAddressInBlock,
} from "./utils/block";

/**
 * Main Function
 */
async function main() {
  logTimestampedMessage("Execution started");

  let providers = getHttpProviders(bscHttpsList);

  // this emitter will notify if we found any liquidity add events
  let liquidityEventEmitter = new EventEmitter();

  let lastBlockNumber = 0;

  const cakeFactoryAbi = fs.readFileSync(
    "./src/config/abi/pancakeswap-factory.json",
    "utf8"
  );
  const cakeRouterAbi = fs.readFileSync(
    "./src/config/abi/pancakeswap-router.json",
    "utf8"
  );
  const tokenToSwapAbi = fs.readFileSync(
    "./src/config/abi/bep-20-compatible-token.json",
    "utf8"
  );

  abiDecoder.addABI(JSON.parse(cakeRouterAbi));

  const web3 = new Web3(bscHttps);

  const account = await web3.eth.accounts.privateKeyToAccount(
    process.env.mtmsk_acc
  );

  //###########################################################
  // CONSTANTS changes
  //###########################################################
  // this flag will decide if a trade will be made or not
  const RESPOND_TO_EVENTS = false;
  const ETH_TO_SPEND = "0.45";
  const TIME_TO_MONITOR_IN_MINUTES = 1;
  const MONITOR_ONLY_LARGE_TXS = false; // will applicable only when RESPOND_TO_EVENTS is false
  //###########################################################

  const cakeRouterContract: Contract = new web3.eth.Contract(
    JSON.parse(cakeRouterAbi),
    cakeRouterContractAdd
  );
  const cakeFactoryContract: Contract = new web3.eth.Contract(
    JSON.parse(cakeFactoryAbi),
    cakeFactoryContractAdd
  );
  const tokenToSwapContract: Contract = new web3.eth.Contract(
    JSON.parse(tokenToSwapAbi),
    tokenToSwap
  );

  logTimestampedMessage("monitoring started");

  liquidityEventEmitter.on("liquidity_added", (liquidity_info: any) => {
    logImportantMessage("LIQUIDITY FOUND");
    console.log(liquidity_info);
  });

  for (let counter = 6931910; counter < 6931925; counter++)
    findLiquidityForAddressInBlock(
      web3,
      abiDecoder,
      cakeRouterContractAdd,
      tokenToSwap,
      counter,
      counter,
      RESPOND_TO_EVENTS,
      MONITOR_ONLY_LARGE_TXS,
      liquidityEventEmitter
    ).catch((error) => logTimestampedError(error));

  logTimestampedMessage("Going to sleep for 1 minute");
  await sleep(60 * 1000);
  logTimestampedMessage("after sleep of 1 minute, Returning");
  return;

  let blockEventListener = await watchForNewBlocks(providers, 5);

  blockEventListener.on("new_block", (fetchInfo: any) => {
    if (fetchInfo.blockNumber > lastBlockNumber) {
      logTimestampedMessage(
        `${fetchInfo.fetchedAt.toISOString()} - ${fetchInfo.blockNumber} - ${
          fetchInfo.server
        }`
      );
      for (
        let counter = lastBlockNumber;
        counter < fetchInfo.blockNumber;
        counter++
      )
        findLiquidityForAddressInBlock(
          fetchInfo.web3Instance,
          abiDecoder,
          cakeRouterContractAdd,
          tokenToSwap,
          counter,
          counter,
          RESPOND_TO_EVENTS,
          MONITOR_ONLY_LARGE_TXS,
          liquidityEventEmitter
        ).catch((error) => logTimestampedError(error));

      lastBlockNumber = fetchInfo.blockNumber;
    }
  });

  if (RESPOND_TO_EVENTS) {
    doSpendApproval(cakeRouterContractAdd, tokenToSwapContract, account, web3);
  }
  let pairAddress = await getPairInfo(
    cakeFactoryContract,
    tokenToSwap,
    wbnbAddress
  );

  logImportantMessage(`Pair address ${pairAddress}`);

  if (RESPOND_TO_EVENTS) {
    logImportantMessage(
      `FOUND LIQUIDITY ADD for '${tokenToSwap}' waiting for 2 minutes`
    );

    // wait for two minutes to let bot prevention part go away
    // await sleepForSeconds(121);
    if (
      await swapExactETHForToken(
        ETH_TO_SPEND,
        account,
        cakeRouterContract,
        wbnbAddress,
        tokenToSwap,
        web3
      )
    ) {
      let newTokenBalanceAfterSwap = await getBalance(
        account.address,
        tokenToSwapContract,
        web3
      );

      while (true) {
        let expectedOutput = await getOutputToken(
          newTokenBalanceAfterSwap,
          tokenToSwap,
          wbnbAddress,
          cakeRouterContract
        );
        logImportantMessage(
          `We spent ${ETH_TO_SPEND} and  we will get ${web3.utils.fromWei(
            expectedOutput
          )}`
        );
        let ans = await askQuestion(
          "Press ENTER when your want to sell tokens"
        );
        if (String(ans).toLowerCase().startsWith("y")) {
          break;
        }
        await sleep(500);
      }
      await swapExactTokensForETH(
        web3.utils.fromWei(newTokenBalanceAfterSwap).toString(),
        account,
        cakeRouterContract,
        tokenToSwap,
        wbnbAddress,
        web3
      );
    }
  }
  logTimestampedMessage("monitoring ended");
}

// call main method
main();
