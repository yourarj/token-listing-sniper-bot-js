import { Fetcher, ChainId, Token} from "@pancakeswap-libs/sdk"
import { JsonRpcProvider} from "@ethersproject/providers"


/**
 * Get Pancakeswap Pair information
 * @param tokenOne token one
 * @param tokenTwo token two
 * @param provider Provider used to get data
 * @param web3 Web3 instance
 */
 async function getPcsPairInfo(tokenOne: string, tokenTwo: string, provider: JsonRpcProvider, web3: any) {
    const tokenOneCheckSum = web3.utils.toChecksumAddress(tokenOne);
    const tokenTwoCheckSum = web3.utils.toChecksumAddress(tokenTwo);
  
    const tokenOneOb = new Token(ChainId.MAINNET, tokenOneCheckSum, 18);
    const tokenTwoOb = new Token(ChainId.MAINNET, tokenTwoCheckSum, 18);
  
    return Fetcher.fetchPairData(tokenOneOb, tokenTwoOb, provider);
  }
  