import { Contract } from "@ethersproject/contracts";
import Web3 from "web3";
import { approveSpend, checkTokenAllowance } from "./bep20";
const readline = require("readline");
const ebf = require("ethereum-bloom-filters");
const numberToBN = require("number-to-bn");

/**
 * Sleep for specified time
 * @param ms number of milliseconds to sleep
 * @returns promise which will be resolved after ms
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * sleep for specified seconds
 * @param sec seconds
 * @returns resolvable promise after specified seconds
 */
export function sleepForSeconds(sec: number) {
  return sleep(sec * 1000);
}

/**
 * ask question and return result from user
 * @param query question to ask
 * @returns answer from user
 */
export function askQuestion(query: string) {
  const rlInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rlInterface.question(query, (ans: string) => {
      rlInterface.close();
      resolve(ans);
    })
  );
}

/**
 * append timestamp to message
 * @param message message
 */
export function logTimestampedMessage(message: string) {
  console.log(`${new Date().toISOString()} - ${message}`);
}

/**
 * append timestamp to message
 * @param message message
 */
export function logTimestampedError(message: string) {
  console.error(`${new Date().toISOString()} - ${message}`);
}

/**
 * Log an important message
 * @param message message
 */
export function logImportantMessage(message: string) {
  console.log("");
  console.log("*******************************");
  logTimestampedMessage(message);
  console.log("*******************************");
  console.log("");
}

/**
 * get WebsocketProvider
 * @param url get websocket provider from url
 * @returns WebsocketProvider
 */
export function getWebSocketProvider(url: string) {

  var webSocketConnectionOption = {
    timeout: 30000, // ms

    // Useful for credentialed urls, e.g: ws://username:password@localhost:8546
    // headers: {
    //   authorization: 'Basic username:password'
    // },

    clientConfig: {
      // Useful if requests are large
      maxReceivedFrameSize: 100000000,   // bytes - default: 1MiB
      maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

      // Useful to keep a connection alive
      keepalive: true,
      keepaliveInterval: 60000 // ms
    },

    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false
    }
};
  // ==========
  // Websockets
  // ==========
  const wsProvider = new Web3.providers.WebsocketProvider(url, webSocketConnectionOption);
  return wsProvider;
}

/**
 * Inspect logsBloom for presence of contract and address in block
 */
export function doesBloomContainAddresses(
  block: any,
  contractAddress: string,
  tokenAddress: string
) {
  let isBlockPositive = false;
  if (
    ebf.isUserEthereumAddressInBloom(block.logsBloom, contractAddress) &&
    ebf.isContractAddressInBloom(block.logsBloom, tokenAddress)
  ) {
    //console.log(block)
    logTimestampedMessage(`Block ${block.number} bloom return positive results`);
    isBlockPositive = true;
  }
  return isBlockPositive;
}

/**
 * Get Http Providers
 * @param list rpc server list
 * @returns mapped Web3 Http providers
 */
export function getHttpProviders(list: string[]) {
  return list.map((rpcUrl) => {
    let web3 = new Web3(rpcUrl);
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
    return web3;
  });
}

/**
 * Do the spend approval related ceremony
 * @param spenderAddress spender address
 * @param tokenContract tokens willing to spend
 * @param account account object to sign tx
 * @param web3 web3 obj to perform operation
 */
export function doSpendApproval(spenderAddress:string, tokenContract: Contract, account:any, web3:any){
  let spendAmountToAllow = web3.utils.toWei("1000000000");
  let allowance = checkTokenAllowance(
    account.address,
    spenderAddress,
    tokenContract,
    web3
  );

  if (allowance != spendAmountToAllow) {
    logTimestampedMessage(
      `Currently spender has allowance of '${allowance}', going for spend approval`
    );
    let approveAcctionResult = approveSpend(
      spenderAddress,
      spendAmountToAllow.toString(),
      tokenContract,
      account,
      web3
    );
    if (approveAcctionResult) {
      allowance = checkTokenAllowance(
        account.address,
        spenderAddress,
        tokenContract,
        web3
      );
      logTimestampedMessage(`New approved spend allowance is '${allowance}'`);
    } else {
      logTimestampedError("spend approval failed. Kindly retry");
      throw new Error("Spend approval failed");
    }
  }

}
