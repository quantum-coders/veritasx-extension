// Contenido completo para src/background.js (Workaround v1 - Sin Offscreen)
console.log("VeritasX Background SW Loading - Workaround v1");

import { ethers } from 'ethers'; // Necesitamos ethers aquí
// Asume que tienes el ABI disponible, impórtalo o defínelo aquí
import { VeritasXAbi } from './VeritasX.abi.js';

let pendingAction = null;
let userAccount = null; // Guardaremos la cuenta conectada aquí
let lastRequestTimestamps = {};
const DEBOUNCE_DELAY_MS = 500;
const CONTRACT_ADDRESS = '0x2521aac9eB2831A10C28034d69B7488CFD4d8ce7'; // Dirección del contrato

// --- injectAndConnect (SIN CAMBIOS IMPORTANTES, pero ahora guarda userAccount) ---
async function injectAndConnect(tabId, attempt = 1) {
    const logPrefix = `[injectConnect-${tabId}-${attempt}] `;
    console.log(`Background ${logPrefix}: Ejecutando injectAndConnect...`);
    try {
        function pageScript_inj() {
             // ... (código interno de pageScript_inj sin cambios) ...
             console.log('VeritasX Injected Script: pageScript_inj() executing...');
             return new Promise((resolve, reject) => {
               setTimeout(() => {
                 if (typeof window.ethereum === 'undefined' || !window.ethereum.isMetaMask) {
                   const errorMsg = 'MetaMask (window.ethereum) no encontrado. Desbloquea/Permisos y Recarga.';
                   return reject(new Error(errorMsg));
                 }
                 window.ethereum.request({ method: 'eth_requestAccounts' })
                   .then(accounts => {
                     if (accounts && accounts.length > 0) {
                       resolve({ success: true, accounts: accounts });
                     } else {
                       reject(new Error('No se concedió permiso para ninguna cuenta.'));
                     }
                   })
                   .catch(err => {
                     let errorMsg = `Error solicitar cuenta: ${err.message || '?'}`;
                     if (err.code === 4001) { errorMsg = 'Conexión rechazada por el usuario.'; }
                     else if (err.code === -32002) { errorMsg = 'Solicitud pendiente. Revisa MetaMask.'; }
                     reject(new Error(errorMsg));
                   });
               }, 150);
             });
        }
        const executionResult = await chrome.scripting.executeScript({
            target: { tabId: tabId, frameIds: [0] },
            world: 'MAIN',
            func: pageScript_inj
        });
        // ... (manejo de resultado sin cambios) ...
        if (!executionResult || executionResult.length === 0 || !executionResult[0]) {
            throw new Error("No se recibió resultado válido de inyección.");
        }
        const frameResult = executionResult[0];
         if (frameResult.error) {
             throw new Error(`Error inyección: ${frameResult.error.message || JSON.stringify(frameResult.error)}`);
        }
        if (frameResult.result?.success) {
            // --- GUARDAR CUENTA ---
            if (frameResult.result.accounts && frameResult.result.accounts.length > 0) {
                userAccount = frameResult.result.accounts[0]; // Guardar la cuenta conectada
                console.log(`Background ${logPrefix}: Cuenta conectada guardada: ${userAccount}`);
                 try { // Guardar también en storage para persistencia
                     await chrome.storage.local.set({ userAccount: userAccount });
                 } catch(e){ console.warn("No se pudo guardar cuenta en storage", e); }
            }
            return { success: true, accounts: frameResult.result.accounts };
        } else {
             let detail = 'Resultado inesperado o promesa rechazada.';
              if (frameResult.result && typeof frameResult.result.message === 'string') {
                 detail = frameResult.result.message;
             } else if (frameResult.result === null) {
                 detail = 'Script inyectado devolvió null.';
             }
             throw new Error(detail);
        }
    } catch (error) {
        console.error(`Background ${logPrefix}: Error capturado en injectAndConnect:`, error);
        // ... (manejo de errores específicos sin cambios) ...
         let specificError = error.message || "Error desconocido inject/connect";
         // ... (resto de los if para errores específicos) ...
         if (specificError.includes("MetaMask") || specificError.includes("Conexión rechazada") || specificError.includes("Solicitud pendiente") || specificError.includes("No se concedió permiso")) {
            // Mantener el mensaje específico
         }
        throw new Error(specificError);
    }
}

// --- Listener onMessage MODIFICADO ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request?.action;
    const logPrefix = `[${action || 'NoAction'}] `;
    console.log(`Background ${logPrefix}: Mensaje Recibido. Acción: ${action}`, "| Origen:", sender.tab ? `Tab ${sender.tab.id}` : "Popup/Other");

    if (!action) return false;

    // --- NUEVO MANEJADOR para interacciones de contrato ---
    if (action === 'executeContractInteractionRequest') {
        console.log(`Background ${logPrefix}: >>> INICIANDO EJECUCIÓN VIA INYECCIÓN >>>`, request.data);
        (async () => {
            if (!userAccount) {
                console.error(`Background ${logPrefix}: Error - No hay cuenta de usuario conectada.`);
                sendResponse({ success: false, error: "Wallet no conectada en el background." });
                return;
            }

            const { contractAddress, abiFragment, functionName, args, value } = request.data;

            if (!contractAddress || !abiFragment || !functionName || !args) {
                 console.error(`Background ${logPrefix}: Error - Faltan datos para la interacción.`, request.data);
                 sendResponse({ success: false, error: "Datos incompletos para la interacción del contrato." });
                 return;
            }

            let activeTabId = null;
            try {
                 // Obtener pestaña activa
                 const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                 if (!tabs || tabs.length === 0 || !tabs[0].id) {
                     throw new Error("No se encontró pestaña activa válida.");
                 }
                 activeTabId = tabs[0].id;
                 if (!tabs[0].url || (!tabs[0].url.startsWith('http:') && !tabs[0].url.startsWith('https:'))){
                    throw new Error("La pestaña activa no es una página web válida (http/https).");
                 }

                 console.log(`Background ${logPrefix}: Preparando transacción para ${functionName}...`);

                 // Crear interfaz y codificar datos
                 const iface = new ethers.Interface([abiFragment]); // Usar solo el fragmento necesario
                 const encodedData = iface.encodeFunctionData(functionName, args);
                 console.log(`Background ${logPrefix}: Datos codificados: ${encodedData}`);

                 // Preparar parámetros de transacción
                 const txParams = {
                     from: userAccount,
                     to: contractAddress,
                     value: ethers.parseEther(value || '0').toString(), // Convertir MNT a Wei String
                     data: encodedData,
                     // Gas limit/price podrían estimarse aquí si es necesario, pero MetaMask lo hará
                 };
                 console.log(`Background ${logPrefix}: Parámetros Tx listos:`, txParams);

                 // Función a inyectar
                 async function sendTransaction_inj(params) {
                     console.log("Injected Script: sendTransaction_inj ejecutando con params:", params);
                     if (typeof window.ethereum === 'undefined') {
                         throw new Error('MetaMask no encontrado en sendTransaction_inj');
                     }
                     try {
                         console.log("Injected Script: Enviando eth_sendTransaction...");
                         const txHash = await window.ethereum.request({
                             method: 'eth_sendTransaction',
                             params: [params],
                         });
                         console.log("Injected Script: eth_sendTransaction devolvió hash:", txHash);
                         return { success: true, txHash: txHash }; // Devolver éxito y hash
                     } catch (error) {
                         console.error("Injected Script: Error en eth_sendTransaction:", error);
                         // Devolver un objeto de error serializable
                         throw new Error(error.message || "Error desconocido al enviar transacción desde script inyectado", { cause: error.code });
                     }
                 }

                 console.log(`Background ${logPrefix}: Inyectando sendTransaction_inj en Tab ${activeTabId}...`);
                 const execResult = await chrome.scripting.executeScript({
                     target: { tabId: activeTabId, frameIds: [0] },
                     world: 'MAIN',
                     func: sendTransaction_inj,
                     args: [txParams] // Pasar parámetros a la función inyectada
                 });

                 console.log(`Background ${logPrefix}: Resultado crudo executeScript (sendTx):`, JSON.stringify(execResult));

                 if (!execResult || execResult.length === 0 || !execResult[0]) {
                     throw new Error("Resultado inválido de executeScript (sendTx).");
                 }
                 const frameResult = execResult[0];
                 console.log(`Background ${logPrefix}: Resultado frame[0] (sendTx):`, JSON.stringify(frameResult));

                 if (frameResult.error) { // Error durante la ejecución del script inyectado
                     throw new Error(`Error en script inyectado (sendTx): ${frameResult.error.message || JSON.stringify(frameResult.error)}`);
                 }

                 if (frameResult.result?.success) {
                     console.log(`Background ${logPrefix}: Transacción enviada exitosamente por script inyectado. Hash:`, frameResult.result.txHash);
                     sendResponse({ success: true, txHash: frameResult.result.txHash });
                 } else {
                      // Si la promesa inyectada fue rechazada, el error estará en frameResult.result.message (si se lanzó Error)
                     let injectedErrorMsg = "Error desconocido devuelto por script inyectado (sendTx).";
                     if (frameResult.result?.message) {
                        injectedErrorMsg = frameResult.result.message;
                     } else if (typeof frameResult.result === 'string'){ // A veces puede devolver solo string de error
                        injectedErrorMsg = frameResult.result;
                     }
                      // Simplificar errores comunes de MetaMask desde la inyección
                     if (injectedErrorMsg.includes('User denied transaction signature')) {
                         injectedErrorMsg = 'Transacción rechazada por el usuario en MetaMask.';
                     } else if (injectedErrorMsg.includes('insufficient funds')) {
                          injectedErrorMsg = 'Fondos insuficientes (detectado por MetaMask).';
                     }
                     console.error(`Background ${logPrefix}: Script inyectado (sendTx) no tuvo éxito o lanzó error: ${injectedErrorMsg}`);
                     throw new Error(injectedErrorMsg);
                 }

            } catch (error) {
                console.error(`Background ${logPrefix}: *** ERROR CAPTURADO en manejador executeContractInteractionRequest ***`);
                console.error(`Background ${logPrefix}: Error Original:`, error);
                const errorMessage = error?.message || "Error desconocido ejecutando interacción.";
                console.error(`Background ${logPrefix}: Enviando error al caller: ${errorMessage}`);
                sendResponse({ success: false, error: `Error ejecutando transacción: ${errorMessage}` });
            }
        })();
        return true; // Es asíncrono

    // --- OTROS MANEJADORES (connectWalletRequest, initiateVerification, etc.) ---
    // Deben permanecer como en v11/v12, asegurándose de que connectWalletRequest guarde userAccount
     } else if (action === 'connectWalletRequest') {
        console.log(`Background ${logPrefix}: Manejando Acción: connectWalletRequest`);
         (async () => { // Envolver en async IIFE para usar await y try/catch
            let response;
            try {
                 const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                 if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
                     throw new Error("No se encontró pestaña activa válida.");
                 }
                 const activeTab = tabs[0];
                 if (!activeTab.url || (!activeTab.url.startsWith('http:') && !activeTab.url.startsWith('https:'))) {
                     throw new Error("Pestaña activa no válida (interna/local/vacía?).");
                 }
                 console.log(`Background ${logPrefix}: Pestaña válida (${activeTab.id}), llamando injectAndConnect...`);
                 response = await injectAndConnect(activeTab.id); // injectAndConnect ahora guarda userAccount en éxito
                 console.log(`Background ${logPrefix}: injectAndConnect ÉXITO. Respuesta:`, response);
            } catch (error) {
                 console.error(`Background ${logPrefix}: injectAndConnect FALLÓ. Error:`, error);
                 response = { success: false, error: error.message || "Error en conexión." };
            }
            sendResponse(response); // Enviar respuesta final
        })();
        return true; // Indicar respuesta asíncrona

    } else if (action === "initiateVerification") {
        console.log(`Background ${logPrefix}: Manejando Acción: initiateVerification ID: ${request.tweetId}`);
        const now = Date.now();
        const lastRequestTime = lastRequestTimestamps[request.tweetId] || 0;
        if (now - lastRequestTime < DEBOUNCE_DELAY_MS) {
            console.warn(`Background ${logPrefix}: Debouncing.`);
            sendResponse({ success: false, error: "Debounced. Espera." });
            return false;
        }
        lastRequestTimestamps[request.tweetId] = now;
        if (pendingAction !== null) console.warn(`Background ${logPrefix}: Sobrescribiendo pendingAction.`);
        try {
            pendingAction = { action: 'verify', tweetId: request.tweetId, tweetContent: request.tweetContent };
            console.log(`Background ${logPrefix}: pendingAction seteado:`, JSON.stringify(pendingAction));
        } catch (e) {
             console.error(`Background ${logPrefix}: CRÍTICO: Fallo setear pendingAction!`, e);
             sendResponse({ success: false, message: "Error interno (BG): setear acción." }); return false;
        }
        (async () => {
             console.log(`Background ${logPrefix}: IIFE para openPopup.`);
             let success = false; let message = "Error iniciando.";
             try {
                 if (chrome.action?.openPopup) {
                      await chrome.action.openPopup(); success = true; message = "Iniciado, popup abierto.";
                 } else { message = "No se pudo abrir popup (API no disp.)."; }
             } catch (err) { message = `Error abriendo popup: ${err.message || '?'}`; }
             finally {
                  console.log(`Background ${logPrefix}: Enviando respuesta:`, { success, message });
                  try { sendResponse({ success, message }); } catch(e){ console.error(`Error sendResponse:`,e); }
             }
        })();
        return true;

    } else if (action === "getPendingAction") {
        console.log(`Background ${logPrefix}: Manejando Acción: getPendingAction`);
        const actionToSend = pendingAction;
        pendingAction = null;
        sendResponse(actionToSend);
        return false;

    } else if (action === "contentScriptLoaded") {
         console.log(`Background ${logPrefix}: Action: contentScriptLoaded`);
         sendResponse({ status: "acknowledged", script: "content.js" }); return false;
    } else if (action === "getStatus") {
         console.log(`Background ${logPrefix}: Action: getStatus`);
         sendResponse({ status: "active", version: "Workaround v1" }); return false;
    } else {
        console.warn(`Background: Acción NO MANEJADA: "${action}"`);
        return false;
    }
});

// --- Listeners globales (sin cambios) ---
self.addEventListener('unhandledrejection', event => {
    console.error('Background: ***** ¡PROMESA RECHAZADA NO MANEJADA! *****', event.reason);
});
self.addEventListener('error', event => {
     console.error('Background: ***** ¡ERROR NO CAPTURADO! *****', event.message, event.filename, event.lineno, event.error);
});
chrome.runtime.onInstalled.addListener(() => {
    console.log("Background: VeritasX Extension instalada/actualizada.");
    userAccount = null; // Limpiar cuenta al reinstalar/actualizar
    chrome.storage.local.remove('userAccount');
});

// --- Recuperar cuenta al iniciar ---
(async () => {
    try {
        const result = await chrome.storage.local.get(['userAccount']);
        if (result.userAccount) {
            userAccount = result.userAccount;
            console.log("Background: Cuenta de usuario recuperada al iniciar:", userAccount);
        } else {
             console.log("Background: No hay cuenta guardada al iniciar.");
        }
    } catch(e) {
        console.warn("Background: Error recuperando cuenta al iniciar:", e);
    }
})();


console.log("Background: SW cargado (Workaround v1), listeners adjuntos.");
