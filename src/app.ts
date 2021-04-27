const Web3 = require("web3");
const fs = require("fs");
const numberToBN = require("number-to-bn");
const BN = require("bn.js");
const abiDecoder = require("abi-decoder");
const ebf = require("ethereum-bloom-filters");

import { Contract } from "@ethersproject/contracts";
import {
  bscHttps,
  cakeRouterContractAdd,
  cakeFactoryContractAdd,
  tokenToSwap,
  wbnbAddress,
} from "./constants/constantsMainnet";
import {
  logImportantMessage,
  logTimestampedMessage,
  logTimestampedError,
  sleep,
  sleepForSeconds,
  askQuestion,
  doesBloomContainAddresses,
} from "./utils/utils";
import {
  getOutputToken,
  swapExactETHForToken,
  swapExactTokensForETH,
} from "./swap/tokenSwap";
import {
  approveSpend,
  checkTokenAllowance,
  getBalance,
  getSymbol,
} from "./utils/bep20";
import { getPairInfo } from "./swap/factoryOps";

/**
 * Main Function
 */
async function main() {
  logTimestampedMessage("Execution started");

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

  // overloading following method bign issue of 53 bit
  // observed while using getBlock method
  web3.utils.hexToNumber = (v: any) => {
    if (!v) return v;
    try {
      return numberToBN(v).toNumber();
    } catch (e) {
      return numberToBN(v).toString();
    }
  };

  const account = await web3.eth.accounts.privateKeyToAccount(
    process.env.mtmsk_acc
  );

  //###########################################################
  // CONSTANTS changes
  //###########################################################
  // this flag will decide if a trade will be made or not
  const RESPOND_TO_EVENTS = true;
  const ETH_TO_SPEND = "0.45";
  const TIME_TO_MONITOR_IN_MINUTES = 15;
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

  let spendAmountToAllow = web3.utils.toWei("1000000000");
  let allowance = await checkTokenAllowance(
    account.address,
    cakeRouterContractAdd,
    tokenToSwapContract,
    web3
  );

  if (allowance != spendAmountToAllow && RESPOND_TO_EVENTS) {
    logTimestampedMessage(
      `Currently spender has allowance of '${allowance}', going for spend approval`
    );
    let approveAcctionResult = await approveSpend(
      cakeRouterContractAdd,
      web3.utils.toWei("1000000000").toString(),
      tokenToSwapContract,
      account,
      web3
    );
    if (approveAcctionResult) {
      allowance = await checkTokenAllowance(
        account.address,
        cakeRouterContractAdd,
        tokenToSwapContract,
        web3
      );
      logTimestampedMessage(`New approved spend allowance is '${allowance}'`);
    } else {
      logTimestampedError("spend approval failed. Kindly retry");
      throw new Error("Spend approval failed");
    }
  }

  let pairAddress = await getPairInfo(
    cakeFactoryContract,
    tokenToSwap,
    wbnbAddress
  );

  logImportantMessage(`Pair address ${pairAddress}`);

  if (
    (await monitorBlockForTime(
      web3,
      cakeRouterContractAdd,
      TIME_TO_MONITOR_IN_MINUTES,
      RESPOND_TO_EVENTS,
      MONITOR_ONLY_LARGE_TXS
    )) &&
    RESPOND_TO_EVENTS
  ) {
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

/**
 * Monitor blockchain for specified time
 * @param web3 web3 object
 * @param contractAddressToMonitor contract address to monitor
 * @param monitorForMinutes monitor for specified
 * @param respondToEvents should take actions to events on blockchain
 * @returns flag if matching event found or not
 */
async function monitorBlockForTime(
  web3: any,
  contractAddressToMonitor: string,
  monitorForMinutes: number,
  respondToEvents: boolean,
  monitorOnlyLargeTx: boolean
) {
  let startedFromBlock = 0;
  let fromBlockNumber = 0;
  let toBlockNumber = 0;
  let monitorUntilTime = new Date().getTime() + monitorForMinutes * 60 * 1000;
  let liquidityFound = false;
  let transHash = "";
  let blockFetchSuccessful = true;

  while (
    (!respondToEvents && new Date().getTime() < monitorUntilTime) ||
    (!liquidityFound && new Date().getTime() < monitorUntilTime)
  ) {
    try {
      toBlockNumber = await web3.eth.getBlockNumber();

      if (fromBlockNumber > toBlockNumber) {
        // wait for 500 milliseconds if new block is not yet mined
        await sleep(50);
        continue;
      }

      if (fromBlockNumber == 0) {
        //for the first execution only
        startedFromBlock = toBlockNumber;
        fromBlockNumber = toBlockNumber;
      }

      let result = await getTransactionsByAccount(
        web3,
        contractAddressToMonitor,
        fromBlockNumber,
        toBlockNumber,
        startedFromBlock,
        respondToEvents,
        monitorOnlyLargeTx
      );
      fromBlockNumber = result.lastBlockNumber;
      liquidityFound = result.liquidityFound;
      transHash = result.transHash;
      blockFetchSuccessful = result.blockFetchSuccessful;

      // if there was some problem in fetching block in earlier trans
      // don't update from pointer because we want to refetch it.
      if (blockFetchSuccessful) {
        fromBlockNumber++;
      } else {
        // give block time to get synced
        logTimestampedError(
          "There was problem fetching block sleeping to allow block to sync"
        );
        await sleep(50);
      }
    } catch (err) {
      logTimestampedError(`Exception occurred ${err}`);
      console.error(err);
      logTimestampedError(
        `Exception occurred between block ${fromBlockNumber} - ${toBlockNumber}`
      );
    }
  }
  if (liquidityFound) {
    logTimestampedMessage(`Liquidity found at tx ${transHash}`);
  }
  return liquidityFound;
}

/**
 * Monitor the specified range of blockchai blocks for given contract liquidity events
 * @param web3 Web3 Object
 * @param contractAddressToMonitor contract address to monitor
 * @param fromBlockNumber from which block number we want to monitor
 * @param toBlockNumber upto which block number we want to monitor
 * @param startedFromBlock the starting block
 * @param respondToEvent should respond to event and break out of loop
 * @returns liquidity info object
 */
async function getTransactionsByAccount(
  web3: any,
  contractAddressToMonitor: string,
  fromBlockNumber: number,
  toBlockNumber: number,
  startedFromBlock: number,
  respondToEvent: boolean,
  monitorOnlyLargeTx: boolean
) {
  // indicate if any block fetch operation result was null
  let blockFetchSuccessful = true;
  // Flag represent if liquidity add event was found or not
  let addLiquidityEventFound = false;
  // transaction hash of that event
  let tranxHash = "";

  logTimestampedMessage(
    `Searching "${tokenToSwap}" liquidity events on pancakeswap router within blocks ${fromBlockNumber} - ${toBlockNumber}`
  );

  for (let blockPointer = fromBlockNumber; blockPointer <= toBlockNumber; ) {
    let block = await web3.eth.getBlock(blockPointer, false);
    if (null == block) {
      await sleep(100);
      continue;
    }
    logTimestampedMessage(`block-fetch-complete: ${blockPointer}`);
    if (doesBloomContainAddresses(block, cakeRouterContractAdd, tokenToSwap)) {
      let completeBlock = await web3.eth.getBlock(blockPointer, true);
      completeBlock.transactions.forEach(function (tx: any) {
        if (contractAddressToMonitor == tx.to) {
          var methodInputs = abiDecoder.decodeMethod(tx.input);

          try {
            if (
              methodInputs.name == "addLiquidityETH" &&
              tokenToSwap ==
                web3.utils.toChecksumAddress(methodInputs.params[0].value)
            ) {
              logTimestampedMessage(
                `${tx.hash} - Liquidity added [${web3.utils.fromWei(
                  methodInputs.params[2].value
                )} ${methodInputs.params[0].value} - ${web3.utils.fromWei(
                  methodInputs.params[3].value
                )} BNB`
              );
              tranxHash = tx.hash;
              addLiquidityEventFound = true;
            } else if (
              methodInputs.name == "addLiquidity" &&
              (tokenToSwap ==
                web3.utils.toChecksumAddress(methodInputs.params[0].value) ||
                tokenToSwap ==
                  web3.utils.toChecksumAddress(methodInputs.params[1].value))
            ) {
              logTimestampedMessage(
                `${tx.hash} - Liquidity added [${web3.utils.fromWei(
                  methodInputs.params[2].value
                )} ${methodInputs.params[0].value} - ${web3.utils.fromWei(
                  methodInputs.params[3].value
                )} ${methodInputs.params[1].value}]`
              );
              tranxHash = tx.hash;
              addLiquidityEventFound = true;
            } else if (
              !respondToEvent &&
              methodInputs.name.toUpperCase() == "addLiquidityETH".toUpperCase()
            ) {
              if (!monitorOnlyLargeTx) {
                logTimestampedMessage(
                  `${tx.hash} - Liquidity added [${web3.utils.fromWei(
                    methodInputs.params[2].value
                  )} ${methodInputs.params[0].value} - ${web3.utils.fromWei(
                    methodInputs.params[3].value
                  )} BNB`
                );
              } else if (
                100 < web3.utils.fromWei(methodInputs.params[3].value)
              ) {
                logTimestampedMessage(
                  `${tx.hash} - Big Liquidity added of ${web3.utils.fromWei(
                    methodInputs.params[3].value
                  )} BNB`
                );
              }
            } else if (
              !respondToEvent &&
              methodInputs.name.toUpperCase() == "addLiquidity".toUpperCase()
            ) {
              if (!monitorOnlyLargeTx) {
                logTimestampedMessage(
                  `${tx.hash} - Liquidity added [${web3.utils.fromWei(
                    methodInputs.params[2].value
                  )} ${methodInputs.params[0].value} - ${web3.utils.fromWei(
                    methodInputs.params[3].value
                  )} ${methodInputs.params[1].value}]`
                );
              }
            }
          } catch (e) {
            logTimestampedError(`Skipping invalid transaction ${tx.hash}`);
          }

          // Do something with the trasaction
          /*
          console.log("  tx hash  : " + tx.hash + "\n"
            + "   nonce           : " + tx.nonce + "\n"
            + "   blockHash       : " + tx.blockHash + "\n"
            + "   blockNumber     : " + tx.blockNumber + "\n"
            + "   transactionIndex: " + tx.transactionIndex + "\n"
            + "   from            : " + tx.from + "\n"
            + "   to              : " + tx.to + "\n"
            + "   value           : " + tx.value + "\n"
            //+ "   time            : " + block.timestamp + " " + new Date(block.timestamp * 1000).toUTCString() + "\n"
            + "   gasPrice        : " + tx.gasPrice + "\n"
            + "   gas             : " + tx.gas + "\n"
            + "   input           : " + abiDecoder.decodeMethod(tx.input));
          */
          //}
        }
      });
    }
    // as block scan was successful lets move pointer i to next block
    blockPointer++;
  }

  return {
    liquidityFound: addLiquidityEventFound,
    lastBlockNumber: toBlockNumber,
    transHash: tranxHash,
    blockFetchSuccessful: blockFetchSuccessful,
  };
}

// call main method
main();
