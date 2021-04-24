const Web3 = require('web3');
const fs = require('fs');
const numberToBN = require('number-to-bn');
const BN = require('bn.js');
const abiDecoder = require('abi-decoder');

import { Contract } from "@ethersproject/contracts";
import { bscHttps, cakeRouterContractAdd, cakeFactoryContractAdd, tokenToSwap, wbnbAddress } from "./constants/constantsMainnet"
import { logImportantMessage, logTimestampedMessage, logTimestampedError, sleep, sleepForSeconds, askQuestion } from "./utils/utils";
import { swapExactETHForToken, swapExactTokensForETH } from "./swap/tokenSwap"
import { getPairInfo } from "./swap/factoryOps";


/**
 * Main Function
 */
async function main() {
  console.log("Execution started" + new Date());

  const cakeFactoryAbi = fs.readFileSync('./src/config/abi/pancakeswap-factory.json', 'utf8');
  const cakeRouterAbi = fs.readFileSync('./src/config/abi/pancakeswap-router.json', 'utf8');

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

  const account = await web3.eth.accounts.privateKeyToAccount(process.env.mtmsk_acc);

  //###########################################################
  // CONSTANTS changes
  //###########################################################
  // this flag will decide if a trade will be made or not
  const RESPOND_TO_EVENTS = true;
  const ETH_TO_SPEND = '0.01';
  const TIME_TO_MONITOR_IN_MINUTES = 60;

  //###########################################################

  const cakeRouterContract: Contract = new web3.eth.Contract(JSON.parse(cakeRouterAbi), cakeRouterContractAdd);
  const cakeFactoryContract: Contract = new web3.eth.Contract(JSON.parse(cakeFactoryAbi), cakeFactoryContractAdd);

  logTimestampedMessage("monitoring started");

  if (await monitorBlockForTime(web3, cakeRouterContractAdd, TIME_TO_MONITOR_IN_MINUTES, RESPOND_TO_EVENTS) && RESPOND_TO_EVENTS) {

    logImportantMessage(`FOUND LIQUIDITY ADD for '${tokenToSwap}' waiting for 2 minutes`);

    // wait for two minutes to let bot prevention part go away
    // await sleepForSeconds(121);
    swapExactETHForToken(ETH_TO_SPEND, account, cakeRouterContract, wbnbAddress, tokenToSwap, web3);

    //await askQuestion("Press ENTER when your want to sell tokens")
    //swapExactTokensForETH('1', account, pcsRouterContract, tokenToSwap, wbnbAddress, web3);
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
async function monitorBlockForTime(web3: any, contractAddressToMonitor: string, monitorForMinutes: number, respondToEvents: boolean) {
  let startedFromBlock = 0;
  let fromBlockNumber = 0
  let toBlockNumber = 0;
  let monitorUntilTime = new Date().getTime() + (monitorForMinutes * 60 * 1000);
  let liquidityFound = false;
  let transHash = '';
  let blockFetchSuccessful = true;

  while ((!respondToEvents && new Date().getTime() < monitorUntilTime)
    || (!liquidityFound && new Date().getTime() < monitorUntilTime)) {

    try {
      toBlockNumber = await web3.eth.getBlockNumber();

      if (fromBlockNumber > toBlockNumber) {
        // wait for 500 milliseconds if new block is not yet mined
        await sleep(500);
        continue;
      }

      if (fromBlockNumber == 0) {
        //for the first execution only 
        startedFromBlock = toBlockNumber;
        fromBlockNumber = toBlockNumber;
      }

      let result = await getTransactionsByAccount(web3, contractAddressToMonitor, fromBlockNumber, toBlockNumber, startedFromBlock, respondToEvents);
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
        logTimestampedError('There was problem fetching block sleeping to allow block to sync');
        await sleep(250);
      }

    } catch (err) {
      logTimestampedError(`Exception occurred ${err}`);
      console.error(err);
      logTimestampedError(`Exception occurred between block ${fromBlockNumber} - ${toBlockNumber}`);
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
async function getTransactionsByAccount(web3: any, contractAddressToMonitor: string, fromBlockNumber: number, toBlockNumber: number, startedFromBlock: number, respondToEvent: boolean) {

  // indicate if any block fetch operation result was null
  let blockFetchSuccessful = true;
  // Flag represent if liquidity add event was found or not
  let addLiquidityEventFound = false;
  // transaction hash of that event
  let tranxHash = "";

  if ((toBlockNumber - startedFromBlock) % 10 == 0) {
    logTimestampedMessage(`Searching "${tokenToSwap}" liquidity events on pancakeswap router within blocks ${fromBlockNumber} - ${toBlockNumber}`);
  }

  let promiseIterable = [];
  for (let i = fromBlockNumber; i <= toBlockNumber; i++) {
    let block = web3.eth.getBlock(i, true);
    promiseIterable.push(block);
  }

  let result: Object[] = await Promise.all(promiseIterable);

  if (result.filter((block: any) => null == block).length > 0) {
    // one of the getblock operation in batch return null
    // i.e. block was not synced
    blockFetchSuccessful = false;
  }

  // enter only if all blocks fetch was successful
  // else skip the block
  if (blockFetchSuccessful) {

    let flatmappedTrans = result.flatMap((block: any) => block.transactions);

    flatmappedTrans.forEach(function (tx: any) {
      if (contractAddressToMonitor == tx.to) {
        var methodInputs = abiDecoder.decodeMethod(tx.input);

        try {
          if (methodInputs.name == "addLiquidityETH"
            && tokenToSwap == web3.utils.toChecksumAddress(methodInputs.params[0].value)) {
            logTimestampedMessage(`${tx.hash} - Liquidity added [${web3.utils.fromWei(methodInputs.params[2].value)} ${methodInputs.params[0].value} - ${web3.utils.fromWei(methodInputs.params[3].value)} BNB`);
            tranxHash = tx.hash;
            addLiquidityEventFound = true;

          } else if (methodInputs.name == "addLiquidity"
            && (tokenToSwap == web3.utils.toChecksumAddress(methodInputs.params[0].value) ||
              tokenToSwap == web3.utils.toChecksumAddress(methodInputs.params[1].value))) {
            logTimestampedMessage(`${tx.hash} - Liquidity added [${web3.utils.fromWei(methodInputs.params[2].value)} ${methodInputs.params[0].value} - ${web3.utils.fromWei(methodInputs.params[3].value)} ${methodInputs.params[1].value}]`);
            tranxHash = tx.hash;
            addLiquidityEventFound = true;

          } else if (!respondToEvent && methodInputs.name.toUpperCase() == "addLiquidityETH".toUpperCase()) {
            logTimestampedMessage(`${tx.hash} - Liquidity added [${web3.utils.fromWei(methodInputs.params[2].value)} ${methodInputs.params[0].value} - ${web3.utils.fromWei(methodInputs.params[3].value)} BNB`);

          } else if (!respondToEvent && methodInputs.name.toUpperCase() == "addLiquidity".toUpperCase()) {
            logTimestampedMessage(`${tx.hash} - Liquidity added [${web3.utils.fromWei(methodInputs.params[2].value)} ${methodInputs.params[0].value} - ${web3.utils.fromWei(methodInputs.params[3].value)} ${methodInputs.params[1].value}]`);
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

  return {
    'liquidityFound': addLiquidityEventFound,
    'lastBlockNumber': toBlockNumber,
    'transHash': tranxHash,
    'blockFetchSuccessful': blockFetchSuccessful
  }
}


// call main method
main();