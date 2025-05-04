export const VeritasXAbi = [
		{
			"type": "constructor",
			"inputs": [],
			"stateMutability": "nonpayable"
		},
		{
			"type": "function",
			"name": "admin",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "address",
					"internalType": "address"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "claimReward",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				}
			],
			"outputs": [],
			"stateMutability": "nonpayable"
		},
		{
			"type": "function",
			"name": "emergencyWithdraw",
			"inputs": [],
			"outputs": [],
			"stateMutability": "nonpayable"
		},
		{
			"type": "function",
			"name": "forceResolution",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				}
			],
			"outputs": [],
			"stateMutability": "nonpayable"
		},
		{
			"type": "function",
			"name": "getPotentialReward",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				},
				{
					"name": "_user",
					"type": "address",
					"internalType": "address"
				}
			],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "getTweetInfo",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				}
			],
			"outputs": [
				{
					"name": "",
					"type": "tuple",
					"internalType": "struct VeritasX.TweetView",
					"components": [
						{
							"name": "tweetId",
							"type": "string",
							"internalType": "string"
						},
						{
							"name": "contentHash",
							"type": "string",
							"internalType": "string"
						},
						{
							"name": "reporter",
							"type": "address",
							"internalType": "address"
						},
						{
							"name": "reportTime",
							"type": "uint256",
							"internalType": "uint256"
						},
						{
							"name": "resolved",
							"type": "bool",
							"internalType": "bool"
						},
						{
							"name": "status",
							"type": "uint8",
							"internalType": "enum VeritasX.TweetStatus"
						},
						{
							"name": "stakePool",
							"type": "uint256",
							"internalType": "uint256"
						},
						{
							"name": "totalStakers",
							"type": "uint256",
							"internalType": "uint256"
						}
					]
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "getUserStake",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				},
				{
					"name": "_user",
					"type": "address",
					"internalType": "address"
				}
			],
			"outputs": [
				{
					"name": "amount",
					"type": "uint256",
					"internalType": "uint256"
				},
				{
					"name": "vote",
					"type": "uint8",
					"internalType": "enum VeritasX.TweetStatus"
				},
				{
					"name": "justification",
					"type": "string",
					"internalType": "string"
				},
				{
					"name": "claimed",
					"type": "bool",
					"internalType": "bool"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "minStakeAmount",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "reportTweet",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				},
				{
					"name": "_contentHash",
					"type": "string",
					"internalType": "string"
				}
			],
			"outputs": [],
			"stateMutability": "payable"
		},
		{
			"type": "function",
			"name": "reporterRewardShare",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "resolutionPeriod",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "stakeAndVote",
			"inputs": [
				{
					"name": "_tweetId",
					"type": "string",
					"internalType": "string"
				},
				{
					"name": "_vote",
					"type": "uint8",
					"internalType": "enum VeritasX.TweetStatus"
				},
				{
					"name": "_justification",
					"type": "string",
					"internalType": "string"
				}
			],
			"outputs": [],
			"stateMutability": "payable"
		},
		{
			"type": "function",
			"name": "totalTweetsReported",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "totalTweetsResolved",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "transferAdmin",
			"inputs": [
				{
					"name": "_newAdmin",
					"type": "address",
					"internalType": "address"
				}
			],
			"outputs": [],
			"stateMutability": "nonpayable"
		},
		{
			"type": "function",
			"name": "truthThreshold",
			"inputs": [],
			"outputs": [
				{
					"name": "",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"stateMutability": "view"
		},
		{
			"type": "function",
			"name": "updateParams",
			"inputs": [
				{
					"name": "_minStakeAmount",
					"type": "uint256",
					"internalType": "uint256"
				},
				{
					"name": "_reporterRewardShare",
					"type": "uint256",
					"internalType": "uint256"
				},
				{
					"name": "_truthThreshold",
					"type": "uint256",
					"internalType": "uint256"
				},
				{
					"name": "_resolutionPeriod",
					"type": "uint256",
					"internalType": "uint256"
				}
			],
			"outputs": [],
			"stateMutability": "nonpayable"
		},
		{
			"type": "event",
			"name": "RewardClaimed",
			"inputs": [
				{
					"name": "tweetIdHash",
					"type": "bytes32",
					"indexed": true,
					"internalType": "bytes32"
				},
				{
					"name": "staker",
					"type": "address",
					"indexed": true,
					"internalType": "address"
				},
				{
					"name": "amount",
					"type": "uint256",
					"indexed": false,
					"internalType": "uint256"
				},
				{
					"name": "tweetId",
					"type": "string",
					"indexed": false,
					"internalType": "string"
				}
			],
			"anonymous": false
		},
		{
			"type": "event",
			"name": "StakePlaced",
			"inputs": [
				{
					"name": "tweetIdHash",
					"type": "bytes32",
					"indexed": true,
					"internalType": "bytes32"
				},
				{
					"name": "staker",
					"type": "address",
					"indexed": true,
					"internalType": "address"
				},
				{
					"name": "vote",
					"type": "uint8",
					"indexed": false,
					"internalType": "enum VeritasX.TweetStatus"
				},
				{
					"name": "amount",
					"type": "uint256",
					"indexed": false,
					"internalType": "uint256"
				},
				{
					"name": "justification",
					"type": "string",
					"indexed": false,
					"internalType": "string"
				},
				{
					"name": "tweetId",
					"type": "string",
					"indexed": false,
					"internalType": "string"
				}
			],
			"anonymous": false
		},
		{
			"type": "event",
			"name": "TweetReported",
			"inputs": [
				{
					"name": "tweetIdHash",
					"type": "bytes32",
					"indexed": true,
					"internalType": "bytes32"
				},
				{
					"name": "reporter",
					"type": "address",
					"indexed": true,
					"internalType": "address"
				},
				{
					"name": "timestamp",
					"type": "uint256",
					"indexed": false,
					"internalType": "uint256"
				},
				{
					"name": "tweetId",
					"type": "string",
					"indexed": false,
					"internalType": "string"
				}
			],
			"anonymous": false
		},
		{
			"type": "event",
			"name": "TweetResolved",
			"inputs": [
				{
					"name": "tweetIdHash",
					"type": "bytes32",
					"indexed": true,
					"internalType": "bytes32"
				},
				{
					"name": "finalStatus",
					"type": "uint8",
					"indexed": false,
					"internalType": "enum VeritasX.TweetStatus"
				},
				{
					"name": "tweetId",
					"type": "string",
					"indexed": false,
					"internalType": "string"
				}
			],
			"anonymous": false
		}
	]
