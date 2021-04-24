const numberToBN = require('number-to-bn');

import { Contract } from "@ethersproject/contracts";
import BN from "bn.js";
import { logImportantMessage } from "../utils/utils";

/**
 * Swap Exact BNB for specified token 
 * @param tokenToGet 
 * @param provider 
 * @param web3 
 */
export async function swapExactETHForToken(exactEth: any, account: any, contract: Contract, wBnbAddress: string, tokenToGet: string, web3: any) {
    exactEth = web3.utils.toWei(exactEth);
    let tokenPath = [wBnbAddress, tokenToGet];
    let availableReserves = await contract.methods.getAmountsOut(exactEth.toString(), tokenPath).call();
    let maxOutPutBN = new BN(availableReserves[1]);

    let minOut = getAmountConsideringSlippage(maxOutPutBN, 49.99);
    logImportantMessage(`We will get ${web3.utils.fromWei(minOut)} - ${web3.utils.fromWei(maxOutPutBN)} for ${web3.utils.fromWei(exactEth)}`);

    let deadline = getTransactionDealine(30);

    const swap = contract.methods.swapExactETHForTokens(minOut.toString(), tokenPath, account.address, deadline);
    sendSignedTxAndGetResult(web3, account, contract, exactEth.toString(), swap);
}

/**
 * Swap Exact Token for BNB
 * @param tokenToSpend 
 * @param provider 
 * @param web3 
 */
 export async function swapExactTokensForETH(exactTokens: any, account: any, contract: Contract, tokenToSpend: string, wBnbAddress:string, web3: any) {
    exactTokens = web3.utils.toWei(exactTokens);
    let tokenPath = [tokenToSpend, wBnbAddress];
    let availableReserves = await contract.methods.getAmountsOut(exactTokens.toString(), tokenPath).call();
    let maxOutPutBN = new BN(availableReserves[1]);

    let minOut = getAmountConsideringSlippage(maxOutPutBN, 49.99);
    logImportantMessage(`We will get ${web3.utils.fromWei(minOut)} - ${web3.utils.fromWei(maxOutPutBN)} BNB for ${web3.utils.fromWei(exactTokens)}`);

    let deadline = getTransactionDealine(30);

    const swap = contract.methods.swapExactTokensForETH(exactTokens.toString(), minOut.toString(), tokenPath, account.address, deadline);
    sendSignedTxAndGetResult(web3, account, contract, 0, swap);
}

/**
 * create, sign, send trasaction and get the transaction result
 * @param web3 web3 object
 * @param account account object
 * @param contract target contract object
 * @param spendAmount amount allowed to spend
 * @param contractMethod contract method populated with args
 */
async function sendSignedTxAndGetResult(web3: any, account: any, contract: any, spendAmount: any, contractMethod: any,) {
    const encodedAbi = contractMethod.encodeABI();

    let currentGasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1.55));
    console.log(`Current gas price ${currentGasPrice}`);

    let tx = {
        from: account.address,
        to: contract._address,
        gas: 200000,
        gasPrice: currentGasPrice.toString(),
        data: encodedAbi,
        value: spendAmount
    };

    //return;

    let signedTxn = await account.signTransaction(tx);

    let response = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction)
        .on('transactionHash', function (hash: any) { console.log(`transactionHash - ${hash} - new Date().toISOString()`); })
        //.on('confirmation', function (confirmationNumber: any, receipt: any) {})
        .on('receipt', function (receipt: any) { console.log('reciept');console.log(receipt);})
        .on('error', function (error: any, receipt: any) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            console.log('error');
            console.error("Error:", error, "Receipt:", receipt);
        });

    console.log("after transaction");
    console.log(response);
}

/**
 * Return unixtimestamp with reference to current time
 * adding specified seconds
 * @param secondsToAdd seconds
 * @returns promise which will be resolved after seondsToAdd
 */
function getTransactionDealine(secondsToAdd: number) {
    return new Date().getTime() + (secondsToAdd * 1000);
}

/**
 * get amount substracting slippage
 * @param amountBN 
 * @param slippage must not exceed 49.99%
 * @returns new amount substracting slippage
 */
function getAmountConsideringSlippage(amountBN: BN, slippage: number) {
    return amountBN.sub(amountBN.mul(new BN(slippage)).div(new BN(100)))
}