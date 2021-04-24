const Web3 = require('web3');
const readline = require('readline');

/**
 * Sleep for specified time
 * @param ms number of milliseconds to sleep
 * @returns promise which will be resolved after ms
 */
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * sleep for specified seconds
 * @param sec seconds
 * @returns resolvable promise after specified seconds
 */
export function sleepForSeconds(sec: number){
    return sleep(sec * 1000);
}


/**
 * ask question and return result from user
 * @param query question to ask
 * @returns answer from user
 */
export function askQuestion(query:string) {
    const rlInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rlInterface.question(query, (ans:string) => {
        rlInterface.close();
        resolve(ans);
    }));
}

/**
 * append timestamp to message
 * @param message message
 */
export function logTimestampedMessage(message: string){
    console.log(`${new Date().toISOString()} - ${message}`);
}

/**
 * append timestamp to message
 * @param message message
 */
 export function logTimestampedError(message: string){
    console.error(`${new Date().toISOString()} - ${message}`);
}


/**
 * Log an important message
 * @param message message
 */
export function logImportantMessage(message: string) {
    console.log("")
    console.log("*******************************")
    console.log(logTimestampedMessage(message));
    console.log("*******************************")
    console.log("")
}


/**
 * get WebsocketProvider
 * @param url get websocket provider from url
 * @returns WebsocketProvider
 */
export function getWebSocketProvider(url: string) {
    // ==========
    // Websockets
    // ==========
    const wsProvider = new Web3.providers.WebsocketProvider(url, {
        headers: {
            Origin: "http://localhost"
        },
        reconnect: {
            auto: true,
            delay: 5000, // ms
            maxAttempts: 15,
            onTimeout: false
        }
    });
    return wsProvider;
}