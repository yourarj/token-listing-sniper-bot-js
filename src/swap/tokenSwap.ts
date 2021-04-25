import Web3 from 'web3';
import { Contract } from "@ethersproject/contracts";
import BN from "bn.js";
import { getAmountConsideringSlippage, getTransactionDealine, sendSignedTxAndGetResult } from "../utils/transaction";
import { logImportantMessage, logTimestampedMessage } from "../utils/utils";

/**
 * Swap Exact BNB for specified token 
 * @param tokenToGet 
 * @param provider 
 * @param web3 
 * @returns boolean representing success of operation
 */
export async function swapExactETHForToken(exactEth: any, account: any, contract: Contract, wBnbAddress: string, tokenToGet: string, web3:any) {
    exactEth = Web3.utils.toWei(exactEth);
    let tokenPath = [wBnbAddress, tokenToGet];
    let availableReserves = await contract.methods.getAmountsOut(exactEth.toString(), tokenPath).call();
    let maxOutPutBN = new BN(availableReserves[1]);

    let minOut = getAmountConsideringSlippage(maxOutPutBN, 49.99);
    logImportantMessage(`We will get ${Web3.utils.fromWei(minOut)} - ${Web3.utils.fromWei(maxOutPutBN)} for ${Web3.utils.fromWei(exactEth)}`);

    let deadline = getTransactionDealine(30);

    const swap = contract.methods.swapExactETHForTokens(minOut.toString(), tokenPath, account.address, deadline);
    return await sendSignedTxAndGetResult(account, contract, exactEth.toString(), swap, 1.0, web3);
}

/**
 * Swap Exact Token for BNB
 * @param tokenToSpend 
 * @param provider 
 * @param web3 
 * @returns boolean depending on success of operation
 */
 export async function swapExactTokensForETH(exactTokens: any, account: any, contract: Contract, tokenToSpend: string, wBnbAddress:string, web3:any) {
    exactTokens = Web3.utils.toWei(exactTokens);
    let tokenPath = [tokenToSpend, wBnbAddress];
    let availableReserves = await contract.methods.getAmountsOut(exactTokens.toString(), tokenPath).call();
    let maxOutPutBN = new BN(availableReserves[1]);

    let minOut = getAmountConsideringSlippage(maxOutPutBN, 49.99);
    logImportantMessage(`We will get ${Web3.utils.fromWei(minOut)} - ${Web3.utils.fromWei(maxOutPutBN)} BNB for ${Web3.utils.fromWei(exactTokens)}`);

    let deadline = getTransactionDealine(30);

    const swap = contract.methods.swapExactTokensForETH(exactTokens.toString(), minOut.toString(), tokenPath, account.address, deadline);
    return await sendSignedTxAndGetResult(account, contract, 0, swap, 1.0, web3);
}

/**
 * Get current output tokens for input address
 * @param tokenSellAmount amount of token to sell
 * @param tokenToSell address of token to sell
 * @param tokenToGet address of token to get
 * @param contract contract object
 * @returns output amount BN
 */
export async function getOutputToken(tokenSellAmount:string, tokenToSell:string, tokenToGet:string, contract:Contract){
    let tokenPath = [tokenToSell, tokenToGet];
    let availableReserves = await contract.methods.getAmountsOut(tokenSellAmount, tokenPath).call();
    return new BN(availableReserves[1]);
}