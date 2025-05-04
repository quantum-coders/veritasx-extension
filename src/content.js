console.log('VeritasX Content Script Loading - v5 (Content Reading)');

console.log('Initial Check:', typeof chrome, typeof chrome?.runtime, typeof chrome?.runtime?.sendMessage);

function initializeVeritasXContentScript() {
	if(!document.body) {
		setTimeout(initializeVeritasXContentScript, 500);
		return;
	}
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if(mutation.addedNodes.length) {
				findAndProcessTweets(mutation.target);
			}
		});
	});
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
	findAndProcessTweets(document.body);
}

function findAndProcessTweets(targetNode) {
	if(!targetNode || typeof targetNode.querySelectorAll !== 'function') {
		return;
	}
	try {
		const tweets = targetNode.querySelectorAll('article[data-testid="tweet"]');
		tweets.forEach((tweet) => {
			addVerificationButton(tweet);
		});
	} catch(error) {
		console.error('VeritasX Content Script: Error finding tweets:', error);
	}
}

let processedTweetElements = new WeakSet();
let debounceTimeouts = new WeakMap();

function addVerificationButton(tweetElement) {
	if(!tweetElement || processedTweetElements.has(tweetElement)) {
		return;
	}

	try {
		const actionsBar = tweetElement.querySelector(':scope > div > div > div:nth-child(2) > div[role="group"]');
		const fallbackActionBar = !actionsBar ? tweetElement.querySelector('[role="group"]') : null;
		const finalActionsBar = actionsBar || fallbackActionBar;

		if(!finalActionsBar || finalActionsBar.querySelector('.veritasx-verify-btn')) {
			processedTweetElements.add(tweetElement);
			return;
		}

		processedTweetElements.add(tweetElement);

		// Clase base en el article, principalmente para posicionamiento relativo
		tweetElement.classList.add('veritasx-tweet-container');
		// La clase para el borde/glow ahora irá en el hijo
		const firstDivChild = tweetElement.querySelector(':scope > div');
		if(firstDivChild) {
			firstDivChild.classList.add('veritasx-pulsing-inner-border');
		} else {
			// Si no hay div hijo directo, no podemos aplicar el estilo interno
			console.warn('VeritasX: No firstDivChild found for styling border.');
			// Podríamos volver a aplicar al article como fallback, pero es probable que falle igual
			tweetElement.classList.add('veritasx-pulsing-direct-border-card'); // Fallback
		}

		// Inyectar estilos si no existen
		if(!document.getElementById('veritasx-inner-border-styles')) {
			const styleEl = document.createElement('style');
			styleEl.id = 'veritasx-inner-border-styles';
			styleEl.textContent = `
                /* --- Estilos Botón Verify (Sin Cambios) --- */
                .veritasx-btn-content { display: flex; align-items: center; position: relative; z-index: 2; transition: transform 0.2s ease; }
                .veritasx-verify-btn { position: relative; transition: all 0.3s ease; filter: brightness(1.2); }
                .veritasx-verify-btn:hover .veritasx-btn-content { transform: scale(1.15); filter: drop-shadow(0 0 5px #00DDFF); }
                .veritasx-pulse-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; border-radius: 50%; background: rgba(0, 220, 255, 0); opacity: 0; z-index: 1; animation: veritasx-always-pulse 1.8s ease-out infinite; }
                .veritasx-verify-btn[data-verified="true"] .veritasx-pulse-ring { animation: none; opacity: 0; }
                @keyframes veritasx-always-pulse { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; background: rgba(0, 220, 255, 0.4); } 70% { transform: translate(-50%, -50%) scale(1.9); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1.9); opacity: 0; } }
                @keyframes veritasx-click-ripple { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(20); opacity: 0; } }
                .veritasx-click-ripple { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); width: 5px; height: 5px; background: rgba(0, 220, 255, 0.8); border-radius: 50%; z-index: 1; pointer-events: none; animation: veritasx-click-ripple 0.6s linear forwards; }

                 /* --- Estilo Contenedor ARTICLE --- */
                 .veritasx-tweet-container {
                     position: relative !important; /* Para hijos absolutos */
                     z-index: 1 !important;
                     border: none !important; /* Sin borde en el contenedor exterior */
                     box-shadow: none !important; /* Sin sombra en el contenedor exterior */
                     overflow: visible !important; /* Permitir que el glow del hijo sobresalga */
                     background: transparent !important; /* Fondo transparente */
                 }
                 /* Fallback si no encontramos el div hijo */
                  .veritasx-pulsing-direct-border-card { border: 2px solid red !important; } /* Estilo de error */


                 /* --- BORDE/GLOW APLICADO AL PRIMER DIV HIJO --- */
                 .veritasx-pulsing-inner-border {
                     position: relative !important; /* Necesario para z-index y contenido */
                     z-index: 1 !important; /* Estará debajo del contenido real */
                     border-radius: 16px !important;
                     /* Borde directo */
                     border: 4px solid #00AACC !important;
                     /* Glow + Pulso */
                     box-shadow: 0 0 10px 2px rgba(0, 220, 255, 0.5) !important;
                     /* Animación */
                     animation: veritasx-inner-border-pulse 1.8s ease-in-out infinite alternate !important;
                     /* Permitir que el glow se vea */
                     overflow: visible !important;
                     /* Fondo transparente para ver a través */
                     background-color: transparent !important;
                      transition: none !important; /* Evitar transiciones raras */
                 }

                 /* Contenido DENTRO del div con borde */
                 .veritasx-pulsing-inner-border > div {
                     position: relative !important; /* Para apilar correctamente */
                     z-index: 2 !important; /* Encima del borde/glow de su padre */
                     border-radius: 12px !important; /* Redondeo interno */
                     overflow: hidden !important; /* El contenido sí puede ocultar su desbordamiento */
                      /* Importante: El fondo real del tweet estará aquí,
                         Twitter probablemente lo pone aquí o más adentro. */
                 }

                 /* --- ESTADO HOVER: Aplicado al ARTICLE padre, afecta al DIV hijo --- */
                 .veritasx-tweet-container:hover > .veritasx-pulsing-inner-border {
                    /* Reafirmamos la animación en el hijo cuando el padre está en hover */
                    animation: veritasx-inner-border-pulse 1.8s ease-in-out infinite alternate !important;
                    /* Opcional: Aumentar glow en hover */
                    /* box-shadow: 0 0 30px 10px rgba(0, 220, 255, 0.9) !important; */
                 }

                 /* Keyframes para el pulso del borde (aplicado al hijo) */
                 @keyframes veritasx-inner-border-pulse {
                     from {
                         border-color: #00AACC !important;
                         box-shadow: 0 0 10px 2px rgba(0, 220, 255, 0.5) !important;
                     }
                     to {
                         border-color: #33FFFF !important;
                         box-shadow: 0 0 28px 8px rgba(0, 220, 255, 0.85) !important;
                     }
                 }

                 /* Estilo para la insignia de branding (sin cambios en CSS) */
                 .veritasx-branding-badge {
                     position: absolute; top: 8px; left: 8px;
                     background-color: rgba(10, 25, 40, 0.75); color: rgba(200, 220, 255, 0.8);
                     font-size: 9px; font-weight: 500; padding: 3px 7px; border-radius: 5px;
                     z-index: 10; pointer-events: none; /* Z-index alto para estar encima de todo */
                     font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                     line-height: 1.2; text-align: left; border: 1px solid rgba(0, 220, 255, 0.3);
                     backdrop-filter: blur(2px);
                 }
                  .veritasx-branding-badge > span { color: rgba(0, 220, 255, 0.9); font-weight: bold; }

                 /* Insignia verificada (sin cambios) */
                 @keyframes veritasx-badge-glow { /* ... */ }
                 .veritasx-badge { animation: veritasx-badge-glow 2.5s ease-in-out infinite; }
            `;
			document.head.appendChild(styleEl);
		}

		// --- Añadir Branding Text (Ahora se añade al ARTICLE) ---
		if(!tweetElement.querySelector('.veritasx-branding-badge')) {
			const brandingBadge = document.createElement('div');
			brandingBadge.className = 'veritasx-branding-badge';
			brandingBadge.innerHTML = 'VeritasX<br><span>Mantle Network</span>';
			tweetElement.appendChild(brandingBadge); // Se añade al article (contenedor)
		}

		// --- Creación y Lógica del Botón (SIN CAMBIOS) ---
		const buttonContainer = document.createElement('div');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.alignItems = 'center';
		buttonContainer.classList.add('veritasx-button-container');

		const button = document.createElement('button');
		button.className = 'veritasx-verify-btn';
		const brightCyanColor = '#00DDFF';
		button.innerHTML = `
         <div class="veritasx-btn-content">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${ brightCyanColor }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: ${ brightCyanColor }; vertical-align: text-bottom; filter: drop-shadow(0 0 3px ${ brightCyanColor });">
                 <path d="M9 11l3 3L22 4"></path>
                 <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
             </svg>
             <span style="margin-left: 5px; font-size: 13px; font-weight: bold; color: ${ brightCyanColor }; text-shadow: 0 0 4px ${ brightCyanColor };">Verify</span>
         </div>
         <div class="veritasx-pulse-ring"></div>
       `;
		button.style.background = 'none';
		button.style.border = 'none';
		button.style.cursor = 'pointer';
		button.style.padding = '0 8px';
		button.style.lineHeight = '1';
		button.style.position = 'relative';
		button.style.overflow = 'visible';
		button.title = 'Verify with VeritasX';

		const verifyBtn = button;

		button.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const tweetUrl = getTweetUrlFromElement(tweetElement);
			const tweetId = extractTweetIdFromUrl(tweetUrl);
			let tweetContent = null;
			try {
				const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
				if(textElement) tweetContent = textElement.innerText?.trim() || null;
			} catch(contentError) {
				console.warn('VeritasX: Could not extract tweet content.', contentError);
			}

			if(tweetId && chrome?.runtime?.sendMessage) {
				const messagePayload = { action: 'initiateVerification', tweetId, tweetContent };
				const clickRipple = document.createElement('div');
				clickRipple.className = 'veritasx-click-ripple';
				button.appendChild(clickRipple);
				clickRipple.addEventListener('animationend', () => clickRipple.remove());
				chrome.runtime.sendMessage(messagePayload, (response) => {
					try {
						if(chrome.runtime.lastError) console.warn('VeritasX: BG message error:', chrome.runtime.lastError.message);
						else if(response && !response.success && response.message !== 'Debounced.') console.warn('VeritasX: BG response error:', response.message);
					} catch(callbackError) {
						console.error('VeritasX: sendMessage callback error:', callbackError);
					}
				});
			} else if(!tweetId) console.warn('VeritasX: Could not extract Tweet ID.');
			else console.warn('VeritasX: Cannot send message to background script.');
		});

		buttonContainer.appendChild(button);
		if(finalActionsBar) {
			finalActionsBar.appendChild(buttonContainer);
		} else {
			console.warn('VeritasX: Could not find actions bar to append button.');
		}

		const tweetUrl = getTweetUrlFromElement(tweetElement);
		const tweetId = extractTweetIdFromUrl(tweetUrl);
		if(tweetId) {
			checkIfTweetInContract(tweetId, tweetElement);
		}

	} catch(error) {
		console.error('VeritasX Content Script: Error in addVerificationButton:', error);
		processedTweetElements.add(tweetElement);
	}
}

function styleTweetAsVerified(tweetElement) {
	// La tarjeta ya tiene los estilos base y de marco/overlay/holo desde addVerificationButton
	// Esta función AHORA SOLO cambia el botón y añade la insignia
	if(!tweetElement || !tweetElement.parentElement) return;

	// Asegurarse de que la clase base está por si acaso
	if(!tweetElement.classList.contains('veritasx-tweet-card')) {
		tweetElement.style.position = 'relative';
		tweetElement.classList.add('veritasx-tweet-card');
	}

	const verifyBtn = tweetElement.querySelector('.veritasx-verify-btn');
	if(verifyBtn && verifyBtn.dataset.verified !== 'true') { // Solo modificar si no está ya marcado
		verifyBtn.dataset.verified = 'true';
		const verifyContent = verifyBtn.querySelector('.veritasx-btn-content');
		if(verifyContent) {
			verifyContent.innerHTML = `
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DA1F2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #1DA1F2; vertical-align: text-bottom; filter: drop-shadow(0 0 2px #1DA1F2);">
               <path d="M9 11l3 3L22 4"></path>
               <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
           </svg>
           <span style="margin-left: 4px; font-size: 13px; color: #1DA1F2; font-weight: bold;">Verified</span>
         `;
		}
		verifyBtn.style.textShadow = '0 0 5px rgba(29, 161, 242, 0.7)';
		verifyBtn.title = 'Verified by VeritasX';
		// Forzar cambio de color inmediato si el mouse estaba encima
		const svgEl = verifyBtn.querySelector('svg');
		const spanEl = verifyBtn.querySelector('span');
		if(svgEl) svgEl.style.color = '#1DA1F2';
		if(spanEl) spanEl.style.color = '#1DA1F2';

	}

	const articleElement = tweetElement.closest('article');
	if(articleElement && !articleElement.querySelector('.veritasx-badge')) {
		const badgeContainer = document.createElement('div');
		badgeContainer.className = 'veritasx-badge';
		badgeContainer.style.cssText = `position: absolute; top: 12px; right: 12px; z-index: 10; display: flex; align-items: center; background: linear-gradient(135deg, rgba(29, 161, 242, 0.9), rgba(10, 88, 202, 0.95)); border-radius: 12px; padding: 3px 10px; box-shadow: 0 2px 10px rgba(29, 161, 242, 0.4); animation: veritasx-badge-glow 2.5s ease-in-out infinite; backdrop-filter: blur(2px);`;
		badgeContainer.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span style="color: white; font-size: 12px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">VeritasX</span>
      `;
		articleElement.appendChild(badgeContainer);
	}
}

async function checkIfTweetInContract(tweetId, tweetElement) {
	if(!tweetId || !tweetElement) {
		return;
	}

	try {
		if(chrome && chrome.runtime && chrome.runtime.sendMessage) {
			chrome.runtime.sendMessage({
				action: 'checkTweetInContract',
				tweetId: tweetId,
			}, (response) => {
				try {
					if(chrome.runtime.lastError) {
						console.warn('VeritasX Content Script: Error checking contract status:', chrome.runtime.lastError.message);
						return;
					}

					if(response && response.exists) {
						styleTweetAsVerified(tweetElement);
					}
				} catch(callbackError) {
					console.error('VeritasX Content Script: Error in checkTweetInContract callback:', callbackError);
				}
			});
		} else {
			console.warn('VeritasX Content Script: chrome.runtime.sendMessage not available for checkTweetInContract.');
		}
	} catch(error) {
		console.error('VeritasX Content Script: Error in checkIfTweetInContract:', error);
	}
}

function getTweetUrlFromElement(tweetElement) {
	if(!tweetElement) return null;
	try {
		// Attempt 1: Find the timestamp link (most reliable for standard tweets)
		const timeLinks = tweetElement.querySelectorAll('a[href*="/status/"] time');
		for(const timeLink of timeLinks) {
			const anchor = timeLink.closest('a');
			if(anchor && anchor.href && anchor.href.includes('/status/')) {
				try {
					const urlObj = new URL(anchor.href);
					const pathParts = urlObj.pathname.split('/');
					// Ensure it looks like /username/status/ID
					if(pathParts.length >= 4 && pathParts[2] === 'status' && /^\d+$/.test(pathParts[3])) {
						const cleanUrl = `${ urlObj.origin }${ urlObj.pathname.split('/').slice(0, 4).join('/') }`;
						return cleanUrl;
					}
				} catch(e) { /* ignore parsing error and continue */
				}
			}
		}

		// Attempt 2: Find any link matching the status pattern (fallback)
		const allLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
		for(const link of allLinks) {
			if(link.href && link.href.includes('/status/')) {
				try {
					const urlObj = new URL(link.href);
					const pathParts = urlObj.pathname.split('/');
					const statusIndex = pathParts.indexOf('status');
					if(statusIndex !== -1 && pathParts.length > statusIndex + 1) {
						const potentialId = pathParts[statusIndex + 1].match(/^\d+/)?.[0]; // Match only digits at the start
						if(potentialId && potentialId.length > 15) { // Basic check for a plausible ID length
							const cleanUrl = `${ urlObj.origin }${ pathParts.slice(0, statusIndex + 2).join('/') }`;
							return cleanUrl;
						}
					}
				} catch(e) { /* ignore parsing error and continue */
				}
			}
		}

	} catch(error) {
		console.error('VeritasX Content Script: Error finding tweet URL:', error, tweetElement);
	}
	console.warn('VeritasX Content Script: Could not find tweet URL for element:', tweetElement);
	return null;
}

function extractTweetIdFromUrl(tweetUrl) {
	if(!tweetUrl) return null;
	try {
		const urlParts = tweetUrl.split('/');
		const statusIndex = urlParts.indexOf('status');
		if(statusIndex !== -1 && urlParts.length > statusIndex + 1) {
			const potentialId = urlParts[statusIndex + 1].match(/^\d+/)?.[0];
			if(potentialId && potentialId.length > 15) {
				return potentialId;
			}
		}
	} catch(error) {
	}
	return null;
}

if(document.readyState === 'complete' || document.readyState === 'interactive') {
	console.log('VeritasX Content Script: Document already loaded, initializing...');
	setTimeout(initializeVeritasXContentScript, 500);
} else {
	console.log('VeritasX Content Script: Document not loaded, adding DOMContentLoaded listener...');
	document.addEventListener('DOMContentLoaded', () => {
		console.log('VeritasX Content Script: DOMContentLoaded event fired, initializing...');
		setTimeout(initializeVeritasXContentScript, 500);
	});
}
