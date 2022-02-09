import {
  doesBloomContainAddresses,
  logTimestampedError,
  logTimestampedMessage,
  sleep,
} from "./utils";
const Web3 = require("web3");
const EventEmitter = require("events");

/**
 * Watch for new blocks on block chain
 * @param providers string list of rpc servers
 * @param monitorForMinutes minutes to monitor
 * @returns eventemitter
 */
export async function watchForNewBlocks(
  providers: any[],
  monitorForMinutes: number
) {
  let eventEmitter = new EventEmitter();
  monitorNewlyMinedBlocks(providers, monitorForMinutes, eventEmitter);

  return eventEmitter;
}

/**
 * Watch out for newly mined blocks provided rpc servers
 * @param providers Http Providers
 * @param monitorForMinutes number of minutes to monitor
 * @param eventEmitter eventemitter
 */
async function monitorNewlyMinedBlocks(
  providers: any[],
  monitorForMinutes: number,
  eventEmitter: any
) {
  let monitorUntilTime = new Date().getTime() + monitorForMinutes * 60 * 1000;

  for (let counter = 0; new Date().getTime() < monitorUntilTime; ) {
    providers[counter].eth
      .getBlockNumber()
      .then((num: any) => {
        eventEmitter.emit("new_block", {
          blockNumber: num,
          fetchedAt: new Date(),
          server: providers[counter]._requestManager.provider.host,
          web3Instance: providers[counter],
        });
      })
      .catch((error: any) =>
        logTimestampedError(
          `ignorable: ${providers[counter]._requestManager.provider.host} getBlockNumber failed`
        )
      );
    counter++;
    if (counter == providers.length) {
      counter = 0;
      await sleep(100);
    }
  }
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
export async function findLiquidityForAddressInBlock(
  web3: any,
  abiDecoder: any,
  contractAddressToMonitor: string,
  tokenToMonitor: string,
  fromBlockNumber: number,
  toBlockNumber: number,
  respondToEvent: boolean,
  monitorOnlyLargeTx: boolean,
  liquidityEventEmitter: any
) {
  logTimestampedMessage(
    `Searching "${tokenToMonitor}" liquidity events on pancakeswap router within blocks ${fromBlockNumber} - ${toBlockNumber}`
  );

  for (let blockPointer = fromBlockNumber; blockPointer <= toBlockNumber; ) {
    let block: any = null;
    try {
      block = await web3.eth.getBlock(blockPointer, false);
    } catch (error) {
      // expecting RPC errros
      logTimestampedError("getBlock headers failed");
      console.error(error);
    }
    if (null == block) {
      await sleep(100);
      continue;
    }

    logTimestampedMessage(
      `fetched block mined at ${block.timestamp}- ${new Date(
        block.timestamp * 1000
      ).toISOString()}`
    );
    // if (
    //   doesBloomContainAddresses(block, contractAddressToMonitor, tokenToMonitor)
    // ) {
      let completeBlock: any = null;
      try {
        completeBlock = await web3.eth.getBlock(blockPointer, true);
      } catch (error) {
        // expecting RPC errors only
        await sleep(100);
        continue;
      }
      completeBlock.transactions.forEach(function (tx: any) {
        if (contractAddressToMonitor == tx.to) {
          var methodInputs = abiDecoder.decodeMethod(tx.input);

          try {
            if (
              methodInputs.name == "addLiquidityETH" &&
              tokenToMonitor ==
                web3.utils.toChecksumAddress(methodInputs.params[0].value)
            ) {
              logTimestampedMessage(
                `${tx.hash} - Liquidity added [${web3.utils.fromWei(
                  methodInputs.params[2].value
                )} ${methodInputs.params[0].value} - ${web3.utils.fromWei(
                  methodInputs.params[3].value
                )} BNB`
              );
              liquidityEventEmitter.emit("liquidity_added", {
                liquidityAdded: true,
                transaction: tx.hash,
                block: tx.blockNumber,
              });
            } else if (
              methodInputs.name == "addLiquidity" &&
              (tokenToMonitor ==
                web3.utils.toChecksumAddress(methodInputs.params[0].value) ||
                tokenToMonitor ==
                  web3.utils.toChecksumAddress(methodInputs.params[1].value))
            ) {
              logTimestampedMessage(
                `${tx.hash} - Liquidity added [${web3.utils.fromWei(
                  methodInputs.params[2].value
                )} ${methodInputs.params[0].value} - ${web3.utils.fromWei(
                  methodInputs.params[3].value
                )} ${methodInputs.params[1].value}]`
              );
              liquidityEventEmitter.emit("liquidity_added", {
                liquidityAdded: true,
                transaction: tx.hash,
                block: tx.blockNumber,
              });
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
    // }
    // as block scan was successful lets move pointer i to next block
    blockPointer++;
  }
}
