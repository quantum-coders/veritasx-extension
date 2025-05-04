# VeritasX Chrome Extension

A Chrome extension for decentralized fact-checking of tweets using the Mantle blockchain.

## Overview

VeritasX allows users to:
- Report tweets for fact-checking verification
- Stake tokens and vote on the veracity of tweets
- Earn rewards for accurate fact-checking
- View verification status of tweets directly on Twitter

This extension uses the VeritasX smart contract deployed on the Mantle Sepolia testnet.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Chrome/Chromium browser
- Wallet with Mantle Sepolia MNT (testnet tokens)

## Setup Instructions

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/veritasx-extension.git
   cd veritasx-extension
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Update the contract address:
   Edit `src/utils/contract.js` and update the `contractAddress` variable with your deployed contract address.

4. Build the extension:
   ```
   npm run build
   ```

5. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Development

For local development:

```
npm run dev
```

To build the extension for production:

```
npm run build
```

## Contract Deployment

The extension works with the VeritasX smart contract deployed on the Mantle Sepolia testnet. The contract enables decentralized fact-checking with economic incentives.

## Features

- **Tweet Reporting**: Report tweets for fact-checking verification
- **Staking & Voting**: Stake MNT tokens and vote on tweet veracity
- **Rewards**: Earn rewards for accurate fact-checking
- **Twitter Integration**: Interact with tweets directly on Twitter

## Extension Structure

- `src/popup`: Main extension UI using Vue.js
- `src/content-scripts`: Content script for Twitter/X integration
- `src/background`: Background service worker
- `src/utils`: Utility functions including blockchain integration
- `src/assets`: Images and other static assets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.