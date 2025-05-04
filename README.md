
# VeritasX: Verificación Descentralizada de Tweets en Mantle Network  
  
**(Decentralized Tweet Verification on Mantle Network)**  
  
---  
  
> **[Demo en Video](https://www.veed.io/view/44149187-2c4f-49f0-91ec-fa09debd99dd?panel=share)**  
  
*(Aquí mostraremos cómo funciona VeritasX en acción / Here we'll show VeritasX in action)*  
  
---  
  
## El Problema: La Desinformación Acelera  
  
**(The Problem: Misinformation Accelerates)**  
  
Las noticias falsas y la desinformación se propagan a velocidades alarmantes en plataformas como X, erosionando la confianza pública y dificultando la toma de decisiones informadas. Los sistemas actuales de moderación son a menudo insuficientes, centralizados y carecen de transparencia.  
  
*(Fake news and misinformation spread at alarming rates on platforms like X (formerly Twitter), eroding public trust and hindering informed decision-making. Current moderation systems are often insufficient, centralized, and lack transparency.)*  
  
## Nuestra Solución: VeritasX - Verdad Impulsada por la Comunidad en Mantle  
  
**(Our Solution: VeritasX - Community-Driven Truth on Mantle)**  
  
VeritasX es una extensión de navegador que empodera a la comunidad para verificar colectivamente la veracidad de los tweets. Construido sobre **Mantle Network**, ofrecemos una solución transparente, descentralizada y con incentivos para combatir la desinformación directamente en la fuente.  
  
*(VeritasX is a browser extension that empowers the community to collectively verify the veracity of tweets. Built on **Mantle Network**, we offer a transparent, decentralized, and incentivized solution to combat misinformation directly at the source.)*  
  
## Características Clave  
  
**(Key Features)**  
  
* **Integración Nativa:** Un botón "Verify" aparece directamente bajo cada tweet en X.com.  
    *(Native Integration: A "Verify" button appears directly under each tweet on X.com.)*  
* **Reporte y Stake Inicial:** Reporta tweets sospechosos directamente al Smart Contract de VeritasX en Mantle Sepolia, asegurando tu reporte con un stake inicial en $MNT.  
    *(Reporting & Initial Stake: Report suspicious tweets directly to the VeritasX Smart Contract on Mantle Sepolia, securing your report with an initial $MNT stake.)*  
* **Asistencia de IA para Reporteros:** Antes de finalizar el reporte, una IA analiza el contenido del tweet y ofrece una sugerencia inicial (Verdadero/Falso) con justificación para ayudar al reportero. *(Esta es una ayuda, no un oráculo)*.  
    *(AI Assistance for Reporters: Before finalizing the report, an AI analyzes the tweet content and provides an initial suggestion (True/False) with justification to aid the reporter. *(This is an aid, not an oracle)*.)*  
* **Votación y Staking Comunitario:** Cualquier usuario puede participar haciendo stake de $MNT y votando sobre la veracidad de un tweet reportado (Verdadero, Falso, Engañoso, Inverificable), añadiendo su propia justificación.  
    *(Community Voting & Staking: Any user can participate by staking $MNT and voting on the veracity of a reported tweet (True, False, Misleading, Unverifiable), adding their own justification.)*  
* **Resolución y Recompensas On-Chain:** El Smart Contract en Mantle determina el resultado final basado en el consenso ponderado por stake y distribuye recompensas a los participantes honestos.  
    *(On-Chain Resolution & Rewards: The Smart Contract on Mantle determines the final outcome based on stake-weighted consensus and distributes rewards to honest participants.)*  
* **Visualización Clara:** La extensión marca visualmente los tweets en X.com que han sido reportados o verificados por la comunidad VeritasX.  
    *(Clear Visualization: The extension visually flags tweets on X.com that have been reported or verified by the VeritasX community.)*  
  
## ¿Cómo Funciona? (El Poder de Mantle + IA)  
  
**(How It Works? (The Power of Mantle + AI))**  
  
VeritasX combina la transparencia de blockchain con la asistencia de IA para crear un ecosistema de verificación robusto:  
  
1.  **Smart Contract en Mantle (Corazón del Sistema):**  
 * Desplegado en **Mantle Sepolia Testnet** [0x307bDca58c2761F9be800790C900e554E43250a9](https://explorer.sepolia.mantle.xyz/address/0x307bDca58c2761F9be800790C900e554E43250a9)
    * **¿Por qué Mantle?** Elegimos Mantle por su **escalabilidad L2, bajas tarifas de transacción y compatibilidad EVM total**. Esto es esencial para permitir las frecuentes interacciones on-chain (reportes, votos, reclamos) de forma económica y rápida.  
    * **Funciones Clave del Contrato:** Almacena de forma segura los hashes de contenido de los tweets reportados, los stakes individuales, los votos, las justificaciones, el estado de resolución y maneja la lógica de distribución de recompensas.  
    *(**Smart Contract on Mantle (System Core):***  
 * *Deployed on **Mantle Sepolia Testnet** [0x307bDca58c2761F9be800790C900e554E43250a9](https://explorer.sepolia.mantle.xyz/address/0x307bDca58c2761F9be800790C900e554E43250a9).*  
 * ***Why Mantle?** We chose Mantle for its **L2 scalability, low transaction fees, and full EVM compatibility**. This is essential to enable frequent on-chain interactions (reports, votes, claims) affordably and quickly.*  
 * ***Key Contract Functions:** Securely stores content hashes of reported tweets, individual stakes, votes, justifications, resolution status, and handles reward distribution logic.*)  
  
2.  **Flujo de Verificación:**  
 * **Reporte + Asistencia IA:** Un usuario hace clic en "Verify". La extensión extrae ID y contenido. El contenido se envía a una API externa de IA (actualmente `wapa-api.qcdr.io`) para obtener una **sugerencia inicial no vinculante** que se muestra al reportero. Si decide proceder, el usuario envía la transacción `reportTweet` al contrato en Mantle (incluyendo ID, hash del contenido y stake inicial).  
        *(**Reporting + AI Assist:** A user clicks "Verify". The extension extracts the ID and content. The content is sent to an external AI API (currently `wapa-api.qcdr.io`) to get a **non-binding initial suggestion** shown to the reporter. If they decide to proceed, the user sends the `reportTweet` transaction to the contract on Mantle (including ID, content hash, and initial stake).)*  
 * **Votación Comunitaria:** Otros usuarios, a través del popup de la extensión, ven los tweets pendientes. Pueden interactuar con el contrato mediante `stakeAndVote`, aportando su propio stake, voto y justificación.  
        *(**Community Voting:** Other users, via the extension popup, see pending tweets. They interact with the contract using `stakeAndVote`, providing their own stake, vote, and justification.)*  
 * **Resolución On-Chain:** Después de un período (definido en el contrato), la función `forceResolution` puede ser llamada. El contrato en Mantle calcula el resultado final (ej: "Falso") basado en la ponderación del stake para cada opción y actualiza el estado del tweet.  
        *(**On-Chain Resolution:** After a period (defined in the contract), the `forceResolution` function can be called. The contract on Mantle calculates the final outcome (e.g., "False") based on the stake weight for each option and updates the tweet's status.)*  
 * **Reclamación de Recompensas:** Los usuarios que votaron alineados con el consenso final pueden llamar a `claimReward` en el contrato para recibir su parte de los stakes de los votos incorrectos.  
        *(**Reward Claiming:** Users who voted aligned with the final consensus can call `claimReward` on the contract to receive their share of the stakes from incorrect votes.)*  
  
3.  **Tecnología de la Extensión:**  
 * Frontend construido con **Vue.js 3** para una interfaz reactiva.  
    * Interacción con blockchain gestionada por **Ethers.js v6**.  
    * Comunicación segura entre content script, popup y background script usando las APIs de Chrome Extension.  
    * El background script maneja la lógica de conexión y orquesta las llamadas al contrato (a través de inyección o script offscreen).  
    *(**Extension Technology:***  
 * *Frontend built with **Vue.js 3** for a reactive interface.*  
 * *Blockchain interaction managed by **Ethers.js v6**.*  
 * *Secure communication between content script, popup, and background script using Chrome Extension APIs.*  
 * *The background script handles connection logic and orchestrates contract calls (via injection or offscreen script).*)  
  
## 🎥 Demo Video  
  
> **[Demo en Video](https://www.veed.io/view/44149187-2c4f-49f0-91ec-fa09debd99dd?panel=share)**  
  

## Viabilidad y Escalabilidad  
  
**(Viability and Scalability)**  
  
* **Base Sólida en Mantle:** La elección de Mantle Network proporciona una infraestructura escalable y de bajo costo desde el inicio, permitiendo que el sistema maneje un gran volumen de verificaciones sin tarifas prohibitivas.  
    *(**Solid Foundation on Mantle:** Choosing Mantle Network provides a scalable, low-cost infrastructure from the start, allowing the system to handle a large volume of verifications without prohibitive fees.)*  
* **Modelo Sostenible:** El sistema de staking crea un incentivo económico para la participación honesta y penaliza la desinformación o los votos maliciosos.  
    *(**Sustainable Model:** The staking system creates an economic incentive for honest participation and penalizes misinformation or malicious voting.)*  
* **Modularidad:** La IA es un componente auxiliar. El sistema funciona de forma descentralizada sin ella, pero su integración puede mejorarse con modelos más avanzados o específicos para detección de desinformación.  
    *(**Modularity:** The AI is an auxiliary component. The decentralized system functions without it, but its integration can be enhanced with more advanced or specialized misinformation detection models.)*  
* **Potencial de Crecimiento:** El modelo puede expandirse para incluir sistemas de reputación on-chain para los verificadores, mecanismos de apelación/disputa más complejos y potencialmente adaptarse a otras plataformas de contenido.  
    *(**Growth Potential:** The model can be expanded to include on-chain reputation systems for verifiers, more complex appeal/dispute mechanisms, and potentially adapt to other content platforms.)*  
  
## Stack Tecnológico  
  
**(Tech Stack)**  
  
* **Blockchain:** Mantle Network (Sepolia Testnet)  
* **Smart Contracts:** Solidity  
* **Frontend:** Vue.js 3, Bootstrap 5  
* **Interacción Blockchain:** Ethers.js v6  
* **Extensión:** JavaScript (ES Modules), Chrome Extension Manifest V3 APIs  
  
## Futuro del Proyecto  
  
**(Future Work)**  
  
* Refinar la UI/UX del popup y la integración visual en Twitter.  
    *(Refine popup UI/UX and visual integration on Twitter.)*  
* Optimizar la consulta de eventos del contrato para mayor eficiencia.  
    *(Optimize contract event querying for efficiency.)*  
* Desarrollar un sistema de reputación on-chain para verificadores.  
    *(Develop an on-chain reputation system for verifiers.)*  
* Explorar mecanismos de disputa y apelación más robustos.  
    *(Explore more robust dispute and appeal mechanisms.)*  
  
---
