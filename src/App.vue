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
				<span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
				{{ isLoading ? 'Conectando...' : 'Conectar Wallet' }}
			</button>
			<div v-else class="d-flex align-items-center">
				<span class="badge bg-success me-2 address-badge" :title="account">{{ formattedAccount }}</span>
				<button
					@click="disconnect"
					class="btn btn-outline-secondary btn-sm"
					:disabled="isLoadingAction"
				>Desconectar
				</button>
			</div>
		</header>
		<div v-if="globalSuccess" class="alert alert-success alert-dismissible fade show" role="alert">
			{{ globalSuccess.message }}
			<a
				v-if="globalSuccess.link"
				:href="globalSuccess.link"
				target="_blank"
				class="alert-link ms-2"
			>{{ globalSuccess.linkText }}</a>
			<button type="button" class="btn-close" @click="clearSuccess" aria-label="Close"></button>
		</div>
		<div v-if="globalError" class="alert alert-danger alert-dismissible fade show error-alert" role="alert">
			{{ globalError }}
			<button type="button" class="btn-close" @click="clearErrors" aria-label="Close"></button>
		</div>
		<main>
			<div v-if="!isConnected && !isLoading && !initialAction">
				<p class="text-center text-muted">Conecta tu wallet (Mantle Sepolia).</p>
				<p
					v-if="initialTweetId"
					class="text-center text-warning small"
				>Conecta para verificar Tweet {{ initialTweetId }}.</p>
			</div>
			<div v-else-if="isLoading && !initialAction">
				<div class="d-flex justify-content-center align-items-center p-4">
					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
					<p class="ms-2 mb-0">Cargando conexión/datos iniciales...</p>
				</div>
			</div>
			<div v-else-if="isLoadingData && allTweets.length === 0">
				<div class="d-flex justify-content-center align-items-center p-4">
					<div class="spinner-border text-secondary" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
					<p class="ms-2 mb-0">Consultando eventos y tweets...</p>
				</div>
			</div>
			<div v-else-if="isLoadingAction && (actionType === 'processingInitialTweet')">
				<div class="d-flex justify-content-center align-items-center p-4">
					<div class="spinner-border text-info" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
					<p class="ms-2 mb-0">Procesando Tweet {{ initialTweetId }}...</p>
				</div>
			</div>
			<div v-else>
				<div class="mb-3 text-center" v-if="!initialAction && isConnected">
					<button
						class="btn btn-info btn-sm"
						@click="openReportModal(null, null)"
						:disabled="isLoadingAction || isLoadingData"
					>
						<span
							v-if="isLoadingAction && actionType === 'report'"
							class="spinner-border spinner-border-sm me-1"
							role="status"
							aria-hidden="true"
						></span>
						Reportar Nuevo Tweet
					</button>
				</div>
				<h6 class="mb-3" v-if="!initialAction && isConnected">Tweets Activos para Verificación</h6>
				<div
					v-if="!initialAction && isConnected && allTweets.length === 0 && !isLoadingData && !globalError?.includes('Failed')"
					class="text-center text-muted"
				>
					No se encontraron tweets activos reportados o no se pudieron cargar. Intenta refrescar o reportar uno nuevo.
				</div>
				<div
					v-if="!initialAction && globalError && (globalError.includes('Failed to query') || globalError.includes('Failed to get') || globalError.includes('Fallo al refrescar'))"
					class="alert alert-warning"
				>
					Error al cargar tweets: {{ globalError }}
					<br> (Verifica conexión RPC, eventos o estado del contrato).
				</div>

				<div v-if="!initialAction && isConnected && allTweets.length > 0">
					<p class="text-center text-muted small" v-if="isLoadingData">(Actualizando lista...)</p>
					<div
						v-for="tweet in displayedTweets"
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
								<span class="text-muted">{{ tweet.stakePool != null ? formatMNT(tweet.stakePool) : 'Error' }} MNT</span><br>
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
									:disabled="isLoadingAction || (userStakes[tweet.tweetId] && userStakes[tweet.tweetId].vote !== 0)"
								>
									<span
										v-if="isLoadingAction && actionType === 'vote' && selectedTweet?.tweetId === tweet.tweetId"
										class="spinner-border spinner-border-sm me-1"
										role="status"
										aria-hidden="true"
									></span>
									{{ (userStakes[tweet.tweetId] && userStakes[tweet.tweetId].vote !== 0) ? 'Ya Votaste' : 'Votar / Stakear' }}
								</button>
								<button
									v-if="isConnected && !tweet.resolved" @click="forceResolve(tweet.tweetId)"
									class="btn btn-danger btn-sm action-button"
									title="Forzar resolución (si el período ha expirado)"
									:disabled="isLoadingAction"
								>
									<span
										v-if="isLoadingAction && actionType === 'forceResolution' && selectedTweetId === tweet.tweetId"
										class="spinner-border spinner-border-sm me-1"
										role="status"
										aria-hidden="true"
									></span>
									Forzar Resolución
								</button>

							</div>
							<div v-if="isConnected && tweet.resolved">
								<button
									@click="claim(tweet.tweetId)"
									class="btn btn-warning btn-sm action-button"
									:disabled="isLoadingAction || (userStakes[tweet.tweetId] && userStakes[tweet.tweetId].claimed) || !canUserClaim(tweet.tweetId)"
								>
									<span
										v-if="isLoadingAction && actionType === 'claim' && selectedTweetId === tweet.tweetId"
										class="spinner-border spinner-border-sm me-1"
										role="status"
										aria-hidden="true"
									></span>
									{{ (userStakes[tweet.tweetId] && userStakes[tweet.tweetId].claimed) ? 'Recompensa Reclamada' : (canUserClaim(tweet.tweetId) ? 'Reclamar Recompensa' : 'No Elegible') }}
								</button>
							</div>
							<div
								v-if="isConnected && userStakes[tweet.tweetId]"
								class="mt-2 p-2 bg-light rounded small-text"
							>
								<p class="mb-1">
									Tu Stake: {{ userStakes[tweet.tweetId]?.amount != null ? formatMNT(userStakes[tweet.tweetId].amount) : '0' }} MNT |
									Tu Voto: {{ getStatusDetails(userStakes[tweet.tweetId]?.vote || 0).text }} |
									Reclamado: {{ userStakes[tweet.tweetId]?.claimed ? 'Sí' : 'No' }}
								</p>
								<p class="mb-0 fst-italic" v-if="userStakes[tweet.tweetId]?.justification">
									Tu Justificación: {{ userStakes[tweet.tweetId].justification }}
								</p>
							</div>
						</div>
					</div>
					<div
						class="text-center mt-3"
						v-if="clientSideHasMoreTweets && !initialAction && isConnected && !isLoadingData"
					>
						<button @click="loadMoreClientSide" class="btn btn-primary btn-sm" :disabled="isLoadingData">
							Mostrar Más ({{ allTweets.length - displayedTweets.length }} restantes)
						</button>
					</div>
				</div>

				<div class="text-center mt-3" v-if="!initialAction && isConnected">
					<button
						@click="refreshTweets"
						class="btn btn-outline-secondary btn-sm"
						:disabled="isLoading || isLoadingData || isLoadingAction"
					>
						<span
							v-if="isLoadingData && allTweets.length === 0"
							class="spinner-border spinner-border-sm me-1"
							role="status"
							aria-hidden="true"
						></span>
						Refrescar Tweets
					</button>
				</div>
				<div
					v-if="initialAction && !isLoadingAction && !showReportModal && !showVoteModal && isConnected"
					class="text-center text-muted mt-3"
				>
					<p>Procesamiento inicial terminado para tweet: {{ initialTweetId }}.</p>
					<button
						@click="clearInitialAction"
						class="btn btn-sm btn-link"
					>Ver todos los tweets activos
					</button>
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
						<h5 class="modal-title">Reportar Nuevo Tweet</h5>
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
                      <p class="mt-2 mb-0">Enviando Reporte...</p>
                      <p class="small text-muted">Por favor, confirma en tu wallet.</p>
                   </div>

                   <div v-else>
                      <div class="mb-3">
                         <label for="reportTweetId" class="form-label">Tweet ID *</label>
                         <input
                            type="text"
                            class="form-control"
                            id="reportTweetId"
                            v-model.trim="reportData.tweetId"
                            placeholder="Introduce el ID numérico del tweet"
                            :disabled="!!initialTweetId || isLoadingAction"
                            >
                      </div>

                      <div v-if="isAiLoading" class="text-center p-3 my-3 border rounded bg-light">
                         <div class="spinner-border spinner-border-sm text-info me-2" role="status">
                            <span class="visually-hidden">Cargando...</span>
                         </div>
                         <span class="text-info fst-italic">IA está dando su opinión...</span>
                      </div>
                      <div v-else-if="aiError" class="alert alert-warning alert-sm p-2 my-3 error-alert">
                         <strong>Error IA:</strong> {{ aiError }}
                      </div>
                      <div v-else-if="aiOpinion" class="alert alert-info alert-sm p-2 my-3">
                         <strong class="d-block mb-1">💡 Sugerencia IA:</strong>
                         <p class="mb-0 small fst-italic"> {{ aiOpinion.reason }}</p>
                      </div>

                      <div class="mb-3">
                         <label for="reportTweetContent" class="form-label">Contenido del Tweet *</label>
                         <textarea
                            class="form-control"
                            id="reportTweetContent"
                            rows="4"
                            v-model="reportData.tweetContent"
                            placeholder="Pega o verifica el contenido exacto del tweet"
                            :disabled="isLoadingAction"
                            ></textarea>
                         <div class="form-text">El contenido será hasheado (Keccak256) antes de enviar.</div>
                      </div>

                      <div class="mb-3">
                         <label for="reportStakeAmount" class="form-label">Monto de Stake (MNT) *</label>
                         <input
                            type="number"
                            step="0.01"
                            min="0"
                            class="form-control"
                            id="reportStakeAmount"
                            v-model="reportData.stakeAmount"
                            :placeholder="`Mínimo: ${minStakeFormatted} MNT`"
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
						>Cancelar
						</button>
						<button
							type="button"
							class="btn btn-primary"
							@click="submitReport"
							:disabled="isLoadingAction || !isConnected || !reportData.tweetId || !reportData.tweetContent || !reportData.stakeAmount"
						>
							<span
								v-if="isLoadingAction && actionType === 'report'"
								class="spinner-border spinner-border-sm me-1"
								role="status"
								aria-hidden="true"
							></span>
							{{ (isLoadingAction && actionType === 'report') ? 'Enviando...' : 'Reportar Tweet' }}
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
						<h5 class="modal-title">Votar y Stakear en Tweet {{ selectedTweet?.tweetId }}</h5>
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
						<div v-else-if="aiError" class="alert alert-warning alert-sm p-2 my-3 error-alert">
							<strong>Error IA:</strong> {{ aiError }}
						</div>
						<div v-else-if="aiOpinion" class="alert alert-info alert-sm p-2 my-3">
							<strong class="d-block mb-1">💡 Sugerencia IA:</strong>
							<p class="mb-1 small">
								<strong>Veredicto IA:</strong> {{ aiOpinion.result ? 'Verdadero' : 'Falso' }}</p>
							<p class="mb-0 small fst-italic"><strong>Razón IA:</strong> {{ aiOpinion.reason }}</p>
						</div>

						<div v-if="actionType === 'vote' && isLoadingAction" class="text-center p-3">
							<div class="spinner-border text-primary" role="status">
								<span class="visually-hidden">Submitting...</span>
							</div>
							<p class="mt-2 mb-0">Enviando Voto/Stake...</p>
							<p class="small text-muted">Por favor, confirma en tu wallet.</p>
						</div>
						<div v-else>
							<p class="small-text text-break mb-1">Tweet ID:
								<strong>{{ selectedTweet?.tweetId }}</strong>
							</p>
							<div
								v-if="selectedTweet?.tweetContent || initialTweetContent"
								class="mb-3 p-2 border rounded bg-light small-text"
								style="white-space: pre-wrap; max-height: 100px; overflow-y: auto;"
							>
								<strong>Contenido del Reporter:</strong><br>{{ selectedTweet?.tweetContent || initialTweetContent }}
							</div>
							<p v-else class="mb-3 p-2 border rounded bg-light-warning small-text fst-italic">
								Contenido del tweet no disponible en este momento. Verifica el ID.
							</p>
							<p class="small-text">Selecciona tu evaluación, justificación y el monto de MNT a stakear.</p>
							<div class="mb-3">
								<label for="voteStatus" class="form-label">Tu Voto *</label>
								<select
									class="form-select"
									id="voteStatus"
									v-model="voteData.status"
									:disabled="isLoadingAction"
								>
									<option disabled value="">Por favor, selecciona un estado</option>
									<option v-for="option in voteOptions" :key="option.value" :value="option.value">
										{{ option.text }}
									</option>
								</select>
							</div>
							<div class="mb-3">
								<label for="voteJustification" class="form-label">Justificación *</label>
								<textarea
									class="form-control"
									id="voteJustification"
									rows="3"
									v-model.trim="voteData.justification"
									placeholder="Explica brevemente tu voto (requerido)..."
									:disabled="isLoadingAction"
									maxlength="200"
								></textarea>
								<div class="form-text">{{ voteData.justification.length }}/200 caracteres</div>
							</div>
							<div class="mb-3">
								<label for="voteStakeAmount" class="form-label">Monto de Stake (MNT) *</label>
								<input
									type="number"
									step="0.01"
									min="0"
									class="form-control"
									id="voteStakeAmount"
									v-model="voteData.stakeAmount"
									:placeholder="`Mínimo: ${minStakeFormatted} MNT`"
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
						>Cancelar
						</button>
						<button
							type="button"
							class="btn btn-primary"
							@click="submitVote"
							:disabled="isLoadingAction || !isConnected || !voteData.status || !voteData.stakeAmount || !voteData.justification"
						>
							<span
								v-if="isLoadingAction && actionType === 'vote'"
								class="spinner-border spinner-border-sm me-1"
								role="status"
								aria-hidden="true"
							></span>
							{{ (isLoadingAction && actionType === 'vote') ? 'Enviando...' : 'Enviar Voto & Stake' }}
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
		hashTweetContent,
	} from './helpers.js';

	const CONTRACT_ADDRESS = '0x307bDca58c2761F9be800790C900e554E43250a9';
	const MANTLE_SEPOLIA_EXPLORER_URL = 'https://explorer.sepolia.mantle.xyz';
	const isAiLoading = ref(false);
	const aiOpinion = ref(null); // { result: boolean, reason: string } | null
	const aiError = ref(null);
	const isConnected = ref(false);
	const account = ref(null);
	const allTweets = ref([]);
	const userStakes = ref({});
	const isLoading = ref(false);
	const isLoadingData = ref(false);
	const isLoadingAction = ref(false);
	const actionType = ref('');
	const globalError = ref(null);
	const globalSuccess = ref(null);
	const minStake = ref(BigInt(0));

	const initialAction = ref(null);
	const initialTweetId = ref(null);
	const initialTweetContent = ref(null);

	const showReportModal = ref(false);
	const reportData = ref({ tweetId: '', tweetContent: '', stakeAmount: '' });
	const reportError = ref(null);

	const showVoteModal = ref(false);
	const selectedTweet = ref(null);
	const selectedTweetId = ref(null);
	const voteData = ref({ status: '', stakeAmount: '', justification: '' });
	const voteError = ref(null);
	const voteOptions = ref(VOTE_OPTIONS);

	const clientCurrentPage = ref(1);
	const clientPageSize = ref(5);

	const formattedAccount = computed(() => formatAddress(account.value));
	const minStakeFormatted = computed(() => {
		try {
			return formatMNT(minStake.value ?? BigInt(0), 2);
		} catch(e) {
			console.error('Error formatting minStake:', minStake.value, e);
			return 'Error';
		}
	});
	const logoUrl = computed(() => {
		try {
			return chrome.runtime.getURL('icons/icon128.svg');
		} catch(e) {
			return './icons/icon128.svg';
		}
	});

	const displayedTweets = computed(() => {
		const start = (clientCurrentPage.value - 1) * clientPageSize.value;
		const end = start + clientPageSize.value;
		return allTweets.value.slice(start, end);
	});

	const clientSideHasMoreTweets = computed(() => {
		return displayedTweets.value.length < allTweets.value.length;
	});

	async function fetchAiOpinion(tweetContent) {
		console.log('App.vue: fetchAiOpinion called. Received content:', tweetContent ? tweetContent.substring(0, 50) + '...' : tweetContent);
		aiOpinion.value = null;
		aiError.value = null;
		isAiLoading.value = false;

		if(!tweetContent || typeof tweetContent !== 'string' || tweetContent.trim() === '') {
			console.warn('App.vue: fetchAiOpinion - No valid tweet content provided. Aborting AI call.');
			aiError.value = 'No hay contenido de tweet disponible para analizar.';
			return;
		}

		isAiLoading.value = true;
		const apiUrl = 'https://wapa-api.qcdr.io/ai/resolve-check';
		console.log('App.vue: Fetching AI opinion from:', apiUrl);

		try {
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ prompt: tweetContent }),
			});
			console.log('App.vue: AI API Response Status:', response.status);

			if(!response.ok) {
				let errorBody = 'Could not read error body';
				try {
					errorBody = await response.text();
					console.error('App.vue: AI API Error Body:', errorBody);
				} catch(e) {
					console.error('App.vue: Failed to read AI API error body:', e);
				}
				throw new Error(`Error ${ response.status }: ${ response.statusText }. Body: ${ errorBody }`);
			}

			const jsonResponse = await response.json();
			console.log('App.vue: AI API JSON Response:', jsonResponse);

			if(jsonResponse.result === 'success' && jsonResponse.data && typeof jsonResponse.data.result !== 'undefined' && jsonResponse.data.reason) {
				aiOpinion.value = {
					result: jsonResponse.data.result,
					reason: jsonResponse.data.reason,
				};
				console.log('App.vue: AI Opinion Received and Parsed:', aiOpinion.value);
			} else {
				console.error('App.vue: Unexpected AI API response format:', jsonResponse);
				throw new Error(jsonResponse.message || 'Formato de respuesta inesperado de la API de IA.');
			}
		} catch(error) {
			console.error('App.vue: Error during fetchAiOpinion:', error);
			aiError.value = `Error al consultar la IA: ${ error.message }`;
			aiOpinion.value = null;
		} finally {
			console.log('App.vue: fetchAiOpinion finished. Setting isAiLoading to false.');
			isAiLoading.value = false;
		}
	}

	const loadMoreClientSide = () => {
		if(clientSideHasMoreTweets.value) {
			clientCurrentPage.value++;
			loadUserStakes();
		}
	};

	const setActionLoading = (loading, type = '') => {
		isLoadingAction.value = loading;
		actionType.value = loading ? type : '';
	};

	const clearErrors = () => {
		globalError.value = null;
		reportError.value = null;
		voteError.value = null;
	};
	const clearSuccess = () => { globalSuccess.value = null; };

	const showGlobalSuccess = (message, txHash = null) => {
		clearErrors();
		let linkInfo = {};
		if(txHash) {
			const explorerLink = `<span class="math-inline">\{ MANTLE\_SEPOLIA\_EXPLORER\_URL \}/tx/</span>{ txHash }`;
			linkInfo = { link: explorerLink, linkText: `Ver Tx: ${ formatAddress(txHash) }` };
		}
		globalSuccess.value = { message, ...linkInfo };
		setTimeout(clearSuccess, 10000);
	};

	const clearInitialAction = () => {
		initialAction.value = null;
		initialTweetId.value = null;
		initialTweetContent.value = null;
		if(isConnected.value) refreshTweets();
	};

	const handleConnectResponse = async (response) => {
		isLoading.value = false;
		if(response?.success && response.accounts?.length > 0) {
			account.value = response.accounts[0];
			isConnected.value = true;
			clearErrors();
			try {
				await chrome.storage.local.set({ userAccount: account.value });
				await loadMinStake();
				if(initialAction.value === 'verify' && initialTweetId.value) await processInitialTweet(initialTweetId.value);
				else await refreshTweets();
			} catch(error) {
				globalError.value = `Error post-conexión: ${ error.message }`;
			}
		} else {
			globalError.value = response?.error || 'Fallo al conectar.';
			await disconnect();
		}
	};

	const connect = () => {
		isLoading.value = true;
		clearErrors();
		clearSuccess();
		try {
			if(!chrome.runtime?.sendMessage) throw new Error('Runtime no disponible.');
			chrome.runtime.sendMessage({ action: 'connectWalletRequest' }, handleConnectResponse);
		} catch(error) {
			globalError.value = `Error comm: ${ error.message }`;
			isLoading.value = false;
		}
	};

	const disconnect = async () => {
		isConnected.value = false;
		account.value = null;
		allTweets.value = [];
		userStakes.value = {};
		initialAction.value = null;
		initialTweetId.value = null;
		initialTweetContent.value = null;
		minStake.value = BigInt(0);
		clientCurrentPage.value = 1;
		clearErrors();
		clearSuccess();
		try {
			await chrome.storage.local.remove('userAccount');
		} catch(e) {
		}
	};

	const loadMinStake = async () => {
		try {
			minStake.value = await VeritasXService.getMinStakeAmount();
		} catch(error) {
			globalError.value = `No se pudo cargar min stake: ${ error.message }`;
			minStake.value = ethers.parseEther('0.01');
		}
	};

	const refreshTweets = async () => {
		if(!isConnected.value || initialAction.value) return;
		console.log('App.vue: Refreshing tweets using event query...');
		isLoadingData.value = true;
		clearErrors();
		allTweets.value = [];
		clientCurrentPage.value = 1;
		userStakes.value = {};

		try {
			console.log('Querying reported events...');
			const reportedIds = await VeritasXService.queryReportedTweetEvents();
			console.log(`Found ${ reportedIds.length } reported IDs.`);

			if(reportedIds.length === 0) {
				allTweets.value = [];
				isLoadingData.value = false;
				return;
			}

			console.log('Querying resolved events...');
			const resolvedIdsSet = await VeritasXService.queryResolvedTweetEvents();
			console.log(`Found ${ resolvedIdsSet.size } resolved IDs.`);

			const potentiallyActiveIds = reportedIds.filter(id => !resolvedIdsSet.has(id));
			console.log(`Found ${ potentiallyActiveIds.length } potentially active IDs. Fetching info...`);

			if(potentiallyActiveIds.length === 0) {
				allTweets.value = [];
				isLoadingData.value = false;
				return;
			}

			const batchSize = 20; // Fetch more details at once if possible
			let verifiedActiveTweets = [];
			const infoPromises = [];

			for(const id of potentiallyActiveIds) {
				infoPromises.push(VeritasXService.getTweetInfo(id));
			}
			const allInfos = await Promise.all(infoPromises);
			verifiedActiveTweets = allInfos.filter(info => info && !info.resolved);

			console.log(`Found ${ verifiedActiveTweets.length } verified active tweets.`);
			verifiedActiveTweets.sort((a, b) => b.reportTime - a.reportTime);
			allTweets.value = verifiedActiveTweets;
			await loadUserStakes();

		} catch(error) {
			console.error('App.vue: Failed to refresh tweets:', error);
			globalError.value = `Fallo al refrescar tweets: ${ error.message }`;
			allTweets.value = [];
		} finally {
			isLoadingData.value = false;
		}
	};

	const loadUserStakes = async () => {
		if(!isConnected.value || !account.value || !allTweets.value || allTweets.value.length === 0) return;
		const visibleTweets = displayedTweets.value; // Check only currently visible tweets
		const tweetsToLoadStakesFor = visibleTweets.filter(t => t && t.tweetId && !userStakes.value.hasOwnProperty(t.tweetId));

		if(tweetsToLoadStakesFor.length === 0) return;
		console.log(`App.vue: Loading stakes for ${ tweetsToLoadStakesFor.length } visible tweets.`);

		const stakePromises = tweetsToLoadStakesFor.map(async (tweet) => {
			try {
				const stakeInfo = await VeritasXService.getUserStake(tweet.tweetId, account.value);
				return {
					tweetId: tweet.tweetId,
					stakeInfo: stakeInfo || { amount: BigInt(0), vote: 0, justification: '', claimed: false },
				}; // Return default if null
			} catch(error) {
				console.warn(`App.vue: Could not load stake for ${ tweet.tweetId }: ${ error.message }`);
				return { tweetId: tweet.tweetId, stakeInfo: null }; // Indicate failure
			}
		});

		const results = await Promise.all(stakePromises);
		const newStakes = {};
		results.forEach(result => {
			if(result.stakeInfo !== null) { // Only add if fetch didn't completely fail
				newStakes[result.tweetId] = result.stakeInfo;
			}
		});

		userStakes.value = { ...userStakes.value, ...newStakes };
	};

	const processInitialTweet = async (tweetId) => {
		if(!isConnected.value || !account.value) {
			globalError.value = `Conecta wallet.`;
			setActionLoading(false);
			return;
		}
		setActionLoading(true, 'processingInitialTweet');
		clearErrors();
		clearSuccess();
		try {
			const tweetInfo = await VeritasXService.getTweetInfo(tweetId);
			if(tweetInfo?.tweetId) {
				if(initialTweetContent.value) tweetInfo.tweetContent = initialTweetContent.value;
				const userStakeInfo = await VeritasXService.getUserStake(tweetId, account.value);
				if(tweetInfo.resolved) {
					showGlobalSuccess(`Tweet <span class="math-inline">\{ tweetId \} resuelto \(</span>{ getStatusDetails(tweetInfo.status).text }).`, null);
					clearInitialAction();
				} else if(userStakeInfo?.vote !== 0) {
					showGlobalSuccess(`Ya votaste en Tweet ${ tweetId }.`, null);
					clearInitialAction();
				} else {
					openVoteModal(tweetInfo);
				}
			} else {
				openReportModal(tweetId, initialTweetContent.value);
			}
		} catch(error) {
			globalError.value = `Error procesando ${ tweetId }: ${ error.message }`;
			clearInitialAction();
		} finally {
			setActionLoading(false);
		}
	};

	const checkConnectionAndProcessAction = async (actionInfo) => {
		isLoading.value = true;
		globalError.value = null;
		clearSuccess();
		try {
			const { userAccount: storedAccount } = await chrome.storage.local.get([ 'userAccount' ]);
			if(storedAccount) {
				account.value = storedAccount;
				isConnected.value = true;
				if(actionInfo?.action === 'verify' && actionInfo?.tweetId) {
					initialAction.value = actionInfo.action;
					initialTweetId.value = actionInfo.tweetId;
					initialTweetContent.value = actionInfo.tweetContent;
				}
				await loadMinStake();
				if(initialAction.value === 'verify') await processInitialTweet(initialTweetId.value);
				else await refreshTweets();
			} else {
				await disconnect();
				if(actionInfo?.action === 'verify' && actionInfo?.tweetId) {
					initialAction.value = actionInfo.action;
					initialTweetId.value = actionInfo.tweetId;
					initialTweetContent.value = actionInfo.tweetContent;
				}
			}
		} catch(error) {
			await disconnect();
			globalError.value = `Error inicial: ${ error.message }`;
		} finally {
			isLoading.value = false;
		}
	};

	const setupMessageListener = () => {
		if(!chrome.runtime?.onMessage) return;
		const listener = (message) => {
			if(message.action === 'connectWalletResponse') handleConnectResponse(message);
			return false;
		};
		if(!chrome.runtime.onMessage.hasListener(listener)) {
			chrome.runtime.onMessage.addListener(listener);
		}
	};

	const openReportModal = (tweetId = null, presetContent = null) => {
		if(minStake.value === BigInt(0) && isConnected.value) loadMinStake();
		reportData.value = { tweetId: tweetId || '', tweetContent: presetContent || '', stakeAmount: '' };
		reportError.value = null;
		clearSuccess();

		// Reset AI state before opening
		isAiLoading.value = false;
		aiOpinion.value = null;
		aiError.value = null;

		showReportModal.value = true;

		// Call AI opinion fetch ONLY if content is available
		if(presetContent) {
			fetchAiOpinion(presetContent);
		}
	};
	const closeReportModal = () => {
		showReportModal.value = false;
		reportData.value = { tweetId: '', tweetContent: '', stakeAmount: '' };
		reportError.value = null;
		if(initialAction.value) clearInitialAction();
	};

	const submitReport = async () => {
		reportError.value = null;
		clearSuccess();
		if(!reportData.value.tweetId || !reportData.value.tweetContent || !reportData.value.stakeAmount) {
			reportError.value = 'Campos requeridos.';
			return;
		}
		let stakeAmountWei;
		try {
			stakeAmountWei = ethers.parseEther(reportData.value.stakeAmount.toString());
			if(stakeAmountWei < BigInt(0)) throw new Error('Stake negativo');
			if(minStake.value > BigInt(0) && stakeAmountWei < minStake.value) {
				reportError.value = `Stake mínimo: ${ minStakeFormatted.value } MNT.`;
				return;
			}
		} catch(e) {
			reportError.value = 'Stake inválido.';
			return;
		}
		setActionLoading(true, 'report');
		try {
			const contentHash = hashTweetContent(reportData.value.tweetContent);
			if(!contentHash) throw new Error('Fallo hash.');
			const interactionDetails = {
				contractAddress: CONTRACT_ADDRESS,
				abiFragment: VeritasXAbi.find(i => i.name === 'reportTweet'),
				functionName: 'reportTweet',
				args: [ reportData.value.tweetId, contentHash ],
				value: reportData.value.stakeAmount.toString(),
			};
			chrome.runtime.sendMessage({
				action: 'executeContractInteractionRequest',
				data: interactionDetails,
			}, (response) => {
				setActionLoading(false);
				if(chrome.runtime.lastError) {
					reportError.value = `Error comm: ${ chrome.runtime.lastError.message }`;
					return;
				}
				if(response?.success) {
					showGlobalSuccess('Reporte enviado!', response.txHash);
					// Optional: Add to local cache here if implemented
					closeReportModal();
					setTimeout(() => { if(initialAction.value) clearInitialAction(); else refreshTweets(); }, 3000);
				} else {
					reportError.value = response?.error || 'Fallo al enviar.';
				}
			});
		} catch(error) {
			reportError.value = `Error: ${ error.message }`;
			setActionLoading(false);
		}
	};

	const openVoteModal = (tweet) => {
		if(!tweet?.tweetId) {
			globalError.value = 'Error: Datos de tweet inválidos para abrir modal.';
			return;
		}
		console.log('App.vue: openVoteModal called for tweet ID:', tweet.tweetId, 'Initial Action:', initialAction.value);
		if(minStake.value === BigInt(0) && isConnected.value) loadMinStake();

		// Reset AI state variables (aunque ya no se usarán aquí, es buena práctica)
		isAiLoading.value = false;
		aiOpinion.value = null;
		aiError.value = null;

		selectedTweet.value = tweet;
		voteData.value = { status: '', stakeAmount: '', justification: '' };
		voteError.value = null;
		clearSuccess();
		showVoteModal.value = true;

		// <<< Ya NO se llama a fetchAiOpinion desde aquí >>>
	};
	const closeVoteModal = () => {
		showVoteModal.value = false;
		selectedTweet.value = null;
		voteData.value = { status: '', stakeAmount: '', justification: '' };
		voteError.value = null;

		// Clear AI state
		isAiLoading.value = false;
		aiOpinion.value = null;
		aiError.value = null;

		if(initialAction.value) clearInitialAction();
	};

	const submitVote = async () => {
		voteError.value = null;
		clearSuccess();
		if(!selectedTweet.value || !voteData.value.status || !voteData.value.stakeAmount || !voteData.value.justification) {
			voteError.value = 'Campos requeridos.';
			return;
		}
		if(voteData.value.justification.length > 200) {
			voteError.value = '> 200 chars.';
			return;
		}
		let stakeAmountWei;
		try {
			stakeAmountWei = ethers.parseEther(voteData.value.stakeAmount.toString());
			if(stakeAmountWei < BigInt(0)) throw new Error('Stake negativo');
			if(minStake.value > BigInt(0) && stakeAmountWei < minStake.value) {
				voteError.value = `Stake mínimo: ${ minStakeFormatted.value } MNT.`;
				return;
			}
		} catch(e) {
			voteError.value = 'Stake inválido.';
			return;
		}
		setActionLoading(true, 'vote');
		try {
			const voteStatusInt = parseInt(voteData.value.status, 10);
			if(isNaN(voteStatusInt) || voteStatusInt <= 0 || voteStatusInt > 4) throw new Error('Voto inválido.');
			const interactionDetails = {
				contractAddress: CONTRACT_ADDRESS,
				abiFragment: VeritasXAbi.find(i => i.name === 'stakeAndVote'),
				functionName: 'stakeAndVote',
				args: [ selectedTweet.value.tweetId, voteStatusInt, voteData.value.justification ],
				value: voteData.value.stakeAmount.toString(),
			};
			chrome.runtime.sendMessage({
				action: 'executeContractInteractionRequest',
				data: interactionDetails,
			}, (response) => {
				setActionLoading(false);
				if(chrome.runtime.lastError) {
					voteError.value = `Error comm: ${ chrome.runtime.lastError.message }`;
					return;
				}
				if(response?.success) {
					showGlobalSuccess('Voto/Stake enviado!', response.txHash);
					closeVoteModal();
					setTimeout(() => { if(initialAction.value) clearInitialAction(); else refreshTweets(); }, 3000);
				} else {
					voteError.value = response?.error || 'Fallo al enviar.';
				}
			});
		} catch(error) {
			voteError.value = `Error: ${ error.message }`;
			setActionLoading(false);
		}
	};

	const canUserClaim = (tweetId) => {
		const tweet = allTweets.value.find(t => t?.tweetId === tweetId);
		const userStake = userStakes.value[tweetId];
		if(!tweet?.resolved || !userStake?.amount || userStake.claimed) return false;
		return userStake.vote !== 0 && userStake.vote === tweet.status;
	};

	const claim = async (tweetId) => {
		clearErrors();
		clearSuccess();
		if(!canUserClaim(tweetId)) {
			globalError.value = 'No elegible o ya reclamado.';
			return;
		}
		selectedTweetId.value = tweetId;
		setActionLoading(true, 'claim');
		try {
			const interactionDetails = {
				contractAddress: CONTRACT_ADDRESS, abiFragment: VeritasXAbi.find(i => i.name === 'claimReward'),
				functionName: 'claimReward', args: [ tweetId ], value: '0',
			};
			chrome.runtime.sendMessage({
				action: 'executeContractInteractionRequest',
				data: interactionDetails,
			}, (response) => {
				setActionLoading(false);
				selectedTweetId.value = null;
				if(chrome.runtime.lastError) {
					globalError.value = `Error comm: ${ chrome.runtime.lastError.message }`;
					return;
				}
				if(response?.success) {
					showGlobalSuccess('Recompensa reclamada!', response.txHash);
					loadUserStakes();
				} else {
					globalError.value = response?.error || 'Fallo al reclamar.';
				}
			});
		} catch(error) {
			globalError.value = `Error: ${ error.message }`;
			setActionLoading(false);
			selectedTweetId.value = null;
		}
	};

	onMounted(async () => {
		console.log('App.vue: Mounted');
		setupMessageListener();
		if(window.ethereum) {
			window.ethereum.on('accountsChanged', async (accounts) => {
				if(isConnected.value && (!accounts?.length || (account.value && accounts[0]?.toLowerCase() !== account.value.toLowerCase()))) {
					globalError.value = 'Cuenta cambiada/desconectada.';
					await disconnect();
				}
			});
			window.ethereum.on('chainChanged', async () => {
				if(isConnected.value) {
					globalError.value = 'Red cambiada.';
					await disconnect();
				}
			});
		}
		if(chrome.runtime?.sendMessage) {
			chrome.runtime.sendMessage({ action: 'getPendingAction' }, async (response) => {
				if(chrome.runtime.lastError) console.error('Error getPendingAction:', chrome.runtime.lastError);
				await checkConnectionAndProcessAction(response);
			});
		} else {
			await checkConnectionAndProcessAction(null);
		}
		console.log('App.vue: Mounted setup finished.');
	});
	const forceResolve = async (tweetId) => {
		if(!isConnected.value || !tweetId) {
			globalError.value = 'Conecta tu wallet o falta ID de tweet.';
			return;
		}

		const tweet = allTweets.value.find(t => t.tweetId === tweetId);
		if(tweet?.resolved) {
			globalError.value = 'Este tweet ya está resuelto.';
			return;
		}

		clearErrors();
		clearSuccess();
		selectedTweetId.value = tweetId; // Para saber qué botón mostrará el spinner
		setActionLoading(true, 'forceResolution'); // Usar el tipo de acción

		try {
			// Encontrar el fragmento ABI para forceResolution
			const abiFragment = VeritasXAbi.find(item => item.name === 'forceResolution' && item.type === 'function');
			if(!abiFragment) {
				throw new Error('No se encontró \'forceResolution\' en el ABI.');
			}

			const interactionDetails = {
				contractAddress: CONTRACT_ADDRESS,
				abiFragment: abiFragment,
				functionName: 'forceResolution',
				args: [ tweetId ], // Argumento es el tweetId
				value: '0', // No es payable
			};

			console.log(`App.vue: Enviando executeContractInteractionRequest para forceResolution (${ tweetId })`, interactionDetails);

			chrome.runtime.sendMessage({
				action: 'executeContractInteractionRequest',
				data: interactionDetails,
			}, (response) => {
				setActionLoading(false); // Detener spinner general
				selectedTweetId.value = null; // Limpiar ID seleccionado

				if(chrome.runtime.lastError) {
					console.error('App.vue (ForceResolve): Error comm:', chrome.runtime.lastError.message);
					globalError.value = `Error de comunicación: ${ chrome.runtime.lastError.message }`;
					return;
				}

				if(response?.success) {
					console.log(`App.vue (ForceResolve): Transacción enviada para ${ tweetId }! Hash:`, response.txHash);
					showGlobalSuccess(`Llamada a forceResolution para ${ tweetId } enviada!`, response.txHash);
					// Opcional: Refrescar después de un tiempo, o solo actualizar el estado local si es posible
					setTimeout(() => refreshTweets(), 5000); // Refrescar lista después de 5s
				} else {
					console.error(`App.vue (ForceResolve): Fallo al enviar tx para ${ tweetId }:`, response?.error);
					// Mostrar errores específicos del contrato si vienen en la respuesta
					let errorMsg = response?.error || 'Error desconocido.';
					if(errorMsg.includes('Resolution period not ended')) {
						errorMsg = 'El período de resolución aún no ha terminado.';
					} else if(errorMsg.includes('Tweet already resolved')) {
						errorMsg = 'El tweet ya fue resuelto (quizás por otra llamada).';
					}
					globalError.value = `Error al forzar resolución: ${ errorMsg }`;
				}
			});

		} catch(error) {
			console.error(`App.vue (ForceResolve): Error preparando la llamada para ${ tweetId }:`, error);
			globalError.value = `Error: ${ error.message }`;
			setActionLoading(false);
			selectedTweetId.value = null;
		}
	};
</script>
<style scoped>
	.address-badge {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: inline-block;
		vertical-align: middle;
		font-size: .8rem;
		font-family: monospace
	}

	.tweet-card {
		border-left: 4px solid #6c757d;
		margin-bottom: 1rem;
		transition: box-shadow .3s ease-in-out
	}

	.tweet-card:hover {
		box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .15) !important
	}

	.tweet-card.status-0 {
		border-left-color: #6c757d
	}

	.tweet-card.status-1 {
		border-left-color: #198754
	}

	.tweet-card.status-2 {
		border-left-color: #dc3545
	}

	.tweet-card.status-3 {
		border-left-color: #ffc107
	}

	.tweet-card.status-4 {
		border-left-color: #0dcaf0
	}

	.modal.d-block {
		display: block
	}

	.text-break {
		word-break: break-all
	}

	.small-text {
		font-size: .85rem
	}

	.error-alert {
		font-size: .9rem
	}

	.action-button {
		margin-right: 5px;
		margin-bottom: 5px
	}

	.alert-link {
		text-decoration: underline;
		cursor: pointer
	}

	.container-fluid {
		min-width: 420px;
		padding: 1rem
	}

	.bg-light-warning {
		background-color: #fff3cd
	}

	textarea {
		resize: vertical
	}
</style>
