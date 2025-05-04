import { ethers } from 'ethers';
import { VeritasXAbi } from './VeritasX.abi.js';
import { hashTweetContent } from './helpers.js';

const CONTRACT_ADDRESS = '0x307bDca58c2761F9be800790C900e554E43250a9';
const MANTLE_SEPOLIA_RPC_URL = 'https://rpc.sepolia.mantle.xyz';
const MANTLE_SEPOLIA_CHAIN_ID_DEC = 5003;
const MAX_BLOCK_RANGE = 9999;
const CONTRACT_CREATION_BLOCK = 22398521; // <-- Bloque de inicio!

let contractReadOnly = null;
let minStakeAmount = BigInt(0);
let isReadOnlyReady = false;
let readOnlyInitializationPromise = null;
let readOnlyProvider = null;

async function initializeReadOnly() {
    if (readOnlyInitializationPromise) return await readOnlyInitializationPromise;
    if (isReadOnlyReady) return { success: true, alreadyReady: true };
    console.log("VeritasXService: Initializing Read-Only Service...");
    readOnlyInitializationPromise = (async () => {
        try {
            isReadOnlyReady = false; contractReadOnly = null; minStakeAmount = BigInt(0); readOnlyProvider = null;
            if (!ethers.isAddress(CONTRACT_ADDRESS)) throw new Error(`Invalid contract address: ${CONTRACT_ADDRESS}`);
            readOnlyProvider = new ethers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
            const network = await readOnlyProvider.getNetwork();
            if (network.chainId !== BigInt(MANTLE_SEPOLIA_CHAIN_ID_DEC)) throw new Error(`RPC ${MANTLE_SEPOLIA_RPC_URL} not on Mantle Sepolia (ID: ${MANTLE_SEPOLIA_CHAIN_ID_DEC}). Current: ${network.chainId}`);
            console.log("VeritasXService: Read-only provider connected to Chain ID:", network.chainId.toString());
            contractReadOnly = new ethers.Contract(CONTRACT_ADDRESS, VeritasXAbi, readOnlyProvider);
            try {
                 minStakeAmount = await contractReadOnly.minStakeAmount();
                 console.log("VeritasXService: Read-only service initialized. Min Stake:", ethers.formatEther(minStakeAmount), "MNT.");
            } catch (contractError) { throw new Error(`Contract connection failed: ${contractError.message}`); }
            isReadOnlyReady = true;
            return { success: true };
        } catch (error) {
            console.error("VeritasXService: Read-Only Initialization FAILED:", error);
            contractReadOnly = null; minStakeAmount = BigInt(0); isReadOnlyReady = false; readOnlyProvider = null; readOnlyInitializationPromise = null;
            return { success: false, error: `Failed to initialize read-only service: ${error.message}` };
        }
    })();
    return await readOnlyInitializationPromise;
}

initializeReadOnly().then(result => {
     if (!result.success) console.error("VeritasXService: Auto-initialization failed.", result.error);
     else console.log(`VeritasXService: Auto-initialization ${result.alreadyReady ? 'already complete' : 'successful'}.`);
});

async function ensureInitialized() {
    const result = await initializeReadOnly();
    if (!result.success) throw new Error(result.error || "VeritasX Service (read-only) failed to initialize.");
    if (!isReadOnlyReady || !contractReadOnly || !readOnlyProvider) throw new Error("VeritasX Service (read-only) state inconsistency after init.");
    return { contractInstance: contractReadOnly, provider: readOnlyProvider };
}

function isServiceReady() { return isReadOnlyReady; }

async function getTweetInfo(tweetId) {
    const { contractInstance } = await ensureInitialized();
    if (!tweetId || typeof tweetId !== 'string' || tweetId.trim() === '') return null;
    try {
        const result = await contractInstance.getTweetInfo(tweetId);
        if (!result || !result.reporter || result.reporter === ethers.ZeroAddress) return null;
        return {
            tweetId: result.tweetId, contentHash: result.contentHash, reporter: result.reporter,
            reportTime: Number(result.reportTime), resolved: result.resolved, status: Number(result.status),
            stakePool: result.stakePool, totalStakers: Number(result.totalStakers)
        };
    } catch (error) { if (error.code !== 'CALL_EXCEPTION') console.error(`Error fetching info for ${tweetId}:`, error); return null; }
}

async function getUserStake(tweetId, userAddress) {
    const { contractInstance } = await ensureInitialized();
    if (!tweetId || !userAddress || !ethers.isAddress(userAddress)) return null;
    try {
        const result = await contractInstance.getUserStake(tweetId, userAddress);
        return { amount: result[0], vote: Number(result[1]), justification: result[2], claimed: result[3] };
    } catch (error) { return null; }
}

async function getMinStakeAmount() {
    await ensureInitialized();
    return minStakeAmount;
}

async function queryEventsInChunks(contractInstance, provider, filter, startBlock, endBlockInput = 'latest') {
    let latestBlock;
    try {
        if (endBlockInput === 'latest') latestBlock = await provider.getBlockNumber();
        else latestBlock = Number(endBlockInput);
    } catch (e) { throw new Error(`Failed to get latest block number: ${e.message}`); }

    const fromBlock = Number(startBlock);
    let allEvents = [];
    console.log(`Querying events from ${fromBlock} to ${latestBlock} in chunks of ${MAX_BLOCK_RANGE}`);

    for (let chunkFrom = fromBlock; chunkFrom <= latestBlock; chunkFrom += (MAX_BLOCK_RANGE + 1)) {
        const chunkTo = Math.min(chunkFrom + MAX_BLOCK_RANGE, latestBlock);
        console.log(`   Querying chunk: ${chunkFrom} - ${chunkTo}`);
        try {
            const chunkEvents = await contractInstance.queryFilter(filter, chunkFrom, chunkTo);
            allEvents.push(...chunkEvents); // More efficient concat
            console.log(`   ... found ${chunkEvents.length} events in chunk.`);
        } catch (error) {
             console.error(`Error querying event chunk ${chunkFrom}-${chunkTo}:`, error);
             // Consider if you want to stop or continue on chunk error
             // throw new Error(`Failed to query event chunk ${chunkFrom}-${chunkTo}: ${error.message}`);
        }
    }
    console.log(`Total events found across all chunks: ${allEvents.length}`);
    return allEvents;
}

async function queryReportedTweetEvents(fromBlock = CONTRACT_CREATION_BLOCK, toBlock = 'latest') { // <-- Default fromBlock cambiado
     const { contractInstance, provider } = await ensureInitialized();
     const filter = contractInstance.filters.TweetReported();
     try {
          const events = await queryEventsInChunks(contractInstance, provider, filter, fromBlock, toBlock);
          const tweetIds = events.map(event => event.args?.[3]).filter(id => id && typeof id === 'string' && id !== "");
          return [...new Set(tweetIds)];
     } catch (error) { throw new Error(`Failed to query reported events: ${error.message}`); }
}

async function queryResolvedTweetEvents(fromBlock = CONTRACT_CREATION_BLOCK, toBlock = 'latest') { // <-- Default fromBlock cambiado
     const { contractInstance, provider } = await ensureInitialized();
     const filter = contractInstance.filters.TweetResolved();
     try {
          const events = await queryEventsInChunks(contractInstance, provider, filter, fromBlock, toBlock);
          const resolvedIds = events.map(event => event.args?.[2]).filter(id => id && typeof id === 'string' && id !== "");
          return new Set(resolvedIds);
     } catch (error) { throw new Error(`Failed to query resolved events: ${error.message}`); }
}

export default {
    initializeReadOnly,
    isServiceReady,
    getTweetInfo,
    getUserStake,
    getMinStakeAmount,
    hashTweetContent,
    queryReportedTweetEvents,
    queryResolvedTweetEvents
};
