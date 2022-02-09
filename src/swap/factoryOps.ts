import { Contract } from "@ethersproject/contracts";
import BN from "bn.js";
import { logTimestampedError } from "../utils/utils";

/**
 * Swap Exact Token for BNB
 * @param tokenToSpend
 * @param provider
 * @param web3
 */
export async function getPairInfo(
  contract: Contract,
  tokenA: string,
  tokenB: string
) {
  return await contract.methods
    .getPair(tokenA, tokenB)
    .call()
    .catch((error: any) => logTimestampedError("Error fetching pair info"));
}
