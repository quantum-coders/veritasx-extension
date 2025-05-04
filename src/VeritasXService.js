import { ethers } from 'ethers';
import { VeritasXAbi } from './VeritasX.abi.js';
import { hashTweetContent } from './helpers.js';

const CONTRACT_ADDRESS = '0x2521aac9eB2831A10C28034d69B7488CFD4d8ce7';
const MANTLE_SEPOLIA_CHAIN_ID_HEX = '0x138b';
const MANTLE_SEPOLIA_CHAIN_ID_DEC = 5003;
const MANTLE_SEPOLIA_RPC_URL = 'https://rpc.sepolia.mantle.xyz';

let provider = null;
let signer = null;
let contract = null;
let contractReadOnly = null;
let minStakeAmount = BigInt(0);

async function initializeReadOnly() {
    try {
        const readOnlyProvider = new ethers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
        contractReadOnly = new ethers.Contract(CONTRACT_ADDRESS, VeritasXAbi, readOnlyProvider);
        minStakeAmount = await contractReadOnly.minStakeAmount();
        console.log("Read-only service initialized. Min Stake:", ethers.formatEther(minStakeAmount), "MNT");
    } catch (error) {
        console.error("Failed to initialize read-only service:", error);
        minStakeAmount = ethers.parseEther('0.01');
        console.warn("Using default min stake due to initialization error.");
    }
}

initializeReadOnly();

function getContractReadOnlyInstance() {
    if (!contractReadOnly) {
        console.warn("Read-only contract instance was null, attempting reinitialization.");
        initializeReadOnly();
         if (!contractReadOnly) {
             throw new Error("Read-only contract interaction failed. Check RPC and contract address.");
         }
    }
    return contractReadOnly;
}

function getContractWithSigner() {
    if (!signer) {
        throw new Error("Wallet not connected or signer not available.");
    }
    if (!contract || contract.runner !== signer) {
         contract = new ethers.Contract(CONTRACT_ADDRESS, VeritasXAbi, signer);
    }
    return contract;
}

async function checkAndSwitchNetwork() {
     if (!provider) throw new Error("Provider not available.");

     const network = await provider.getNetwork();
     if (network.chainId !== BigInt(MANTLE_SEPOLIA_CHAIN_ID_DEC)) {
         console.warn(`Wallet is on wrong network (ID: ${network.chainId}). Attempting to switch to Mantle Sepolia (ID: ${MANTLE_SEPOLIA_CHAIN_ID_DEC}).`);
         try {
             await window.ethereum.request({
                 method: 'wallet_switchEthereumChain',
                 params: [{ chainId: MANTLE_SEPOLIA_CHAIN_ID_HEX }],
             });
             provider = new ethers.BrowserProvider(window.ethereum);
             signer = await provider.getSigner();
             contract = null;
             console.log("Network switched successfully.");
             return true;

         } catch (switchError) {
             console.error("Network switch error:", switchError);
             if (switchError.code === 4902) {
                 try {
                     await window.ethereum.request({
                         method: 'wallet_addEthereumChain',
                         params: [{
                             chainId: MANTLE_SEPOLIA_CHAIN_ID_HEX,
                             chainName: 'Mantle Sepolia Testnet',
                             nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
                             rpcUrls: [MANTLE_SEPOLIA_RPC_URL],
                             blockExplorerUrls: ['https://explorer.sepolia.mantle.xyz/']
                         }],
                     });
                     provider = new ethers.BrowserProvider(window.ethereum);
                     signer = await provider.getSigner();
                     contract = null;
                     console.log("Mantle Sepolia network added successfully.");
                     return true;
                 } catch (addError) {
                     console.error("Failed to add Mantle Sepolia network:", addError);
                     throw new Error("Could not add Mantle Sepolia Testnet. Please add it manually.");
                 }
             } else {
                 throw new Error(`Failed to switch network. Please switch to Mantle Sepolia (ID: ${MANTLE_SEPOLIA_CHAIN_ID_DEC}) manually.`);
             }
         }
     }
    return network.chainId === BigInt(MANTLE_SEPOLIA_CHAIN_ID_DEC);
 }

// ./src/VeritasXService.js (Reemplazar solo la función connectWallet)

async function connectWallet() {
    console.log("VeritasXService: Attempting to connect wallet...");
    if (typeof window.ethereum === 'undefined') {
        console.error("VeritasXService: window.ethereum is undefined.");
        throw new Error("MetaMask no detectado. Asegúrate de que esté instalado, activo y desbloqueado.");
    }

    try {
        provider = new ethers.BrowserProvider(window.ethereum, 'any');
        console.log("VeritasXService: ethers.BrowserProvider created.");

        let accounts = null;
        try {
             console.log("VeritasXService: Requesting accounts via provider.send('eth_requestAccounts')...");
             accounts = await provider.send("eth_requestAccounts", []);
             console.log("VeritasXService: eth_requestAccounts successful, accounts:", accounts);
        } catch (requestError) {
             console.error("VeritasXService: Error during eth_requestAccounts:", requestError);
             if (requestError.code === 4001) {
                 throw new Error("Conexión rechazada por el usuario en MetaMask.");
             } else if (requestError.code === -32002) {
                throw new Error("Ya hay una solicitud de conexión pendiente en MetaMask. Revisa la ventana de MetaMask.");
             }
             throw new Error(`Error al solicitar cuenta: ${requestError.message || 'Error desconocido'}`);
        }

        if (!accounts || accounts.length === 0) {
            console.warn("VeritasXService: No accounts array returned or empty.");
            throw new Error("No se concedió permiso para ninguna cuenta en MetaMask.");
        }

        const accountAddress = accounts[0];
        console.log("VeritasXService: Account selected:", accountAddress);

        try {
            signer = await provider.getSigner(accountAddress);
            const signerAddr = await signer.getAddress();
             console.log("VeritasXService: Signer obtained for:", signerAddr);
             if (signerAddr.toLowerCase() !== accountAddress.toLowerCase()) {
                console.warn("VeritasXService: Signer address mismatch!", signerAddr, accountAddress);
             }
        } catch (signerError) {
            console.error("VeritasXService: Error getting signer:", signerError);
            throw new Error(`No se pudo obtener el firmante (signer): ${signerError.message || 'Error desconocido'}`);
        }

        console.log("VeritasXService: Checking and switching network...");
        await checkAndSwitchNetwork();
        console.log("VeritasXService: Network check complete.");

        const currentNetwork = await provider.getNetwork();
        const finalAddress = await signer.getAddress();

        console.log("VeritasXService: Wallet connected successfully:", finalAddress, "on Chain ID:", currentNetwork.chainId.toString());
        return { address: finalAddress, chainId: currentNetwork.chainId.toString() };

    } catch (error) {
        console.error("VeritasXService: Full connection error details:", error);
        disconnectWallet();
        // Lanza el mensaje de error específico que ocurrió
        throw new Error(error.message || "Error inesperado durante la conexión a la wallet.");
    }
}
function disconnectWallet() {
    provider = null;
    signer = null;
    contract = null;
    console.log("Wallet disconnected state cleared");
}

function isWalletConnected() {
    return !!signer;
}

function getCurrentAccount() {
    return signer ? signer.address : null;
}

function getMinStakeAmount() {
    return minStakeAmount;
}

async function getActiveTweets() {
    console.log("VeritasXService: Fetching active tweets...");
    try {
        const contractInstance = getContractReadOnlyInstance();
         console.log("VeritasXService: Got read-only instance, calling getActiveTweets...");
        const tweetIds = await contractInstance.getActiveTweets();
        console.log(`VeritasXService: Found ${tweetIds.length} active tweet IDs.`);

        const tweetDetailsPromises = tweetIds.map(id => getTweetInfo(id).catch(e => {
            console.error(`Failed to get info for tweet ${id}:`, e);
            return null;
        }));
        const tweetDetails = (await Promise.all(tweetDetailsPromises))
                             .filter(details => details !== null);

        console.log(`Successfully fetched details for ${tweetDetails.length} active tweets.`);
        return tweetDetails;

    } catch (error) {
        console.error("VeritasXService: Error fetching active tweets list:", error);
        throw new Error(`Failed to fetch active tweets: ${error.message}`);
    }
}

async function getTweetInfo(tweetId) {
    if (!tweetId) {
        console.warn("getTweetInfo called with invalid tweetId");
        return null;
    }
    try {
        const contractInstance = getContractReadOnlyInstance();
        const result = await contractInstance.getTweetInfo(tweetId);
        return {
            tweetId: result.tweetId,
            contentHash: result.contentHash,
            reporter: result.reporter,
            reportTime: result.reportTime,
            resolved: result.resolved,
            status: Number(result.status),
            stakePool: result.stakePool,
            totalStakers: Number(result.totalStakers)
        };
    } catch (error) {
        console.error(`Error fetching info for tweet ${tweetId}:`, error);
        return null;
    }
}

async function reportTweet(tweetId, tweetContent, stakeAmountMNT) {
    if (!isWalletConnected()) throw new Error("Connect wallet first.");
    if (!tweetId || !tweetContent) throw new Error("Tweet ID and Content are required.");

    const stakeAmountWei = ethers.parseEther(stakeAmountMNT.toString());
    if (stakeAmountWei < minStakeAmount) {
        throw new Error(`Stake amount (${stakeAmountMNT} MNT) is less than minimum (${ethers.formatEther(minStakeAmount)} MNT).`);
    }

    const contentHash = hashTweetContent(tweetContent);
    if (!contentHash) throw new Error("Failed to hash tweet content.");

    console.log(`Reporting Tweet ${tweetId} with hash ${contentHash} and stake ${stakeAmountMNT} MNT`);

    try {
        await checkAndSwitchNetwork();
        const contractInstance = getContractWithSigner();
        const tx = await contractInstance.reportTweet(tweetId, contentHash, { value: stakeAmountWei });
        console.log(`Report transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log("Report transaction confirmed:", receipt);
        return receipt;
    } catch (error) {
        console.error("Error reporting tweet:", error);
        throw new Error(`Failed to report tweet: ${error.message}`);
    }
}

async function stakeAndVote(tweetId, voteStatus, stakeAmountMNT) {
    if (!isWalletConnected()) throw new Error("Connect wallet first.");
    if (!tweetId || voteStatus === undefined || voteStatus === null || voteStatus === 0) {
        throw new Error("Tweet ID and a valid Vote (True, False, Misleading, Unverifiable) are required.");
    }

    const stakeAmountWei = ethers.parseEther(stakeAmountMNT.toString());
     if (stakeAmountWei < minStakeAmount) {
        throw new Error(`Stake amount (${stakeAmountMNT} MNT) is less than minimum (${ethers.formatEther(minStakeAmount)} MNT).`);
    }

    console.log(`Staking ${stakeAmountMNT} MNT and voting ${voteStatus} on Tweet ${tweetId}`);

    try {
        await checkAndSwitchNetwork();
        const contractInstance = getContractWithSigner();
        const tx = await contractInstance.stakeAndVote(tweetId, voteStatus, { value: stakeAmountWei });
        console.log(`Stake/Vote transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log("Stake/Vote transaction confirmed:", receipt);
        return receipt;
    } catch (error) {
        console.error("Error staking and voting:", error);
        throw new Error(`Failed to stake and vote: ${error.message}`);
    }
}

async function claimReward(tweetId) {
    if (!isWalletConnected()) throw new Error("Connect wallet first.");
    if (!tweetId) throw new Error("Tweet ID is required.");

    console.log(`Attempting to claim reward for Tweet ${tweetId}`);

    try {
        await checkAndSwitchNetwork();
        const contractInstance = getContractWithSigner();
        const potentialReward = await contractInstance.getPotentialReward(tweetId, signer.address);
        if (potentialReward === BigInt(0)) {
            console.log("No reward available or already claimed for this tweet.");
            throw new Error("No reward available or already claimed.");
        }

        const tx = await contractInstance.claimReward(tweetId);
        console.log(`Claim reward transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log("Claim reward transaction confirmed:", receipt);
        return receipt;
    } catch (error) {
        console.error("Error claiming reward:", error);
        if (error.message === "No reward available or already claimed.") {
            throw error;
        }
        throw new Error(`Failed to claim reward: ${error.message}`);
    }
}

async function getUserStakeInfo(tweetId, userAddress) {
    if (!tweetId || !userAddress) return null;
    try {
        const contractInstance = getContractReadOnlyInstance();
        const result = await contractInstance.getUserStake(tweetId, userAddress);
        return {
            amount: result.amount,
            vote: Number(result.vote),
            claimed: result.claimed
        };
    } catch (error) {
        console.error(`Error fetching user stake for ${userAddress} on tweet ${tweetId}:`, error);
        return null;
    }
}

export default {
    connectWallet,
    disconnectWallet,
    isWalletConnected,
    getCurrentAccount,
    getActiveTweets,
    getTweetInfo,
    reportTweet,
    stakeAndVote,
    claimReward,
    getMinStakeAmount,
    checkAndSwitchNetwork,
    getUserStakeInfo
};
