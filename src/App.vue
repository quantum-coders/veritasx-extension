<template>

	<div class="container-fluid">
		<header class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">

			<div class="d-flex align-items-center">
				<img :src="logoUrl" alt="VeritasX Logo" width="32" height="32" class="me-2">
				<h5 class="mb-0">VeritasX</h5>

			</div>

			<button
				v-if="!isConnected"
				@click="connect"
				class="btn btn-primary btn-sm"
				:disabled="isLoading || isLoadingAction"
			>
				<span
					v-if="isLoading"
					class="spinner-border spinner-border-sm"
					role="status"
					aria-hidden="true"
				></span>
				{{ isLoading ? 'Connecting...' : 'Connect Wallet' }}

			</button>

			<div v-else class="d-flex align-items-center">
				<span class="badge bg-success me-2 address-badge" :title="account">{{ formattedAccount }}</span>

				<button
					@click="disconnect"
					class="btn btn-outline-secondary btn-sm"
					:disabled="isLoadingAction"
				>Disconnect
				</button>

			</div>
		</header>

		<div v-if="globalError" class="alert alert-danger alert-dismissible fade show error-alert" role="alert">
			{{ globalError }}

			<button type="button" class="btn-close" @click="globalError = null" aria-label="Close"></button>
		</div>

		<main>
			<div v-if="!isConnected && !isLoading && !initialAction">

				<p class="text-center text-muted">Please connect your wallet (Mantle Sepolia) to interact with VeritasX.</p>
				<p
					v-if="initialTweetId"
					class="text-center text-warning small"
				>Connect your wallet to verify Tweet {{ initialTweetId }}.</p>
				<p
					v-else
					class="text-center small text-warning"
				>Ensure MetaMask is unlocked and the active browser tab is a standard webpage (http/https) where MetaMask has permission to connect.</p>

			</div>

			<div v-else-if="isLoading && !initialTweetId">
				<div class="d-flex justify-content-center align-items-center p-4">

					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Loading...</span>

					</div>
					<p class="ms-2 mb-0">Loading data...</p>
				</div>

			</div>

			<div v-else-if="isLoadingAction && (actionType === 'processingInitialTweet')">

				<div class="d-flex justify-content-center align-items-center p-4">

					<div class="spinner-border text-info" role="status">
						<span class="visually-hidden">Loading...</span>

					</div>
					<p class="ms-2 mb-0">Processing Tweet {{ initialTweetId }}...</p>
				</div>

			</div>

			<div v-else>

				<div class="mb-3 text-center" v-if="!initialAction">
					<button
						class="btn btn-info btn-sm"
						@click="openReportModal(null, null)"
						:disabled="!isConnected || isLoadingAction"
					>
						<span
							v-if="isLoadingAction && actionType === 'report'"
							class="spinner-border spinner-border-sm me-1"
							role="status"
							aria-hidden="true"
						></span>
						Report New Tweet

					</button>

				</div>

				<h6 class="mb-3" v-if="!initialAction">Active Tweets for Verification</h6>

				<div v-if="!initialAction && tweets.length === 0 && !isLoading" class="text-center text-muted">
					No active tweets found for verification.

				</div>

				<div v-if="!initialAction">
					<div
						v-for="tweet in tweets"
						:key="tweet.tweetId"
						class="card tweet-card shadow-sm mb-3"
						:class="`status-${tweet.status}`"
					>
						<div class="card-body">

							<div class="d-flex justify-content-between align-items-start mb-2">
								<h6 class="card-title mb-0 text-break">Tweet ID: {{ tweet.tweetId }}</h6>

								<span :class="['badge', `bg-${getStatusDetails(tweet.status).color}`]">{{ getStatusDetails(tweet.status).text }}</span>

							</div>
							<p class="card-text small-text mb-1">
								<span class="fw-bold">Reporter:</span> <span
								class="text-muted"
								:title="tweet.reporter"
							>{{ formatAddress(tweet.reporter) }}</span><br>
								<span class="fw-bold">Reported:</span>
								<span class="text-muted">{{ formatTimestamp(tweet.reportTime) }}</span><br>
								<span class="fw-bold">Total Staked:</span>
								<span class="text-muted">{{ formatMNT(tweet.stakePool) }} MNT</span><br>
								<span class="fw-bold">Stakers:</span>
								<span class="text-muted">{{ tweet.totalStakers }}</span>
							</p>
							<p class="card-text small-text mb-2" v-if="tweet.contentHash">
								<span class="fw-bold">Content Hash:</span> <span
								class="text-muted text-break"
								:title="tweet.contentHash"
							>{{ formatAddress(tweet.contentHash) }}</span>
							</p>

							<div v-if="isConnected && !tweet.resolved">
								<button
									@click="openVoteModal(tweet)"
									class="btn btn-success btn-sm me-2 action-button"
									:disabled="isLoadingAction"
								>
									<span
										v-if="isLoadingAction && actionType === 'vote' && selectedTweet?.tweetId === tweet.tweetId"
										class="spinner-border spinner-border-sm me-1"
										role="status"
										aria-hidden="true"
									></span>
									Vote / Stake
								</button>

							</div>

							<div v-if="isConnected && tweet.resolved">

								<button
									@click="claim(tweet.tweetId)"
									class="btn btn-warning btn-sm action-button"
									:disabled="isLoadingAction || (userStakes[tweet.tweetId] && userStakes[tweet.tweetId].claimed)"
								>
									<span
										v-if="isLoadingAction && actionType === 'claim' && selectedTweetId === tweet.tweetId"
										class="spinner-border spinner-border-sm me-1"
										role="status"
										aria-hidden="true"
									></span>
									{{ (userStakes[tweet.tweetId] && userStakes[tweet.tweetId].claimed) ? 'Reward Claimed' : 'Claim Reward' }}

								</button>

							</div>

							<div
								v-if="isConnected && userStakes[tweet.tweetId]"
								class="mt-2 p-2 bg-light rounded small-text"
							>
								Your Stake: {{ formatMNT(userStakes[tweet.tweetId].amount) }} MNT |
								Your Vote: {{ getStatusDetails(userStakes[tweet.tweetId].vote).text }} |
								Claimed: {{ userStakes[tweet.tweetId].claimed ? 'Yes' : 'No' }}

							</div>

						</div>
					</div>

				</div>
				<div class="text-center mt-3" v-if="!initialAction">

					<button
						@click="loadTweets"
						class="btn btn-outline-secondary btn-sm"
						:disabled="isLoading || isLoadingAction"
					>
						<span
							v-if="isLoading"
							class="spinner-border spinner-border-sm me-1"
							role="status"
							aria-hidden="true"
						></span>
						Refresh Tweets

					</button>

				</div>
				<div
					v-if="initialAction && !isLoadingAction && !showReportModal && !showVoteModal && isConnected"
					class="text-center text-muted mt-3"
				>
					<p>Finished processing tweet: {{ initialTweetId }}.</p>

					<button @click="clearInitialAction" class="btn btn-sm btn-link">View all active tweets</button>

				</div>

			</div>
		</main>

		<div
			class="modal"
			tabindex="-1"
			:class="{ 'd-block': showReportModal }"
			style="background-color: rgba(0,0,0,0.5);"
		>

			<div class="modal-dialog modal-dialog-centered">

				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Report New Tweet</h5>

						<button
							type="button"
							class="btn-close"
							@click="closeReportModal"
							:disabled="isLoadingAction"
							aria-label="Close"
						></button>
					</div>
					<div class="modal-body">

						<div v-if="reportError" class="alert alert-danger error-alert">{{ reportError }}</div>
						<div v-if="actionType === 'report' && isLoadingAction" class="text-center p-3">
							<div class="spinner-border text-primary" role="status">
								<span class="visually-hidden">Submitting...</span>
							</div>
							<p class="mt-2 mb-0">Submitting Report...</p>
							<p class="small text-muted">Please confirm in your wallet.</p>
						</div>
						<div v-else>
							<div class="mb-3">
								<label for="reportTweetId" class="form-label">Tweet ID *</label>
								<input
									type="text"
									class="form-control"
									id="reportTweetId"
									v-model="reportData.tweetId"
									placeholder="Enter the numerical ID of the tweet"
									:disabled="!!initialTweetId || isLoadingAction"
								>

							</div>

							<div class="mb-3">
								<label for="reportTweetContent" class="form-label">Tweet Content *</label>
								<textarea
									class="form-control"
									id="reportTweetContent"
									rows="4"
									v-model="reportData.tweetContent"
									placeholder="Paste or verify the exact text content of the tweet"
									:disabled="isLoadingAction"
								></textarea>

								<div class="form-text">The content will be hashed (Keccak256) before sending.</div>

							</div>
							<div class="mb-3">
								<label for="reportStakeAmount" class="form-label">Stake Amount (MNT) *</label>
								<input
									type="number"
									step="0.01"
									min="0"
									class="form-control"
									id="reportStakeAmount"
									v-model="reportData.stakeAmount"
									:placeholder="`Minimum: ${minStakeFormatted} MNT`"
									:disabled="isLoadingAction"
								>

							</div>
						</div>
					</div>
					<div class="modal-footer">

						<button
							type="button"
							class="btn btn-secondary"
							@click="closeReportModal"
							:disabled="isLoadingAction"
						>Cancel
						</button>

						<button
							type="button"
							class="btn btn-primary"
							@click="submitReport"
							:disabled="isLoadingAction || !isConnected"
						>
							<span
								v-if="isLoadingAction && actionType === 'report'"
								class="spinner-border spinner-border-sm me-1"
								role="status"
								aria-hidden="true"
							></span>
							{{ (isLoadingAction && actionType === 'report') ? 'Submitting...' : 'Report Tweet' }}

						</button>
					</div>

				</div>

			</div>
		</div>

		<div
			class="modal"
			tabindex="-1"
			:class="{ 'd-block': showVoteModal }"
			style="background-color: rgba(0,0,0,0.5);"
		>
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">

					<div class="modal-header">
						<h5 class="modal-title">Vote & Stake on Tweet {{ selectedTweet?.tweetId }}</h5>

						<button
							type="button"
							class="btn-close"
							@click="closeVoteModal"
							:disabled="isLoadingAction"
							aria-label="Close"
						></button>

					</div>

					<div class="modal-body">

						<div v-if="voteError" class="alert alert-danger error-alert">{{ voteError }}</div>
						<div v-if="actionType === 'vote' && isLoadingAction" class="text-center p-3">
							<div class="spinner-border text-primary" role="status">
								<span class="visually-hidden">Submitting...</span>
							</div>
							<p class="mt-2 mb-0">Submitting Vote...</p>
							<p class="small text-muted">Please confirm in your wallet.</p>
						</div>
						<div v-else>
							<p class="small-text text-break">Tweet ID: {{ selectedTweet?.tweetId }}</p>
							<div v-if="selectedTweet?.tweetContent" class="mb-3 p-2 border rounded bg-light small-text">
								<strong>Content:</strong><br>
								<span style="white-space: pre-wrap;">{{ selectedTweet.tweetContent }}</span>
							</div>
							<p
								v-else-if="initialTweetContent && selectedTweet?.tweetId === initialTweetId"
								class="mb-3 p-2 border rounded bg-light small-text"
							>
								<strong>Content:</strong><br>
								<span style="white-space: pre-wrap;">{{ initialTweetContent }}</span>
							</p>
							<p class="small-text">Select your verification assessment and the amount of MNT to stake.</p>

							<div class="mb-3">
								<label for="voteStatus" class="form-label">Your Vote *</label>
								<select
									class="form-select"
									id="voteStatus"
									v-model="voteData.status"
									:disabled="isLoadingAction"
								>
									<option disabled value="">Please select a status</option>
									<option v-for="option in voteOptions" :key="option.value" :value="option.value">
										{{ option.text }}
									</option>
								</select>

							</div>

							<div class="mb-3">
								<label for="voteStakeAmount" class="form-label">Stake Amount (MNT) *</label>
								<input
									type="number"
									step="0.01"
									min="0"
									class="form-control"
									id="voteStakeAmount"
									v-model="voteData.stakeAmount"
									:placeholder="`Minimum: ${minStakeFormatted} MNT`"
									:disabled="isLoadingAction"
								>

							</div>
						</div>

					</div>

					<div class="modal-footer">

						<button
							type="button"
							class="btn btn-secondary"
							@click="closeVoteModal"
							:disabled="isLoadingAction"
						>Cancel
						</button>

						<button
							type="button"
							class="btn btn-primary"
							@click="submitVote"
							:disabled="isLoadingAction || !isConnected"
						>
							<span
								v-if="isLoadingAction && actionType === 'vote'"
								class="spinner-border spinner-border-sm me-1"
								role="status"
								aria-hidden="true"
							></span>
							{{ (isLoadingAction && actionType === 'vote') ? 'Submitting...' : 'Submit Vote & Stake' }}

						</button>

					</div>
				</div>

			</div>
		</div>

	</div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ethers } from 'ethers';
import VeritasXService from './VeritasXService.js';
import { VeritasXAbi } from './VeritasX.abi.js';
import {
    formatAddress,
    formatTimestamp,
    formatMNT,
    getStatusDetails,
    VOTE_OPTIONS,
    hashTweetContent // Importar directamente
} from './helpers.js';

const CONTRACT_ADDRESS = '0x2521aac9eB2831A10C28034d69B7488CFD4d8ce7';

const isConnected = ref(false);
const account = ref(null);
const chainId = ref(null);
const tweets = ref([]);
const userStakes = ref({});
const isLoading = ref(false);
const isLoadingAction = ref(false);
const actionType = ref('');
const globalError = ref(null);
const minStake = ref(BigInt(0));

const initialAction = ref(null);
const initialTweetId = ref(null);
const initialTweetContent = ref(null);

const showReportModal = ref(false);
const reportData = ref({ tweetId: '', tweetContent: '', stakeAmount: '' });
const reportError = ref(null);

const showVoteModal = ref(false);
const selectedTweet = ref(null);
const selectedTweetId = ref(null); // Para spinner de claim
const voteData = ref({ status: '', stakeAmount: '' });
const voteError = ref(null);
const voteOptions = ref(VOTE_OPTIONS);

const formattedAccount = computed(() => formatAddress(account.value));
const minStakeFormatted = computed(() => formatMNT(minStake.value, 2));
const logoUrl = computed(() => {
    try {
        return chrome.runtime.getURL('icons/icon128.svg');
    } catch (e) {
        return './icons/icon128.svg'; // Fallback for non-extension environments
    }
});

const setActionLoading = (loading, type = '') => {
    console.log(`App.vue: setActionLoading -> loading=${loading}, type=${type}`);
    isLoadingAction.value = loading;
    actionType.value = loading ? type : '';
};

const clearErrors = () => {
    globalError.value = null;
    reportError.value = null;
    voteError.value = null;
};

const clearInitialAction = () => {
    console.log('App.vue: clearInitialAction() called');
    initialAction.value = null;
    initialTweetId.value = null;
    initialTweetContent.value = null;
    if (isConnected.value) {
        console.log('App.vue: Connected, reloading tweets after clearing initial action.');
        loadTweets();
    } else {
        console.log('App.vue: Not connected, cleared initial action state.');
    }
};

const handleConnectResponse = async (response) => {
    console.log('App.vue: handleConnectResponse received:', response);
    if (response && response.success && response.accounts && response.accounts.length > 0) {
        account.value = response.accounts[0];
        isConnected.value = true;
        isLoading.value = false;
        try {
            await chrome.storage.local.set({ userAccount: account.value });
            console.log('App.vue: Connection successful, account set in storage:', account.value);
            await loadMinStake(); // Cargar min stake después de conectar
            if (initialAction.value === 'verify' && initialTweetId.value) {
                console.log('App.vue: Processing initial tweet after successful connection.');
                await processInitialTweet(initialTweetId.value);
            } else {
                console.log('App.vue: No initial action pending, loading all tweets after connection.');
                await loadTweets();
            }
        } catch (storageError) {
            console.error('App.vue: Error saving account to storage:', storageError);
            globalError.value = 'Connection successful, but failed to save account state.';
            // Aún así intentar cargar datos
             await loadMinStake();
             await loadTweets();
        }
    } else {
        console.error('App.vue: Connection failed:', response?.error || 'Unknown error');
        globalError.value = response?.error || 'Failed to connect wallet via background script.';
        isConnected.value = false;
        account.value = null;
        isLoading.value = false;
        try {
            await chrome.storage.local.remove('userAccount');
        } catch (storageError) {
            console.error('App.vue: Error removing account from storage:', storageError);
        }
        if (initialAction.value === 'verify' && initialTweetId.value) {
            console.log('App.vue: Connection failed, but initial action exists. Displaying connect prompt.');
            globalError.value = `Please connect wallet to verify Tweet ${initialTweetId.value}. ${response?.error || ''}`;
        }
    }
};

const connect = async () => {
    console.log('App.vue: connect() called - sending message to background');
    isLoading.value = true;
    clearErrors();
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            console.log('App.vue: Sending \'connectWalletRequest\' message to background.');
            chrome.runtime.sendMessage({ action: 'connectWalletRequest' }, handleConnectResponse);
        } else {
            console.error('App.vue: Chrome runtime environment not available for sending message.');
            throw new Error('Chrome runtime environment not available.');
        }
    } catch (error) {
        console.error('App.vue: Error sending connect message:', error);
        globalError.value = `Error communicating with background: ${error.message}`;
        isLoading.value = false;
    }
};

const disconnect = async () => {
    console.log('App.vue: disconnect() called');
    isConnected.value = false;
    account.value = null;
    chainId.value = null;
    tweets.value = [];
    userStakes.value = {};
    initialAction.value = null;
    initialTweetId.value = null;
    initialTweetContent.value = null;
    userAccount = null; // Limpiar cuenta en background también si es posible/necesario
    try {
        await chrome.storage.local.remove('userAccount');
        console.log('App.vue: Account removed from storage.');
        // Opcional: enviar mensaje a background para limpiar su estado si es necesario
        // chrome.runtime.sendMessage({ action: 'disconnectCleanup' });
    } catch (storageError) {
        console.error('App.vue: Error removing account from storage:', storageError);
    }
    clearErrors();
    console.log('App.vue: Disconnect process complete.');
};

const loadMinStake = async () => {
    console.log('App.vue: loadMinStake() called');
    try {
        // Asumiendo que VeritasXService aún existe y puede obtener esto síncronamente
        // o necesita ser inicializado asíncronamente si depende de una conexión
        // Esta parte podría necesitar ajuste dependiendo de cómo funciona VeritasXService ahora
        const serviceMinStake = VeritasXService.getMinStakeAmount();
        if (serviceMinStake === undefined || serviceMinStake === null || serviceMinStake === BigInt(0)) {
             console.warn('App.vue: MinStake from service is 0/null/undefined, maybe not ready? Using default 0.01');
             // Podrías reintentar la inicialización del servicio aquí si es necesario
             // await VeritasXService.initializeReadOnly?.();
             // minStake.value = VeritasXService.getMinStakeAmount() || ethers.parseEther('0.01');
             minStake.value = ethers.parseEther('0.01'); // Fallback temporal
        } else {
            minStake.value = serviceMinStake;
        }
        console.log('App.vue: Min stake loaded:', minStakeFormatted.value, 'MNT (Raw:', minStake.value.toString(), ')');
    } catch (error) {
        console.error('App.vue: Failed to get min stake:', error);
        globalError.value = 'Could not load minimum stake amount.';
        minStake.value = ethers.parseEther('0.01'); // Fallback
        console.warn('App.vue: Using default min stake 0.01 due to error.');
    }
};


const loadTweets = async () => {
    console.log('App.vue: loadTweets() called');
    if (!isConnected.value) {
        console.log('App.vue: loadTweets() skipped, wallet not connected.');
        return;
    }
    if (initialAction.value) {
        console.log('App.vue: loadTweets() skipped, initial action is pending.');
        return;
    }
    isLoading.value = true;
    clearErrors();
    try {
        console.log('App.vue: Calling VeritasXService.getActiveTweets()...');
        const activeTweets = await VeritasXService.getActiveTweets(); // Asume que esto aún funciona
        console.log('App.vue: Received', activeTweets?.length || 0, 'active tweets from service.');
        tweets.value = activeTweets || [];
        console.log('App.vue: Calling loadUserStakes() for loaded tweets...');
        await loadUserStakes();
        console.log('App.vue: loadUserStakes() finished.');
    } catch (error) {
        console.error('App.vue: Failed to load tweets:', error);
        globalError.value = error.message || 'Failed to load active tweets.';
        tweets.value = [];
        userStakes.value = {};
    } finally {
        isLoading.value = false;
        console.log('App.vue: loadTweets() finished, isLoading set to false.');
    }
};

const loadUserStakes = async () => {
    console.log('App.vue: loadUserStakes() called');
    if (!isConnected.value || !account.value || !tweets.value || tweets.value.length === 0) {
        console.log('App.vue: Skipping loadUserStakes - conditions not met.');
        userStakes.value = {};
        return;
    }
    const stakes = {};
    console.log(`App.vue: Loading stakes for ${tweets.value.length} tweets for account ${account.value}`);
    for (const tweet of tweets.value) {
        if (!tweet || !tweet.tweetId) continue;
        try {
            // Asume que VeritasXService.getUserStakeInfo sigue funcionando
            const stakeInfo = await VeritasXService.getUserStakeInfo(tweet.tweetId, account.value);
            if (stakeInfo && stakeInfo.amount > BigInt(0)) {
                stakes[tweet.tweetId] = stakeInfo;
            }
        } catch (error) {
            console.warn(`App.vue: Could not load user stake info for tweet ${tweet.tweetId}: ${error.message}`);
        }
    }
    userStakes.value = stakes;
    console.log('App.vue: User stakes loading complete:', userStakes.value);
};

const processInitialTweet = async (tweetId) => {
    console.log(`App.vue: processInitialTweet called for ID: ${tweetId}`);
    if (!isConnected.value || !account.value) {
        console.warn(`App.vue: processInitialTweet - Wallet not connected.`);
        globalError.value = `Connect wallet to process Tweet ${tweetId}`;
        setActionLoading(false);
        return;
    }
    setActionLoading(true, 'processingInitialTweet');
    clearErrors();
    try {
        console.log(`App.vue: Fetching info for initial tweet ${tweetId} from service...`);
        const tweetInfo = await VeritasXService.getTweetInfo(tweetId); // Asume que esto funciona

        if (tweetInfo && tweetInfo.tweetId) {
            console.log(`App.vue: Tweet ${tweetId} FOUND. Status: ${tweetInfo.status}, Resolved: ${tweetInfo.resolved}`);
            if (initialTweetContent.value) {
                 tweetInfo.tweetContent = initialTweetContent.value; // Añadir contenido si existe
            }

            const userStakeInfo = await VeritasXService.getUserStakeInfo(tweetId, account.value);
            console.log(`App.vue: User stake info for ${tweetId}:`, userStakeInfo);

            if (tweetInfo.resolved) {
                globalError.value = `Tweet ${tweetId} is already resolved as ${getStatusDetails(tweetInfo.status).text}.`;
                 // Podrías añadir lógica para abrir modal de claim si userStakeInfo lo permite
            } else if (userStakeInfo && userStakeInfo.vote !== 0) {
                 globalError.value = `You have already voted on Tweet ${tweetId}.`;
            } else {
                 console.log(`App.vue: Tweet exists, opening VOTE modal for tweet ${tweetId}.`);
                 openVoteModal(tweetInfo);
            }
        } else {
            console.log(`App.vue: Tweet ${tweetId} NOT FOUND. Opening REPORT modal.`);
            openReportModal(tweetId, initialTweetContent.value);
        }
    } catch (error) {
        console.error(`App.vue: Error processing initial tweet ${tweetId}:`, error);
        globalError.value = `Error processing tweet ${tweetId}: ${error.message || 'Unknown error'}`;
        clearInitialAction(); // Limpiar acción si falla el procesamiento
    } finally {
        setActionLoading(false);
        console.log(`App.vue: Finished processing initial tweet ${tweetId}.`);
    }
};

const checkConnectionAndProcessAction = async (actionInfo) => {
    console.log('App.vue: checkConnectionAndProcessAction called with actionInfo:', actionInfo);
    isLoading.value = true;
    try {
        const result = await chrome.storage.local.get(['userAccount']);
        const storedAccount = result.userAccount;
        console.log('App.vue: Account from storage:', storedAccount);

        if (storedAccount) {
            account.value = storedAccount;
            isConnected.value = true;
            await loadMinStake(); // Cargar config esencial

            if (actionInfo?.action === 'verify' && actionInfo?.tweetId) {
                console.log('App.vue: Stored account found, processing pending action.');
                initialAction.value = actionInfo.action;
                initialTweetId.value = actionInfo.tweetId;
                initialTweetContent.value = actionInfo.tweetContent;
                await processInitialTweet(actionInfo.tweetId);
            } else {
                 console.log('App.vue: Stored account found, no pending action, loading tweets.');
                 await loadTweets();
            }
        } else {
             console.log('App.vue: No stored account. Ensuring disconnected state.');
             await disconnect(); // Asegurar estado limpio
            if (actionInfo?.action === 'verify' && actionInfo?.tweetId) {
                console.log('App.vue: Storing initial action data while disconnected.');
                initialAction.value = actionInfo.action;
                initialTweetId.value = actionInfo.tweetId;
                initialTweetContent.value = actionInfo.tweetContent;
            }
        }
    } catch (storageError) {
        console.error('App.vue: Error accessing storage:', storageError);
        await disconnect();
        globalError.value = 'Error accessing extension storage.';
    } finally {
        isLoading.value = false;
        console.log('App.vue: checkConnectionAndProcessAction finished.');
    }
};

const setupMessageListener = () => {
    console.log('App.vue: Setting up message listener.');
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('App.vue: <<< Message received in popup listener >>>', message);
            if (message.action === 'connectWalletResponse') {
                console.log('App.vue: Handling connectWalletResponse message.');
                handleConnectResponse(message); // Usar la función existente
                // No es necesario sendResponse aquí si handleConnectResponse no lo necesita
                return false; // Indicar que no habrá respuesta asíncrona desde aquí
            }
             // Podrías añadir listeners para otros mensajes si el background necesita actualizar el popup
            console.log('App.vue: Message listener - Unhandled action:', message?.action);
            return false; // Indicar que no habrá respuesta asíncrona
        });
        console.log('App.vue: Message listener added successfully.');
    } else {
        console.warn('App.vue: Chrome runtime or onMessage not available.');
    }
};

const openReportModal = (tweetId = null, presetContent = null) => {
    console.log(`App.vue: openReportModal. ID: ${tweetId}, Content Preset: ${!!presetContent}`);
    reportData.value = {
        tweetId: tweetId || '',
        tweetContent: presetContent || '',
        stakeAmount: '', // Limpiar stake amount
    };
    reportError.value = null;
    globalError.value = null; // Limpiar error global al abrir modal
    showReportModal.value = true;
};

const closeReportModal = () => {
    console.log('App.vue: closeReportModal.');
    showReportModal.value = false;
    reportData.value = { tweetId: '', tweetContent: '', stakeAmount: '' };
    reportError.value = null;
    if (initialAction.value) {
         clearInitialAction(); // Si se cierra el modal que venía de una acción inicial, limpiar
    }
};

const submitReport = async () => {
    console.log('App.vue: submitReport (WORKAROUND). Data:', reportData.value);
    reportError.value = null;
    globalError.value = null;

    if (!reportData.value.tweetId || !reportData.value.tweetContent || !reportData.value.stakeAmount) {
        reportError.value = 'Todos los campos son requeridos.';
        return;
    }
    const stakeAmountNum = parseFloat(reportData.value.stakeAmount);
    if (isNaN(stakeAmountNum) || stakeAmountNum < 0) {
        reportError.value = 'Monto de stake debe ser un número positivo o cero.';
        return;
    }
    try {
        const minStakeWei = VeritasXService.getMinStakeAmount();
        if(minStakeWei > BigInt(0) && ethers.parseEther(stakeAmountNum.toString()) < minStakeWei) {
            reportError.value = `Stake debe ser al menos ${formatMNT(minStakeWei)} MNT.`;
            return;
        }
    } catch(e) { console.warn('App.vue: No se pudo verificar min stake en UI', e); }

    setActionLoading(true, 'report');

    try {
        console.log('App.vue: Hasheando contenido para report...');
        const contentHash = hashTweetContent(reportData.value.tweetContent); // USAR FUNCIÓN IMPORTADA
        if (!contentHash) {
            throw new Error("Fallo al generar hash del contenido.");
        }
        console.log('App.vue: Hash generado:', contentHash);

        const interactionDetails = {
            contractAddress: CONTRACT_ADDRESS,
            abiFragment: VeritasXAbi.find(item => item.name === 'reportTweet'),
            functionName: 'reportTweet',
            args: [reportData.value.tweetId, contentHash],
            value: reportData.value.stakeAmount.toString()
        };

        console.log('App.vue: Enviando executeContractInteractionRequest (report) al background...', interactionDetails);
        chrome.runtime.sendMessage(
            { action: 'executeContractInteractionRequest', data: interactionDetails },
            (response) => {
                setActionLoading(false);
                if (chrome.runtime.lastError) {
                    console.error('App.vue: Error respuesta executeContractInteractionRequest (report):', chrome.runtime.lastError);
                    reportError.value = `Error comunicación: ${chrome.runtime.lastError.message}`; return;
                }
                console.log('App.vue: Respuesta executeContractInteractionRequest (report):', response);
                if (response && response.success) {
                    globalError.value = `Reporte enviado! Tx: ${formatAddress(response.txHash)}. Espera confirmación.`;
                    closeReportModal();
                    setTimeout(() => { if(initialAction.value) clearInitialAction(); else loadTweets(); }, 1000);
                } else { reportError.value = response?.error || 'Fallo al enviar reporte.'; }
            }
        );
    } catch (error) {
        console.error('App.vue: Error preparando reporte:', error);
        reportError.value = `Error: ${error.message}`;
        setActionLoading(false);
    }
};


const openVoteModal = (tweet) => {
    if (!tweet || !tweet.tweetId) {
        console.error('App.vue: openVoteModal sin tweet válido', tweet);
        globalError.value = 'Error abriendo modal de voto: datos inválidos.';
        return;
    }
    console.log('App.vue: openVoteModal para tweet:', tweet);
    selectedTweet.value = tweet;
    voteData.value = { status: '', stakeAmount: '' }; // Resetear formulario
    voteError.value = null;
    globalError.value = null;
    showVoteModal.value = true;
};

const closeVoteModal = () => {
    console.log('App.vue: closeVoteModal.');
    showVoteModal.value = false;
    selectedTweet.value = null;
    voteData.value = { status: '', stakeAmount: '' };
    voteError.value = null;
     if (initialAction.value) {
         clearInitialAction(); // Limpiar si se cierra el modal de una acción inicial
    }
};

const submitVote = async () => {
    console.log('App.vue: submitVote (WORKAROUND). Data:', voteData.value, 'Tweet:', selectedTweet.value?.tweetId);
    voteError.value = null;
    globalError.value = null;

    if (!selectedTweet.value || !voteData.value.status || !voteData.value.stakeAmount) {
        voteError.value = 'Selecciona un voto y un monto de stake.'; return;
    }
    const stakeAmountNum = parseFloat(voteData.value.stakeAmount);
    if (isNaN(stakeAmountNum) || stakeAmountNum < 0) {
        voteError.value = 'Monto de stake debe ser número positivo o cero.'; return;
    }
    try {
        const minStakeWei = VeritasXService.getMinStakeAmount();
        if(minStakeWei > BigInt(0) && ethers.parseEther(stakeAmountNum.toString()) < minStakeWei) {
            voteError.value = `Stake debe ser al menos ${formatMNT(minStakeWei)} MNT.`; return;
        }
    } catch(e) { console.warn('App.vue: No se pudo verificar min stake en UI', e); }

    setActionLoading(true, 'vote');

    try {
        const voteStatusInt = parseInt(voteData.value.status, 10);
        if (isNaN(voteStatusInt) || voteStatusInt <= 0 || voteStatusInt > 4) {
            throw new Error("Estado de voto inválido.");
        }
        const interactionDetails = {
            contractAddress: CONTRACT_ADDRESS,
            abiFragment: VeritasXAbi.find(item => item.name === 'stakeAndVote'),
            functionName: 'stakeAndVote',
            args: [selectedTweet.value.tweetId, voteStatusInt],
            value: voteData.value.stakeAmount.toString()
        };
        console.log('App.vue: Enviando executeContractInteractionRequest (vote) al background...', interactionDetails);
        chrome.runtime.sendMessage(
            { action: 'executeContractInteractionRequest', data: interactionDetails },
            (response) => {
                setActionLoading(false);
                if (chrome.runtime.lastError) {
                    console.error('App.vue: Error respuesta executeContractInteractionRequest (vote):', chrome.runtime.lastError);
                    voteError.value = `Error comunicación: ${chrome.runtime.lastError.message}`; return;
                }
                console.log('App.vue: Respuesta executeContractInteractionRequest (vote):', response);
                if (response && response.success) {
                    globalError.value = `Voto/Stake enviado! Tx: ${formatAddress(response.txHash)}. Espera confirmación.`;
                    closeVoteModal();
                    setTimeout(() => { if(initialAction.value) clearInitialAction(); else loadTweets(); }, 1000);
                } else { voteError.value = response?.error || 'Fallo al enviar voto/stake.'; }
            }
        );
    } catch (error) {
        console.error('App.vue: Error preparando voto/stake:', error);
        voteError.value = `Error: ${error.message}`;
        setActionLoading(false);
    }
};

const claim = async (tweetId) => {
    console.log(`App.vue: claim (WORKAROUND) para tweet ID: ${tweetId}.`);
    clearErrors();
    selectedTweetId.value = tweetId;
    setActionLoading(true, 'claim');

    try {
        const interactionDetails = {
            contractAddress: CONTRACT_ADDRESS,
            abiFragment: VeritasXAbi.find(item => item.name === 'claimReward'),
            functionName: 'claimReward',
            args: [tweetId],
            value: '0'
        };
        console.log('App.vue: Enviando executeContractInteractionRequest (claim) al background...', interactionDetails);
        chrome.runtime.sendMessage(
            { action: 'executeContractInteractionRequest', data: interactionDetails },
            (response) => {
                setActionLoading(false);
                selectedTweetId.value = null;
                if (chrome.runtime.lastError) {
                    console.error('App.vue: Error respuesta executeContractInteractionRequest (claim):', chrome.runtime.lastError);
                    globalError.value = `Error comunicación: ${chrome.runtime.lastError.message}`; return;
                }
                console.log('App.vue: Respuesta executeContractInteractionRequest (claim):', response);
                if (response && response.success) {
                    globalError.value = `Reclamo enviado! Tx: ${formatAddress(response.txHash)}. Espera confirmación.`;
                    loadUserStakes(); // Recargar stakes para actualizar UI
                } else { globalError.value = response?.error || 'Fallo al enviar reclamo.'; }
            }
        );
    } catch (error) {
        console.error('App.vue: Error preparando reclamo:', error);
        globalError.value = `Error: ${error.message}`;
        setActionLoading(false);
        selectedTweetId.value = null;
    }
};

onMounted(async () => {
    console.log('App.vue: ===== Component Mounted =====');
    setupMessageListener();

    // Mantener listeners de MetaMask si es relevante para UI (aunque la conexión principal va por background)
     if (window.ethereum) {
         console.log('App.vue: Found window.ethereum in popup context (Adding basic listeners).');
         window.ethereum.on('accountsChanged', async (accounts) => {
             console.log('App.vue: MetaMask accountsChanged (popup listener):', accounts);
             // Podrías forzar una reconexión o actualizar UI si la cuenta cambia
             if (isConnected.value && (!accounts || accounts.length === 0 || accounts[0].toLowerCase() !== account.value?.toLowerCase())) {
                  globalError.value = "Cuenta o conexión cambiada en MetaMask. Por favor, reconecta si es necesario.";
                  await disconnect(); // Forzar desconexión en la UI
             }
         });
         window.ethereum.on('chainChanged', (newChainId) => {
             console.log('App.vue: MetaMask chainChanged (popup listener):', newChainId);
              if (isConnected.value) {
                   globalError.value = "Red cambiada en MetaMask. Verifica la conexión o reconecta.";
                   // Podrías intentar verificar la red o forzar disconnect aquí
              }
         });
     }

    console.log('App.vue: Requesting pending action from background...');
    if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'getPendingAction' }, async (response) => {
             console.log('App.vue: Received response for getPendingAction:', response);
            if (chrome.runtime.lastError) {
                 console.error('App.vue: Error getPendingAction:', chrome.runtime.lastError.message);
                 await checkConnectionAndProcessAction(null); return;
            }
            await checkConnectionAndProcessAction(response); // response puede ser null si no hay acción
        });
    } else {
        console.error('App.vue: Cannot send message to background (onMounted).');
         await checkConnectionAndProcessAction(null); // Intentar verificar conexión de todas formas
    }
    console.log('App.vue: onMounted finished.');
});

</script>
<style scoped>
	.address-badge {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: inline-block;
		vertical-align: middle;
	}

	.tweet-card {
		border-left: 4px solid #6c757d;
	}

	.tweet-card.status-1 {
		border-left-color: #198754;
	}

	.tweet-card.status-2 {
		border-left-color: #dc3545;
	}

	.tweet-card.status-3 {
		border-left-color: #ffc107;
	}

	.tweet-card.status-4 {
		border-left-color: #0dcaf0;
	}

	.modal.d-block {
		display: block;
	}

	.text-break {
		word-break: break-all;
	}

	.small-text {
		font-size: 0.85rem;
	}

	.error-alert {
		font-size: 0.9rem;
	}

	.action-button {
		margin-right: 5px;
	}
</style>
