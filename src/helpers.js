import { ethers } from 'ethers';

export const TWEET_STATUS_DETAILS = {
  0: { text: 'Pending', color: 'secondary' },
  1: { text: 'True', color: 'success' },
  2: { text: 'False', color: 'danger' },
  3: { text: 'Misleading', color: 'warning' },
  4: { text: 'Unverifiable', color: 'info' }
};

export const VOTE_OPTIONS = [
    { value: 1, text: 'True' },
    { value: 2, text: 'False' },
    { value: 3, text: 'Misleading' },
    { value: 4, text: 'Unverifiable' },
];

export function formatAddress(address) {
  if (!address || typeof address !== 'string' || address.length < 10) return address || 'N/A';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  try {
    const tsNumber = Number(timestamp);
    if (isNaN(tsNumber) || tsNumber === 0) return 'N/A';
    const date = new Date(tsNumber * 1000);
    return date.toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatMNT(weiValue, decimals = 4) {
    if (weiValue === undefined || weiValue === null) return '0';
    try {
        const etherString = ethers.formatEther(weiValue);
        const etherNumber = parseFloat(etherString);
        if (isNaN(etherNumber)) return '0';
        return etherNumber.toFixed(decimals);
    } catch (error) {
        console.error("Error formatting MNT:", weiValue, error);
        return '0';
    }
}

export function hashTweetContent(content) {
    if (typeof content !== 'string' || content.trim() === '') return null;
    try {
      return ethers.id(content);
    } catch (error) {
      console.error("Error hashing content:", error);
      return null;
    }
}

export function getStatusDetails(statusNumber) {
    return TWEET_STATUS_DETAILS[statusNumber] || { text: 'Unknown', color: 'dark' };
}
