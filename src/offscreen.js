// Contenido completo para src/offscreen.js (sin comentarios)

import { ethers } from 'ethers';
import { VeritasXAbi } from './VeritasX.abi.js';
import { hashTweetContent } from './helpers.js';

console.log('Offscreen Script: Script cargado. Timestamp:', Date.now());
console.log('Offscreen Script: Verificando ethers y ABI...', typeof ethers, typeof VeritasXAbi);

const CONTRACT_ADDRESS = '0x2521aac9eB2831A10C28034d69B7488CFD4d8ce7';
const MANTLE_SEPOLIA_CHAIN_ID_HEX = '0x138b';
const MANTLE_SEPOLIA_CHAIN_ID_DEC = 5003;

let provider = null;
let signer = null;
let contract = null;
let initializationPromise = null;

async function initializeEthersIfNotReady(logPrefix = '') {
	console.log(`Offscreen Script ${ logPrefix }: Llamada a initializeEthersIfNotReady.`);
	if(provider && signer && contract) {
		console.log(`Offscreen Script ${ logPrefix }: Ethers ya inicializado.`);
		try {
			const currentSigner = await provider.getSigner();
			const currentAddr = await currentSigner.getAddress();
			const network = await provider.getNetwork();
			console.log(`Offscreen Script ${ logPrefix }: Verificación rápida - Signer: ${ currentAddr }, Network: ${ network.chainId }`);
			if(network.chainId !== BigInt(MANTLE_SEPOLIA_CHAIN_ID_DEC)) {
				throw new Error(`Red incorrecta detectada (${ network.chainId }) en instancia existente.`);
			}
			contract = new ethers.Contract(CONTRACT_ADDRESS, VeritasXAbi, currentSigner);
		} catch(validationError) {
			console.warn(`Offscreen Script ${ logPrefix }: Falló la validación de la instancia existente, reinicializando... Error: ${ validationError.message }`);
			provider = null;
			signer = null;
			contract = null;
			if(initializationPromise) {
				initializationPromise = null;
			}
		}
		if(provider && signer && contract) return { provider, signer, contract };
	}

	if(initializationPromise) {
		console.log(`Offscreen Script ${ logPrefix }: Inicialización ya en progreso, esperando promesa...`);
		return await initializationPromise;
	}

	console.log(`Offscreen Script ${ logPrefix }: Iniciando nueva inicialización de Ethers...`);
	initializationPromise = (async () => {
		try {
			console.log(`Offscreen Script ${ logPrefix }: Verificando window.ethereum...`, typeof window.ethereum);
			if(typeof window.ethereum === 'undefined') {
				console.error(`Offscreen Script ${ logPrefix }: ERROR FATAL - window.ethereum es undefined en contexto offscreen.`);
				throw new Error('MetaMask (window.ethereum) NO ACCESIBLE en contexto offscreen.');
			}

			console.log(`Offscreen Script ${ logPrefix }: Creando ethers.BrowserProvider...`);
			provider = new ethers.BrowserProvider(window.ethereum, 'any');
			console.log(`Offscreen Script ${ logPrefix }: BrowserProvider creado.`);

			console.log(`Offscreen Script ${ logPrefix }: Obteniendo cuentas con eth_accounts...`);
			const accounts = await provider.send('eth_accounts', []);
			if(!accounts || accounts.length === 0) {
				console.warn(`Offscreen Script ${ logPrefix }: No se encontraron cuentas con eth_accounts. Wallet bloqueada o desconectada.`);
				throw new Error('Wallet desconectada o bloqueada.');
			}
			const activeAccount = accounts[0];
			console.log(`Offscreen Script ${ logPrefix }: Cuenta encontrada: ${ activeAccount }`);

			console.log(`Offscreen Script ${ logPrefix }: Obteniendo signer para ${ activeAccount }...`);
			signer = await provider.getSigner(activeAccount);
			const signerAddr = await signer.getAddress();
			console.log(`Offscreen Script ${ logPrefix }: Signer obtenido: ${ signerAddr }`);

			console.log(`Offscreen Script ${ logPrefix }: Verificando red...`);
			const network = await provider.getNetwork();
			console.log(`Offscreen Script ${ logPrefix }: Network detectada: ID=${ network.chainId }, Nombre=${ network.name }`);

			if(network.chainId !== BigInt(MANTLE_SEPOLIA_CHAIN_ID_DEC)) {
				console.error(`Offscreen Script ${ logPrefix }: ERROR - Red Incorrecta detectada: ${ network.chainId }`);
				throw new Error(`Red Incorrecta. Cambia a Mantle Sepolia (ID: ${ MANTLE_SEPOLIA_CHAIN_ID_DEC }).`);
			}
			console.log(`Offscreen Script ${ logPrefix }: Red correcta (Mantle Sepolia).`);

			console.log(`Offscreen Script ${ logPrefix }: Creando instancia del contrato en ${ CONTRACT_ADDRESS }...`);
			contract = new ethers.Contract(CONTRACT_ADDRESS, VeritasXAbi, signer);
			console.log(`Offscreen Script ${ logPrefix }: Contrato instanciado.`);

			console.log(`Offscreen Script ${ logPrefix }: Inicialización de Ethers EXITOSA.`);
			return { provider, signer, contract };

		} catch(error) {
			console.error(`Offscreen Script ${ logPrefix }: ERROR durante la inicialización de Ethers:`, error);
			provider = null;
			signer = null;
			contract = null;
			throw error;
		} finally {
			console.log(`Offscreen Script ${ logPrefix }: Limpiando promesa de inicialización.`);
			initializationPromise = null;
		}
	})();

	return await initializationPromise;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const action = message?.action;
	const logPrefix = `[${ action || 'NoAction' }] `;
	console.log(`Offscreen Script ${ logPrefix }: Mensaje Recibido. Acción: ${ action }`, '| Data:', message?.data, '| Sender:', sender.id === chrome.runtime.id ? 'Background' : sender);

	if(!action) {
		console.warn(`Offscreen Script ${ logPrefix }: Mensaje recibido sin acción.`);
		sendResponse({ success: false, error: 'Acción no especificada en el mensaje.' });
		return false;
	}

	if([ 'submitReportRequest', 'submitVoteRequest', 'claimRewardRequest' ].includes(action)) {
		console.log(`Offscreen Script ${ logPrefix }: Manejando acción de contrato...`);
		(async () => {
			let responsePayload;
			try {
				console.log(`Offscreen Script ${ logPrefix }: 1. Asegurando Ethers...`);
				const { contract: readyContract, signer: readySigner } = await initializeEthersIfNotReady(logPrefix);
				console.log(`Offscreen Script ${ logPrefix }: 2. Ethers listo. Signer: ${ await readySigner.getAddress() }`);

				let tx, receipt;
				const txData = message.data;

				if(action === 'submitReportRequest') {
					const { tweetId, tweetContent, stakeAmount } = txData;
					console.log(`Offscreen Script ${ logPrefix }: Validando datos: ID=${ tweetId }, ContentPresent=${ !!tweetContent }, Stake=${ stakeAmount }`);
					if(!tweetId || !tweetContent || !stakeAmount) throw new Error('Datos incompletos para reportTweet.');

					console.log(`Offscreen Script ${ logPrefix }: Hasheando contenido...`);
					const contentHash = hashTweetContent(tweetContent);
					if(!contentHash) throw new Error('Fallo al hashear contenido del tweet.');
					console.log(`Offscreen Script ${ logPrefix }: Hash: ${ contentHash }`);

					console.log(`Offscreen Script ${ logPrefix }: Parseando stake: ${ stakeAmount } MNT`);
					const stakeAmountWei = ethers.parseEther(stakeAmount.toString());
					console.log(`Offscreen Script ${ logPrefix }: Stake en Wei: ${ stakeAmountWei }`);

					console.log(`Offscreen Script ${ logPrefix }: 3. Llamando a readyContract.reportTweet(${ tweetId }, ${ contentHash }) con valor ${ stakeAmountWei }...`);
					tx = await readyContract.reportTweet(tweetId, contentHash, { value: stakeAmountWei });

				} else if(action === 'submitVoteRequest') {
					const { tweetId, voteStatus, stakeAmount } = txData;
					console.log(`Offscreen Script ${ logPrefix }: Validando datos: ID=${ tweetId }, Vote=${ voteStatus }, Stake=${ stakeAmount }`);
					if(!tweetId || !voteStatus || !stakeAmount) throw new Error('Datos incompletos para stakeAndVote.');
					const voteStatusInt = parseInt(voteStatus, 10);
					if(isNaN(voteStatusInt) || voteStatusInt <= 0 || voteStatusInt > 4) throw new Error('Estado de voto inválido.');
					const stakeAmountWei = ethers.parseEther(stakeAmount.toString());
					console.log(`Offscreen Script ${ logPrefix }: 3. Llamando a readyContract.stakeAndVote(${ tweetId }, ${ voteStatusInt }) con valor ${ stakeAmountWei }...`);
					tx = await readyContract.stakeAndVote(tweetId, voteStatusInt, { value: stakeAmountWei });

				} else if(action === 'claimRewardRequest') {
					const { tweetId } = txData;
					console.log(`Offscreen Script ${ logPrefix }: Validando datos: ID=${ tweetId }`);
					if(!tweetId) throw new Error('ID de Tweet requerido para claimReward.');
					console.log(`Offscreen Script ${ logPrefix }: 3. Llamando a readyContract.claimReward(${ tweetId })...`);
					tx = await readyContract.claimReward(tweetId);
				} else {
					throw new Error(`Acción de contrato desconocida recibida: ${ action }`);
				}

				console.log(`Offscreen Script ${ logPrefix }: 4. Tx enviada! Hash: ${ tx.hash }. Esperando confirmación...`);
				receipt = await tx.wait(1);
				console.log(`Offscreen Script ${ logPrefix }: 5. Tx confirmada! Hash: ${ receipt.hash }, Estado: ${ receipt.status === 1 ? 'Éxito' : 'Fallo' }, Gas: ${ receipt.gasUsed }`);

				if(receipt.status !== 1) {
					console.error(`Offscreen Script ${ logPrefix }: Transacción falló en blockchain! Recibo:`, receipt);
					throw new Error(`La transacción falló en la blockchain (status 0). Hash: ${ receipt.hash }`);
				}

				responsePayload = { success: true, txHash: receipt.hash };

			} catch(error) {
				console.error(`Offscreen Script ${ logPrefix }: ERROR CAPTURADO en manejador async:`, error);
				console.error(`Offscreen Script ${ logPrefix }: Error Name: ${ error?.name }, Message: ${ error?.message }, Code: ${ error?.code }, Reason: ${ error?.reason }`);

				let detailedErrorMessage = 'Error desconocido';
				if(error.reason) {
					detailedErrorMessage = error.reason;
				} else if(error.message) {
					detailedErrorMessage = error.message;
				} else if(typeof error === 'string') {
					detailedErrorMessage = error;
				}

				if(detailedErrorMessage.includes('user rejected action') || error.code === 4001 || error.code === 'ACTION_REJECTED') {
					detailedErrorMessage = 'Transacción rechazada por el usuario en MetaMask.';
				} else if(detailedErrorMessage.includes('insufficient funds')) {
					detailedErrorMessage = 'Fondos insuficientes de MNT para la transacción.';
				} else if(detailedErrorMessage.includes('already reported')) {
					detailedErrorMessage = 'Este Tweet ya ha sido reportado.';
				} else if(detailedErrorMessage.includes('has already voted')) {
					detailedErrorMessage = 'Ya has votado/staked en este Tweet.';
				} else if(detailedErrorMessage.includes('Tweet not resolved yet')) {
					detailedErrorMessage = 'El Tweet aún no ha sido resuelto.';
				} else if(detailedErrorMessage.includes('No reward available')) {
					detailedErrorMessage = 'No hay recompensa disponible o ya fue reclamada.';
				} else if(detailedErrorMessage.includes('insufficient stake')) {
					detailedErrorMessage = 'El monto del stake es menor al mínimo requerido.';
				} else if(error instanceof Error && error.message.includes('Wallet desconectada o bloqueada')) {
					detailedErrorMessage = error.message;
				} else if(error instanceof Error && error.message.includes('Red Incorrecta')) {
					detailedErrorMessage = error.message;
				} else if(error instanceof Error && error.message.includes('MetaMask (window.ethereum) NO ACCESIBLE')) {
					detailedErrorMessage = error.message; // Propagar error fatal de acceso a ethereum
				}

				console.error(`Offscreen Script ${ logPrefix }: Mensaje de error detallado para respuesta: ${ detailedErrorMessage }`);
				responsePayload = { success: false, error: detailedErrorMessage };
			}

			console.log(`Offscreen Script ${ logPrefix }: 6. Enviando respuesta al background:`, responsePayload);
			sendResponse(responsePayload);
		})();

		console.log(`Offscreen Script ${ logPrefix }: Retornando true (async) para manejador ${ action }.`);
		return true;

	} else {
		console.warn(`Offscreen Script ${ logPrefix }: Acción no manejada recibida: ${ action }`);
		sendResponse({ success: false, error: `Acción '${ action }' no reconocida por el script offscreen.` });
		return false;
	}
});

console.log('Offscreen Script: Listener onMessage adjuntado.');
