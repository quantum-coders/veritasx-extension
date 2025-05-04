// Vue Component Template usando Bootstrap
const appTemplate = `
<div class="container py-3">
  <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
    <img src="logo.png" alt="VeritasX Logo" class="me-3" width="32" height="32">
    <div>
      <h1 class="h5 mb-0 text-primary">VeritasX</h1>
      <p class="small text-muted mb-0">Verificación Descentralizada en Mantle</p>
    </div>
  </div>
  
  <div v-if="message" :class="['alert', 'alert-'+messageType]" role="alert">
    {{ message }}
  </div>
  
  <div class="card mb-3">
    <div class="card-body">
      <div class="d-flex align-items-center">
        <div class="me-2">
          <span :class="['badge rounded-pill', isConnected ? (isCorrectNetwork ? 'bg-success' : 'bg-warning') : 'bg-danger']">
            <span class="visually-hidden">Estado:</span>
          </span>
        </div>
        <div>
          <strong>{{ connectionStatusText }}</strong>
          <div class="small text-muted" v-html="networkInfo"></div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-if="tweetUrl && isConnected && isCorrectNetwork" class="card mb-3">
    <div class="card-header bg-light">
      <h5 class="card-title mb-0">Verificar Tweet</h5>
    </div>
    <div class="card-body">
      <div class="small mb-3 text-muted">
        URL: <span class="text-break">{{ tweetUrl }}</span>
      </div>
      
      <form @submit.prevent="submitFactCheck">
        <div class="mb-3">
          <label class="form-label fw-bold">Veredicto:</label>
          <div class="d-flex gap-3">
            <div class="form-check">
              <input class="form-check-input" type="radio" id="verdadero" v-model="isTrue" :value="true">
              <label class="form-check-label" for="verdadero">Verdadero</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" id="falso" v-model="isTrue" :value="false">
              <label class="form-check-label" for="falso">Falso</label>
            </div>
          </div>
        </div>
        
        <div class="mb-3">
          <label for="justification" class="form-label fw-bold">Justificación:</label>
          <textarea id="justification" v-model="justification" class="form-control" rows="4" 
                    placeholder="Explica por qué crees que este tweet es verdadero o falso..."></textarea>
        </div>
        
        <button type="submit" class="btn btn-primary w-100" :disabled="isSubmitting">
          <span v-if="isSubmitting">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Enviando...
          </span>
          <span v-else>Enviar Verificación</span>
        </button>
      </form>
    </div>
  </div>
  
  <button v-if="!isConnected" @click="connectWallet" class="btn btn-primary w-100 mb-2" :disabled="isConnecting">
    <span v-if="isConnecting">
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Conectando...
    </span>
    <span v-else>Conectar Wallet</span>
  </button>
  
  <button v-if="isConnected && !isCorrectNetwork" @click="switchNetwork" class="btn btn-outline-primary w-100 mb-2" :disabled="isSwitching">
    <span v-if="isSwitching">
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Cambiando...
    </span>
    <span v-else>Cambiar a Mantle Sepolia</span>
  </button>
  
  <div class="mt-4 text-center small text-muted">
    <p>VeritasX v1.0.0 | Powered by Mantle</p>
  </div>
</div>
`;

// Configuration
const CONTRACT_ADDRESS = "0x2521aac9eB2831A10C28034d69B7488CFD4d8ce7"; // Dirección del contrato desplegado
const MANTLE_SEPOLIA_CHAIN_ID = "5003"; // Mantle Sepolia Chain ID
const MANTLE_SEPOLIA_RPC_URL = "https://rpc.sepolia.mantle.xyz"; // Mantle Sepolia RPC URL
const MANTLE_SEPOLIA_EXPLORER_URL = "https://explorer.sepolia.mantle.xyz"; // Mantle Sepolia Explorer

// ABI for the TweetFactChecker contract
const CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "_tweetUrl", "type": "string"},
      {"name": "_isTrue", "type": "bool"},
      {"name": "_justification", "type": "string"}
    ],
    "name": "submitFactCheck",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_tweetUrl", "type": "string"}],
    "name": "getFactChecksForTweet",
    "outputs": [
      {
        "components": [
          {"name": "tweetUrl", "type": "string"},
          {"name": "isTrue", "type": "bool"},
          {"name": "justification", "type": "string"},
          {"name": "checker", "type": "address"},
          {"name": "timestamp", "type": "uint256"},
          {"name": "upvotes", "type": "uint256"},
          {"name": "downvotes", "type": "uint256"}
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Crear la aplicación Vue
document.addEventListener('DOMContentLoaded', function() {
  const app = new Vue({
    el: '#app',
    template: appTemplate,
    data: {
      // Estado de la conexión
      isConnected: false,
      isCorrectNetwork: false,
      currentAccount: null,

      // Estado de la UI
      isConnecting: false,
      isSwitching: false,
      isSubmitting: false,

      // Datos del formulario
      tweetUrl: null,
      isTrue: true,
      justification: '',

      // Mensajes
      message: '',
      messageType: 'info', // info, success, danger, warning
      messageTimeout: null
    },
    computed: {
      connectionStatusText() {
        if (!this.isConnected) {
          return 'Desconectado';
        } else if (!this.isCorrectNetwork) {
          return 'Red Incorrecta';
        } else {
          return 'Conectado';
        }
      },
      networkInfo() {
        if (!this.isConnected) {
          return 'Por favor, conecta tu wallet';
        } else if (!this.isCorrectNetwork) {
          return `Por favor, cambia a Mantle Sepolia<br>
            <span class="text-break">${this.shortenAddress(this.currentAccount)}</span>`;
        } else {
          return `Mantle Sepolia Testnet<br>
            <span class="text-break">${this.shortenAddress(this.currentAccount)}</span>`;
        }
      }
    },
    methods: {
      // Inicializar
      async initialize() {
        // Obtener la URL del tweet de los parámetros
        const urlParams = new URLSearchParams(window.location.search);
        this.tweetUrl = urlParams.get('tweetUrl');

        // Comprobar si hay un proveedor de Ethereum
        if (typeof window.ethereum !== 'undefined') {
          // Comprobar si ya está conectado
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
              this.currentAccount = accounts[0];
              this.isConnected = true;

              // Comprobar si estamos en la red correcta
              const chainId = await window.ethereum.request({ method: 'eth_chainId' });
              this.isCorrectNetwork = chainId === '0x' + parseInt(MANTLE_SEPOLIA_CHAIN_ID).toString(16);
            }
          } catch (error) {
            console.error("VeritasX Popup: Error checking accounts:", error);
          }

          // Escuchar cambios en la cuenta
          window.ethereum.on('accountsChanged', this.handleAccountsChanged);
          window.ethereum.on('chainChanged', this.handleChainChanged);
        } else {
          this.showMessage('No se detectó ninguna wallet. Por favor, instala MetaMask u otra wallet compatible.', 'danger');
        }
      },

      // Conectar wallet
      async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
          this.showMessage('No se detectó ninguna wallet. Por favor, instala MetaMask.', 'danger');
          return;
        }

        this.isConnecting = true;

        try {
          // Solicitar acceso a las cuentas
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

          if (accounts.length === 0) {
            this.showMessage('No se encontraron cuentas. Por favor, crea una cuenta en tu wallet.', 'danger');
            this.isConnecting = false;
            return;
          }

          // Establecer la cuenta actual
          this.currentAccount = accounts[0];
          this.isConnected = true;

          // Comprobar si estamos en la red correcta
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          this.isCorrectNetwork = chainId === '0x' + parseInt(MANTLE_SEPOLIA_CHAIN_ID).toString(16);

          if (this.isCorrectNetwork) {
            this.showMessage('Wallet conectada con éxito en la red Mantle Sepolia.', 'success');
          } else {
            this.showMessage('Wallet conectada, pero no estás en la red Mantle Sepolia.', 'warning');
          }
        } catch (error) {
          console.error("VeritasX Popup: Error connecting wallet:", error);
          this.showMessage('Error al conectar la wallet. Por favor, intenta de nuevo.', 'danger');
        }

        this.isConnecting = false;
      },

      // Cambiar a la red Mantle Sepolia
      async switchNetwork() {
        if (typeof window.ethereum === 'undefined') {
          this.showMessage('No se detectó ninguna wallet. Por favor, instala MetaMask.', 'danger');
          return;
        }

        this.isSwitching = true;

        try {
          // Intentar cambiar a Mantle Sepolia
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x' + parseInt(MANTLE_SEPOLIA_CHAIN_ID).toString(16) }],
            });

            this.showMessage('Cambiado a la red Mantle Sepolia con éxito.', 'success');
          } catch (switchError) {
            // Este código de error indica que la cadena no se ha añadido a MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x' + parseInt(MANTLE_SEPOLIA_CHAIN_ID).toString(16),
                      chainName: 'Mantle Sepolia Testnet',
                      nativeCurrency: {
                        name: 'MNT',
                        symbol: 'MNT',
                        decimals: 18,
                      },
                      rpcUrls: [MANTLE_SEPOLIA_RPC_URL],
                      blockExplorerUrls: [MANTLE_SEPOLIA_EXPLORER_URL],
                    },
                  ],
                });

                this.showMessage('Red Mantle Sepolia agregada con éxito.', 'success');
              } catch (addError) {
                console.error("VeritasX Popup: Error adding Mantle Sepolia network:", addError);
                this.showMessage('Error al agregar la red Mantle Sepolia.', 'danger');
              }
            } else {
              console.error("VeritasX Popup: Error switching to Mantle Sepolia network:", switchError);
              this.showMessage('Error al cambiar a la red Mantle Sepolia.', 'danger');
            }
          }

          // Comprobar si estamos ahora en la red correcta
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          this.isCorrectNetwork = chainId === '0x' + parseInt(MANTLE_SEPOLIA_CHAIN_ID).toString(16);
        } catch (error) {
          console.error("VeritasX Popup: Error switching network:", error);
          this.showMessage('Error al cambiar de red.', 'danger');
        }

        this.isSwitching = false;
      },

      // Enviar verificación de hechos
      async submitFactCheck() {
        if (!this.isConnected) {
          this.showMessage('Por favor, conecta tu wallet primero.', 'danger');
          return;
        }

        if (!this.isCorrectNetwork) {
          this.showMessage('Por favor, cambia a la red Mantle Sepolia primero.', 'danger');
          return;
        }

        if (!this.justification.trim()) {
          this.showMessage('Por favor, proporciona una justificación para tu verificación.', 'danger');
          return;
        }

        this.isSubmitting = true;

        try {
          // Crear instancia de Web3
          const web3 = new Web3(window.ethereum);

          // Crear instancia del contrato
          const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

          // Enviar la verificación de hechos
          await contract.methods.submitFactCheck(this.tweetUrl, this.isTrue, this.justification.trim())
            .send({ from: this.currentAccount });

          // Mostrar mensaje de éxito
          this.showMessage('¡Verificación enviada con éxito!', 'success');

          // Limpiar formulario
          this.justification = '';

          // Notificar al content script
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {action: "factCheckSubmitted"});
            }
          });

          // Cerrar el popup después de un retraso
          setTimeout(() => {
            window.close();
          }, 2000);
        } catch (error) {
          console.error("VeritasX Popup: Error submitting fact check:", error);
          this.showMessage('Error al enviar la verificación. Por favor, intenta de nuevo.', 'danger');
        }

        this.isSubmitting = false;
      },

      // Manejar cambios de cuenta
      handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
          // El usuario desconectó todas las cuentas
          this.currentAccount = null;
          this.isConnected = false;
          this.showMessage('Wallet desconectada.', 'warning');
        } else if (accounts[0] !== this.currentAccount) {
          // El usuario cambió a una cuenta diferente
          this.currentAccount = accounts[0];
          this.isConnected = true;
          this.showMessage('Cambiado a cuenta ' + this.shortenAddress(this.currentAccount), 'success');
        }
      },

      // Manejar cambios de cadena
      handleChainChanged() {
        // Comprobar si estamos en la red correcta
        window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
          this.isCorrectNetwork = chainId === '0x' + parseInt(MANTLE_SEPOLIA_CHAIN_ID).toString(16);

          if (this.isCorrectNetwork && this.isConnected) {
            this.showMessage('Conectado a la red Mantle Sepolia.', 'success');
          } else if (this.isConnected) {
            this.showMessage('Por favor, cambia a la red Mantle Sepolia.', 'warning');
          }
        });
      },

      // Mostrar mensaje
      showMessage(message, type = 'info') {
        // Limpiar el timeout anterior si existe
        if (this.messageTimeout) {
          clearTimeout(this.messageTimeout);
        }

        this.message = message;
        this.messageType = type;

        // Auto-ocultar después de 5 segundos
        this.messageTimeout = setTimeout(() => {
          this.message = '';
        }, 5000);
      },

      // Acortar dirección de Ethereum
      shortenAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      }
    },
    mounted() {
      this.initialize();
    }
  });
});
