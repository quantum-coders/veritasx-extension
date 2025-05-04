import { ethers } from 'ethers';
import { VeritasXAbi } from './VeritasX.abi.js';

console.log('VeritasX Background SW Loading - Workaround v1 Clean');

let pendingAction = null;
let userAccount = null;
let lastRequestTimestamps = {};
const DEBOUNCE_DELAY_MS = 500;
const CONTRACT_ADDRESS = '0x307bDca58c2761F9be800790C900e554E43250a9'; // <<< ¡¡¡ ACTUALIZA ESTO !!!

async function injectAndConnect(tabId, attempt = 1) {
	const logPrefix = `[injectConnect-${ tabId }-${ attempt }] `;
	console.log(`Background ${ logPrefix }: Ejecutando injectAndConnect...`);
	try {
		function pageScript_inj() {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					if(typeof window.ethereum === 'undefined' || !window.ethereum.isMetaMask) {
						const errorMsg = 'MetaMask (window.ethereum) no encontrado. Desbloquea/Permisos y Recarga.';
						return reject(new Error(errorMsg));
					}
					window.ethereum.request({ method: 'eth_requestAccounts' })
						.then(accounts => {
							if(accounts && accounts.length > 0) {
								resolve({ success: true, accounts: accounts });
							} else {
								reject(new Error('No se concedió permiso para ninguna cuenta.'));
							}
						})
						.catch(err => {
							let errorMsg = `Error solicitar cuenta: ${ err.message || '?' }`;
							if(err.code === 4001) {
								errorMsg = 'Conexión rechazada por el usuario.';
							} else if(err.code === -32002) {
								errorMsg = 'Solicitud pendiente. Revisa MetaMask.';
							}
							reject(new Error(errorMsg));
						});
				}, 150);
			});
		}

		const executionResult = await chrome.scripting.executeScript({
			target: { tabId: tabId, frameIds: [ 0 ] },
			world: 'MAIN',
			func: pageScript_inj,
		});
		if(!executionResult || executionResult.length === 0 || !executionResult[0]) {
			throw new Error('No se recibió resultado válido de inyección.');
		}
		const frameResult = executionResult[0];
		if(frameResult.error) {
			throw new Error(`Error inyección: ${ frameResult.error.message || JSON.stringify(frameResult.error) }`);
		}
		if(frameResult.result?.success) {
			if(frameResult.result.accounts && frameResult.result.accounts.length > 0) {
				userAccount = frameResult.result.accounts[0];
				console.log(`Background ${ logPrefix }: Cuenta conectada guardada: ${ userAccount }`);
				try {
					await chrome.storage.local.set({ userAccount: userAccount });
				} catch(e) {
					console.warn('No se pudo guardar cuenta en storage', e);
				}
			}
			return { success: true, accounts: frameResult.result.accounts };
		} else {
			let detail = 'Resultado inesperado o promesa rechazada.';
			if(frameResult.result && typeof frameResult.result.message === 'string') {
				detail = frameResult.result.message;
			} else if(frameResult.result === null) {
				detail = 'Script inyectado devolvió null.';
			}
			throw new Error(detail);
		}
	} catch(error) {
		console.error(`Background ${ logPrefix }: Error capturado en injectAndConnect:`, error);
		let specificError = error.message || 'Error desconocido inject/connect';
		if(specificError.includes('No active tab')) specificError = 'No hay pestaña activa.';
		else if(specificError.includes('Cannot access') || specificError.includes('Cannot access chrome://')) specificError = 'No se puede acceder a esta pestaña.';
		else if(specificError.includes('Extension context invalidated')) specificError = 'Contexto inválido (recarga extensión?).';
		else if(specificError.includes('Frame with ID 0 was navigated')) specificError = 'Página recargada durante conexión.';
		else if(specificError.includes('Cannot create execution context')) specificError = 'No se pudo crear contexto en pestaña.';
		else if(specificError.includes('MetaMask') || specificError.includes('Conexión rechazada') || specificError.includes('Solicitud pendiente') || specificError.includes('No se concedió permiso')) {
		}
		throw new Error(specificError);
	}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	const action = request?.action;
	const logPrefix = `[${ action || 'NoAction' }] `;
	console.log(`Background ${ logPrefix }: Mensaje Recibido. Acción: ${ action }`, '| Origen:', sender.tab ? `Tab ${ sender.tab.id }` : 'Popup/Other');

	if(!action) return false;

	if(action === 'executeContractInteractionRequest') {
		console.log(`Background ${ logPrefix }: >>> INICIANDO EJECUCIÓN VIA INYECCIÓN >>>`, request.data);
		(async () => {
			if(!userAccount) {
				console.error(`Background ${ logPrefix }: Error - No hay cuenta de usuario conectada.`);
				sendResponse({ success: false, error: 'Wallet no conectada en el background.' });
				return;
			}
			if(!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) { // VERIFICAR DIRECCIÓN
				console.error(`Background ${ logPrefix }: Error - CONTRACT_ADDRESS inválida o no definida: ${ CONTRACT_ADDRESS }`);
				sendResponse({
					success: false,
					error: 'La dirección del contrato configurada en background.js es inválida.',
				});
				return;
			}

			const { contractAddress, abiFragment, functionName, args, value } = request.data;

			if(!contractAddress || !abiFragment || !functionName || !args) {
				console.error(`Background ${ logPrefix }: Error - Faltan datos para la interacción.`, request.data);
				sendResponse({ success: false, error: 'Datos incompletos para la interacción del contrato.' });
				return;
			}

			let activeTabId = null;
			try {
				const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
				if(!tabs || tabs.length === 0 || !tabs[0]?.id) throw new Error('No se encontró pestaña activa válida.');
				activeTabId = tabs[0].id;
				if(!tabs[0].url || (!tabs[0].url.startsWith('http:') && !tabs[0].url.startsWith('https:'))) throw new Error('La pestaña activa no es una página web válida.');

				console.log(`Background ${ logPrefix }: Preparando transacción para ${ functionName }...`);
				const iface = new ethers.Interface([ abiFragment ]);
				const encodedData = iface.encodeFunctionData(functionName, args);
				const txValueWei = ethers.parseEther(value || '0');

				const txParams = {
					from: userAccount,
					to: contractAddress, // Usa la dirección validada
					value: txValueWei > BigInt(0) ? txValueWei.toString() : undefined, // Enviar solo si > 0
					data: encodedData,
				};
				console.log(`Background ${ logPrefix }: Parámetros Tx listos:`, txParams);

				async function sendTransaction_inj(params) {
					if(typeof window.ethereum === 'undefined') throw new Error('MetaMask no encontrado');
					try {
						const txHash = await window.ethereum.request({
							method: 'eth_sendTransaction',
							params: [ params ],
						});
						return { success: true, txHash: txHash };
					} catch(error) {
						throw new Error(error.message || 'Error enviando tx desde script inyectado', { cause: error.code });
					}
				}

				console.log(`Background ${ logPrefix }: Inyectando sendTransaction_inj en Tab ${ activeTabId }...`);
				const execResult = await chrome.scripting.executeScript({
					target: { tabId: activeTabId, frameIds: [ 0 ] },
					world: 'MAIN',
					func: sendTransaction_inj,
					args: [ txParams ],
				});

				if(!execResult || execResult.length === 0 || !execResult[0]) throw new Error('Resultado inválido de executeScript (sendTx).');
				const frameResult = execResult[0];

				if(frameResult.error) throw new Error(`Error en script inyectado (sendTx): ${ frameResult.error.message || JSON.stringify(frameResult.error) }`);

				if(frameResult.result?.success) {
					console.log(`Background ${ logPrefix }: Transacción enviada por script. Hash:`, frameResult.result.txHash);
					sendResponse({ success: true, txHash: frameResult.result.txHash });
				} else {
					let injectedErrorMsg = 'Error desconocido devuelto por script inyectado (sendTx).';
					if(frameResult.result?.message) injectedErrorMsg = frameResult.result.message;
					else if(typeof frameResult.result === 'string') injectedErrorMsg = frameResult.result;
					if(injectedErrorMsg.includes('User denied transaction signature')) injectedErrorMsg = 'Transacción rechazada por el usuario en MetaMask.';
					else if(injectedErrorMsg.includes('insufficient funds')) injectedErrorMsg = 'Fondos insuficientes (detectado por MetaMask).';
					else if(injectedErrorMsg.includes('Invalid \\"to\\" address')) injectedErrorMsg = 'Dirección de contrato inválida (revisa configuración).'; // Error específico
					console.error(`Background ${ logPrefix }: Script inyectado (sendTx) no tuvo éxito: ${ injectedErrorMsg }`);
					throw new Error(injectedErrorMsg);
				}

			} catch(error) {
				console.error(`Background ${ logPrefix }: *** ERROR CAPTURADO manejador executeContractInteractionRequest ***`);
				console.error(`Background ${ logPrefix }: Error Original:`, error);
				const errorMessage = error?.message || 'Error desconocido ejecutando interacción.';
				console.error(`Background ${ logPrefix }: Enviando error al caller: ${ errorMessage }`);
				sendResponse({ success: false, error: `Error ejecutando transacción: ${ errorMessage }` });
			}
		})();
		return true;

	} else if(action === 'connectWalletRequest') {
		(async () => {
			const logPrefix = `[${ action }] `;
			let response;
			try {
				const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
				if(!tabs || tabs.length === 0 || !tabs[0]?.id) throw new Error('No se encontró pestaña activa válida.');
				const activeTab = tabs[0];
				if(!activeTab.url || (!activeTab.url.startsWith('http:') && !activeTab.url.startsWith('https:'))) throw new Error('Pestaña activa no válida.');
				response = await injectAndConnect(activeTab.id);
			} catch(error) {
				response = { success: false, error: error.message || 'Error en conexión.' };
			}
			sendResponse(response);
		})();
		return true;

	} else if(action === 'initiateVerification') {
		const logPrefix = `[${ action }] `;
		const now = Date.now();
		const lastRequestTime = lastRequestTimestamps[request.tweetId] || 0;
		if(now - lastRequestTime < DEBOUNCE_DELAY_MS) {
			sendResponse({ success: false, error: 'Debounced.' });
			return false;
		}
		lastRequestTimestamps[request.tweetId] = now;
		if(pendingAction !== null) console.warn(`Background ${ logPrefix }: Sobrescribiendo pendingAction.`);
		try {
			pendingAction = { action: 'verify', tweetId: request.tweetId, tweetContent: request.tweetContent };
		} catch(e) {
			sendResponse({ success: false, message: 'Error interno (BG): setear acción.' });
			return false;
		}
		(async () => {
			let success = false;
			let message = 'Error iniciando.';
			try {
				if(chrome.action?.openPopup) {
					await chrome.action.openPopup();
					success = true;
					message = 'Iniciado, popup abierto.';
				} else {
					message = 'No se pudo abrir popup (API no disp.).';
				}
			} catch(err) {
				message = `Error abriendo popup: ${ err.message || '?' }`;
			} finally {
				try {
					sendResponse({ success, message });
				} catch(e) {
					console.error(`Error sendResponse:`, e);
				}
			}
		})();
		return true;

	} else if(action === 'getPendingAction') {
		const actionToSend = pendingAction;
		pendingAction = null;
		sendResponse(actionToSend);
		return false;
	} else if(action === 'contentScriptLoaded') {
		sendResponse({ status: 'acknowledged', script: 'content.js' });
		return false;
	} else if(action === 'checkTweetInContract') {
		const logPrefix = `[${ action }] `;
		console.log(`Background ${ logPrefix }: Checking if tweet ${ request.tweetId } is in contract`);

		(async () => {
			let response = { exists: false };

			try {
				if(!userAccount) {
					console.log(`Background ${ logPrefix }: No account connected, returning false`);
					sendResponse(response);
					return;
				}

				// Check in local cache first
				try {
					const cachedData = await chrome.storage.local.get([ 'verifiedTweets' ]);
					if(cachedData.verifiedTweets && cachedData.verifiedTweets[request.tweetId]) {
						console.log(`Background ${ logPrefix }: Found tweet in cache`);
						response.exists = true;
						response.data = cachedData.verifiedTweets[request.tweetId];
						sendResponse(response);
						return;
					}
				} catch(cacheError) {
					console.warn(`Background ${ logPrefix }: Error checking cache:`, cacheError);
				}

				// If not in cache, check contract (read-only call)
				const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
				if(!tabs || tabs.length === 0 || !tabs[0]?.id) {
					console.log(`Background ${ logPrefix }: No active tab found`);
					sendResponse(response);
					return;
				}

				const activeTabId = tabs[0].id;

				async function checkTweetInfo_inj(tweetId, contractAddress, abiFragment) {
					if(typeof window.ethereum === 'undefined') return { exists: false };
					try {
						const provider = new ethers.BrowserProvider(window.ethereum);
						const contract = new ethers.Contract(
							contractAddress,
							[ abiFragment ],
							provider,
						);

						try {
							const result = await contract.getTweetInfo(tweetId);
							// If reporter address is not zero address, tweet exists in contract
							const exists = result.reporter !== ethers.ZeroAddress;
							return {
								exists,
								data: exists ? {
									reporter: result.reporter,
									status: Number(result.status),
									resolved: result.resolved,
								} : null,
							};
						} catch(e) {
							// If function call fails, tweet does not exist
							return { exists: false };
						}
					} catch(error) {
						console.error('Error in injected script:', error);
						return { exists: false };
					}
				}

				// Find getTweetInfo ABI fragment
				const getTweetInfoAbi = VeritasXAbi.find(item =>
					item.name === 'getTweetInfo' && item.type === 'function',
				);

				if(!getTweetInfoAbi) {
					console.error(`Background ${ logPrefix }: getTweetInfo ABI not found`);
					sendResponse(response);
					return;
				}

				console.log(`Background ${ logPrefix }: Injecting script to check tweet`);
				const execResult = await chrome.scripting.executeScript({
					target: { tabId: activeTabId, frameIds: [ 0 ] },
					world: 'MAIN',
					func: checkTweetInfo_inj,
					args: [ request.tweetId, CONTRACT_ADDRESS, getTweetInfoAbi ],
				});

				if(!execResult || execResult.length === 0 || !execResult[0]) {
					console.log(`Background ${ logPrefix }: Invalid script execution result`);
					sendResponse(response);
					return;
				}

				const frameResult = execResult[0];
				if(frameResult.error) {
					console.error(`Background ${ logPrefix }: Script error:`, frameResult.error);
					sendResponse(response);
					return;
				}

				response = frameResult.result || { exists: false };

				// Cache the result if tweet exists
				if(response.exists && response.data) {
					try {
						const cachedData = await chrome.storage.local.get([ 'verifiedTweets' ]);
						const verifiedTweets = cachedData.verifiedTweets || {};
						verifiedTweets[request.tweetId] = response.data;
						await chrome.storage.local.set({ verifiedTweets });
					} catch(cacheError) {
						console.warn(`Background ${ logPrefix }: Error caching result:`, cacheError);
					}
				}

				console.log(`Background ${ logPrefix }: Sending response:`, response);
				sendResponse(response);

			} catch(error) {
				console.error(`Background ${ logPrefix }: Error:`, error);
				sendResponse(response);
			}
		})();

		return true;
	} else if(action === 'getStatus') {
		sendResponse({ status: 'active', version: 'Workaround v1 Clean' });
		return false;
	} else {
		console.warn(`Background: Acción NO MANEJADA: "${ action }"`);
		return false;
	}
});

self.addEventListener('unhandledrejection', event => {
	console.error('Background: ***** ¡PROMESA RECHAZADA NO MANEJADA! *****', event.reason);
});
self.addEventListener('error', event => {
	console.error('Background: ***** ¡ERROR NO CAPTURADO! *****', event.message, event.filename, event.lineno, event.error);
});
chrome.runtime.onInstalled.addListener(() => {
	console.log('Background: VeritasX Extension instalada/actualizada.');
	userAccount = null;
	chrome.storage.local.remove('userAccount');
});

(async () => {
	try {
		const result = await chrome.storage.local.get([ 'userAccount' ]);
		if(result.userAccount) {
			userAccount = result.userAccount;
			console.log('Background: Cuenta recuperada:', userAccount);
		}
	} catch(e) {
		console.warn('Background: Error recuperando cuenta:', e);
	}
})();

console.log('Background: SW cargado (Workaround v1 Clean), listeners adjuntos.');
