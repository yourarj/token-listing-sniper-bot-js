import { Contract } from "@ethersproject/contracts";

// trying to watch all events
async function wathcContractEvents(contract: Contract, web3Wss: any) {
    console.log("\n\n Attaching eventWatcher\n\n");
    contract.events.allEvents(function (error: any, event: any) {
      console.log(event);
      //console.log(new Date().toUTCString() + " - txn - " + event.transactionHash + " - data - " + web3.utils.hexToAscii(event.raw.data) + " - " + event.data.raw);
    }
    )
      .on("connected", function (subscriptionId: any) {
        console.log("subscription ID - " + subscriptionId);
      })
      .on('data', function (event: any) {
        console.log("data callback - " + event.transactionHash + " - " + event.raw.data);
        console.log(event)
      })
      .on('changed', function (event: any) {
        console.log("changed");
        console.log(event);
      })
      .on('error', function (error: any, receipt: any) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        console.log("###### Error occurred");
        console.log(receipt);
        console.log(error);
      });
  }
  