const Web3 = require("web3");
const fs = require("fs");
const abiDecoder = require("abi-decoder");
const EventEmitter = require("events");

import { Contract } from "@ethersproject/contracts";
import {
  bscWss,
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
  getWebSocketProvider,
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

  // add router abi in decoder
  abiDecoder.addABI(JSON.parse(cakeRouterAbi));

  const web3 = new Web3(bscHttps);
  const web3Wss = new Web3(getWebSocketProvider(bscWss));

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

  const account = await web3.eth.accounts.privateKeyToAccount(
    process.env.mtmsk_acc
  );

  //###########################################################
  // CONSTANTS changes
  //###########################################################
  // this flag will decide if a trade will be made or not
  const RESPOND_TO_EVENTS = true;
  const ETH_TO_SPEND = "0.01";
  const TIME_TO_MONITOR_IN_MINUTES = 1;
  const MONITOR_ONLY_LARGE_TXS = false; // will applicable only when RESPOND_TO_EVENTS is false
  //###########################################################

  let ano = await getPairInfo(cakeFactoryContract, tokenToSwap, wbnbAddress);
  logImportantMessage(`Pair address ${ano}`);

  // this emitter will notify if we found any liquidity add events
  let liquidityEventEmitter = new EventEmitter();

  liquidityEventEmitter.once("liquidity_added", (liquidityEvent: any) => {
    // swapExactETHForToken(
    //   "0.001",
    //   account,
    //   cakeRouterContract,
    //   wbnbAddress,
    //   liquidityEvent.token,
    //   1.0,
    //   web3
    // );
    logImportantMessage("In event liquidity found");
    console.log(liquidityEvent);
  });

  logTimestampedMessage("Going to subscribe...")
  let subscribeResponse = web3Wss.eth
    .subscribe(
      "pendingTransactions",
      function (error: any, pendingTransaction: any) {
        logTimestampedMessage(`first interaction - ${pendingTransaction}`);
        web3.eth
          .getTransaction(pendingTransaction)
          .then((tx: any) => {
            if (
              null != tx &&
              null != tx.to &&
              tx.to.toLowerCase() == cakeRouterContractAdd.toLowerCase()
            ) {
              logTimestampedMessage(`pancake tx: ${tx.hash}`);
              //TODO remove return statement after verifying transactions to cakerouter
              return;
              var methodInputs = abiDecoder.decodeMethod(tx.input);
              if (
                (methodInputs.name == "addLiquidity" &&
                  (tokenToSwap ==
                    web3.utils.toChecksumAddress(
                      methodInputs.params[0].value
                    ) ||
                    tokenToSwap ==
                      web3.utils.toChecksumAddress(
                        methodInputs.params[1].value
                      ))) ||
                (methodInputs.name == "addLiquidityETH" &&
                  tokenToSwap ==
                    web3.utils.toChecksumAddress(methodInputs.params[0].value))
              ) {
                logTimestampedMessage(
                  `Liquidity found @ ${pendingTransaction}`
                );
                liquidityEventEmitter.emit("liquidity_added", {
                  tx: pendingTransaction,
                  token: web3.utils.toChecksumAddress(
                    methodInputs.params[0].value
                  ),
                });
              }
            } else if (null == tx) {
              logTimestampedError(
                `fetching transaction ${pendingTransaction} returned null`
              );
            }
          })
          .catch((error: any) => {
            logTimestampedError(
              `problem fetching transaction ${pendingTransaction}`
            );
            console.error(error);
          });
      }
    )
    .on("connected", (data: any) =>
      logTimestampedMessage(`Subscribed successfully ${JSON.stringify(data)}`)
    )
    .on("error", (error: any) => console.error(error));
}

// call main method
main();
