console.log('VeritasX Content Script Loading - v5 (Content Reading)');

console.log('Initial Check:', typeof chrome, typeof chrome?.runtime, typeof chrome?.runtime?.sendMessage);

function initializeVeritasXContentScript() {
        console.log('VeritasX Content Script: initializeVeritasXContentScript() called on', window.location.hostname);
        console.log('Check inside Initialize:', typeof chrome, typeof chrome?.runtime, typeof chrome?.runtime?.sendMessage);

        if (!document.body) {
             console.warn("VeritasX Content Script: Document body not ready yet, retrying initialization soon.");
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

        console.log('VeritasX Content Script: Setting up MutationObserver on document.body');
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        console.log('VeritasX Content Script: Performing initial tweet scan on document.body');
        findAndProcessTweets(document.body);
        console.log('VeritasX Content Script: Initialization complete.');
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
        if (!tweetElement || processedTweetElements.has(tweetElement)) {
             return;
        }

        try {
            const actionsBar = tweetElement.querySelector(':scope > div > div > div:nth-child(2) > div[role="group"]');
            const fallbackActionBar = !actionsBar ? tweetElement.querySelector('[role="group"]') : null;
            const finalActionsBar = actionsBar || fallbackActionBar;

            if (!finalActionsBar || finalActionsBar.querySelector('.veritasx-verify-btn')) {
                processedTweetElements.add(tweetElement);
                return;
            }

            processedTweetElements.add(tweetElement);
            console.log('VeritasX Content Script: Marking element as processed and adding button:', tweetElement);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.classList.add('veritasx-button-container');

            const button = document.createElement('button');
            button.className = 'veritasx-verify-btn';
            button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: rgb(83, 100, 113); vertical-align: text-bottom;">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                <span style="margin-left: 4px; font-size: 13px; color: rgb(83, 100, 113);">Verify</span>
            `;
            button.style.background = 'none';
            button.style.border = 'none';
            button.style.cursor = 'pointer';
            button.style.padding = '0 6px';
            button.style.lineHeight = '1';
            button.title = 'Verify with VeritasX';

            const svgElement = button.querySelector('svg');
            const spanElement = button.querySelector('span');

            button.addEventListener('mouseover', () => {
                if(svgElement) svgElement.style.color = 'rgb(29, 161, 242)';
                if(spanElement) spanElement.style.color = 'rgb(29, 161, 242)';
            });
            button.addEventListener('mouseout', () => {
                if(svgElement) svgElement.style.color = 'rgb(83, 100, 113)';
                if(spanElement) spanElement.style.color = 'rgb(83, 100, 113)';
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('VeritasX Content Script: Verify button clicked (no debounce).');

                const tweetUrl = getTweetUrlFromElement(tweetElement);
                const tweetId = extractTweetIdFromUrl(tweetUrl);
                let tweetContent = null;

                try {
                    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
                    if (textElement) {
                        tweetContent = textElement.innerText?.trim() || null;
                        console.log('VeritasX Content Script: Extracted Tweet Content Length:', tweetContent?.length);
                    } else {
                        console.warn('VeritasX Content Script: Could not find tweet text element for element:', tweetElement);
                    }
                } catch (contentError) {
                    console.error('VeritasX Content Script: Error extracting tweet content:', contentError);
                }

                console.log(`Verify button processing. URL: ${tweetUrl}, ID: ${tweetId}, Content Found: ${!!tweetContent}`);

                if (tweetId && chrome && chrome.runtime && chrome.runtime.sendMessage) {
                    console.log('Attempting to send \'initiateVerification\' message...');
                    const messagePayload = {
                        action: 'initiateVerification',
                        tweetId: tweetId,
                        tweetContent: tweetContent
                    };
                    console.log('VeritasX Content Script: Sending payload:', messagePayload);

                    chrome.runtime.sendMessage(messagePayload, (response) => {
                         try {
                             if (chrome.runtime.lastError) {
                                 console.error('VeritasX Content Script: Error receiving response:', chrome.runtime.lastError.message);
                             } else {
                                 console.log('VeritasX Content Script: Message sent response:', response);
                             }
                         } catch (callbackError) {
                              console.error("VeritasX Content Script: Error accessing response/lastError (context might be invalid here too):", callbackError);
                         }
                    });
                } else if (!tweetId) {
                    console.error('Could not extract Tweet ID from URL:', tweetUrl);
                } else {
                    console.error('Cannot send message, runtime unavailable inside click handler.');
                }
            });

            buttonContainer.appendChild(button);
            finalActionsBar.appendChild(buttonContainer);
            console.log('VeritasX Content Script: Successfully added verification button.');

        } catch(error) {
            console.error('VeritasX Content Script: Error adding button:', error, tweetElement);
            processedTweetElements.add(tweetElement);
        }
}

function getTweetUrlFromElement(tweetElement) {
        try {
            const timeLinks = tweetElement.querySelectorAll('a time');
            for(const timeLink of timeLinks) {
                const anchor = timeLink?.closest('a');
                if(anchor && anchor.href && anchor.href.includes('/status/')) {
                    try {
                        const urlObj = new URL(anchor.href);
                        const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
                        return cleanUrl;
                    } catch(e) {
                        console.warn('VeritasX Content Script: Could not parse potential tweet URL:', anchor.href, e);
                    }
                }
            }
             const allLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
              for(const link of allLinks) {
                  if (link.href.includes('/status/')) {
                     try {
                        const urlObj = new URL(link.href);
                        if (urlObj.pathname.split('/').length === 4 && urlObj.pathname.includes('/status/')) {
                           const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
                           return cleanUrl;
                        }
                     } catch(e) { /* Ignore */ }
                  }
              }
        } catch(error) {
            console.error('VeritasX Content Script: Error finding tweet URL:', error);
        }
         console.warn('VeritasX Content Script: Could not find tweet URL for element:', tweetElement);
        return null;
}

function extractTweetIdFromUrl(tweetUrl) {
    if (!tweetUrl) {
        return null;
    }
    try {
        const urlParts = tweetUrl.split('/');
        const statusIndex = urlParts.indexOf('status');
        if (statusIndex !== -1 && urlParts.length > statusIndex + 1) {
            const potentialId = urlParts[statusIndex + 1].split('?')[0];
            if (/^\d+$/.test(potentialId)) {
                return potentialId;
            } else {
                 console.warn('VeritasX Content Script: Potential ID part is not numeric:', potentialId);
            }
        } else {
             console.warn('VeritasX Content Script: Could not find "status" or ID part in URL:', tweetUrl);
        }
    } catch (error) {
        console.error('VeritasX Content Script: Error extracting tweet ID:', error, tweetUrl);
    }
    return null;
}


if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log("VeritasX Content Script: Document already loaded, initializing...");
    setTimeout(initializeVeritasXContentScript, 500);
} else {
    console.log("VeritasX Content Script: Document not loaded, adding DOMContentLoaded listener...");
    document.addEventListener('DOMContentLoaded', () => {
        console.log("VeritasX Content Script: DOMContentLoaded event fired, initializing...");
        setTimeout(initializeVeritasXContentScript, 500);
    });
}
