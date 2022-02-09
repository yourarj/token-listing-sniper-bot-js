import BN from "bn.js";
import { logTimestampedError, logTimestampedMessage } from "./utils";


/**
 * create, sign, send trasaction and get the transaction result
 * @param account account object
 * @param contract target contract object
 * @param spendAmount amount allowed to spend
 * @param contractMethod contract method populated with args
 * @param gasMultiplier multiplier for currentgas, in what folds gas should be given
 * @returns boolean representing status of the transaction
 */
export async function sendSignedTxAndGetResult(account: any, contract: any, spendAmount: any, contractMethod: any, gasMultiplier: number, web3: any) {
    const encodedAbi = contractMethod.encodeABI();

    let currentGasPrice = await web3.eth.getGasPrice();
    let proposedGasPrice = new BN(currentGasPrice).mul(new BN(gasMultiplier));
    logTimestampedMessage(`Currrent gas price: ${currentGasPrice}, and proposed price: ${proposedGasPrice}`);

    let tx = {
        from: account.address,
        to: contract._address,
        gas: 200000,
        gasPrice: proposedGasPrice.toString(),
        data: encodedAbi,
        value: spendAmount
    };

    let signedTxn = await account.signTransaction(tx);

    let response = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction)
        .on('transactionHash', function (hash: any) {
            logTimestampedMessage(`New transaction '${hash}' submitted`);
        });
    //.on('confirmation', function (confirmationNumber: any, receipt: any) {})
    //.on('receipt', function (receipt: any) { console.log('reciept');console.log(receipt);})
    //.on('error', function (error: any, receipt: any) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    //    console.log('error');
    //    console.error("Error:", error, "Receipt:", receipt);
    //});
    if(response.status){
        logTimestampedMessage(`Transaction ${response.transactionHash} successful`);
    } else {
        logTimestampedMessage(`Transaction ${response.transactionHash} FAILED`);
        logTimestampedError(`Transaction ${response.transactionHash} FAILED`);
    }
    return response.status;
}

/**
 * Return unixtimestamp with reference to current time
 * adding specified seconds
 * @param secondsToAdd seconds
 * @returns promise which will be resolved after seondsToAdd
 */
export function getTransactionDealine(secondsToAdd: number) {
    return new Date().getTime() + (secondsToAdd * 1000);
}

/**
 * get amount substracting slippage
 * @param amountBN 
 * @param slippage must not exceed 49.99%
 * @returns new amount substracting slippage
 */
export function getAmountConsideringSlippage(amountBN: BN, slippage: number) {
    return amountBN.sub(amountBN.mul(new BN(slippage)).div(new BN(100)))
}