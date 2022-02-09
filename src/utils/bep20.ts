import { Contract } from "@ethersproject/contracts";
import Web3 from "web3";
import { sendSignedTxAndGetResult } from "./transaction";

/**
 * Check approved amount of spending for given spender on behalf of owner
 * @param owner owner of token on behalf of whome we want to spend
 * @param spender spender contract add
 * @param contract contract object of token to check approval of
 * @param web3 web3 object
 * @returns allowed spend amount
 */
export async function checkTokenAllowance(owner: string, spender: string, contract: Contract, web3: any) {
    return await contract.methods.allowance(owner, spender).call();
}

/**
 * Get symbol name
 * @param contract contract object of token
 * @param web3 web3 object
 * @returns string symbol
 */
export async function getSymbol(contract: Contract, web3: any) {
    return await contract.methods.symbol().call();
}

/**
 * Get balance of account name
 * @param contract contract object of token
 * @param web3 web3 object
 * @returns string symbol
 */
export async function getBalance(accountAdd: string, contract: Contract, web3: any) {
    return await contract.methods.balanceOf(accountAdd).call();
}

/**
 * approve spend on account
 * @param spender spender address
 * @param amount amount to allow
 * @param contract contract object
 * @param account account object to sign
 * @returns boolean representing status of transaction
 */
export async function approveSpend(spender: string, amount: string, contract: Contract, account: any, web3: any) {
    const swap = contract.methods.approve(spender, amount);
    return await sendSignedTxAndGetResult(account, contract, 0, swap, 1.0, web3);
}
