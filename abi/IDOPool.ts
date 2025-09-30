// 粘贴 IDOPool 的 ABI JSON 数组到此处
// 例如：export const IDOPoolAbi = [ ... ] as const;

export const IDOPoolAbi = [       {
  "inputs": [
    {
      "internalType": "address",
      "name": "zethcAddress",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "initialRelayer",
      "type": "address"
    }
  ],
  "stateMutability": "nonpayable",
  "type": "constructor"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "user",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "uint256",
      "name": "amount",
      "type": "uint256"
    }
  ],
  "name": "Claimed",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "user",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "uint256",
      "name": "amountWei",
      "type": "uint256"
    }
  ],
  "name": "ContributedEth",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "user",
      "type": "address"
    }
  ],
  "name": "ContributedZethc",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": false,
      "internalType": "uint256",
      "name": "saleSupplyAtEnd",
      "type": "uint256"
    }
  ],
  "name": "Finalized",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [],
  "name": "HardCapSet",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "previousOwner",
      "type": "address"
    },
    {
      "indexed": true,
      "internalType": "address",
      "name": "newOwner",
      "type": "address"
    }
  ],
  "name": "OwnershipTransferred",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "to",
      "type": "address"
    }
  ],
  "name": "PayoutAllFulfilled",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "to",
      "type": "address"
    }
  ],
  "name": "PayoutAllRequested",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "relayer",
      "type": "address"
    }
  ],
  "name": "RelayerUpdated",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "user",
      "type": "address"
    }
  ],
  "name": "UserCapsSet",
  "type": "event"
},
{
  "inputs": [
    {
      "internalType": "uint64",
      "name": "contribPlain",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "raisedPlain",
      "type": "uint64"
    },
    {
      "internalType": "bytes",
      "name": "signature",
      "type": "bytes"
    }
  ],
  "name": "claimWithAuth",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    }
  ],
  "name": "claimedTokens",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "externalEuint64",
      "name": "encryptedAmount",
      "type": "bytes32"
    },
    {
      "internalType": "bytes",
      "name": "proof",
      "type": "bytes"
    },
    {
      "internalType": "externalEuint64[]",
      "name": "noteParts",
      "type": "bytes32[]"
    },
    {
      "internalType": "bytes[]",
      "name": "noteProofs",
      "type": "bytes[]"
    }
  ],
  "name": "contribute",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "movedE",
      "type": "bytes32"
    }
  ],
  "stateMutability": "payable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "amount",
      "type": "uint256"
    }
  ],
  "name": "depositSaleToken",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "encryptedHardCap",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "encryptedNoteLength",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "i",
      "type": "uint256"
    }
  ],
  "name": "encryptedNotePart",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "encryptedPaidOut",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "encryptedRaised",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    }
  ],
  "name": "encryptedUserContrib",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    }
  ],
  "name": "encryptedUserMax",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    }
  ],
  "name": "encryptedUserMin",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    }
  ],
  "name": "encryptedUserNoteLength",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "i",
      "type": "uint256"
    }
  ],
  "name": "encryptedUserNotePart",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "",
      "type": "bytes32"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "finalizeSettlement",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "finalized",
  "outputs": [
    {
      "internalType": "bool",
      "name": "",
      "type": "bool"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "amountToken",
      "type": "uint256"
    }
  ],
  "name": "fulfillClaim",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "externalEuint64",
      "name": "encryptedAmount",
      "type": "bytes32"
    },
    {
      "internalType": "bytes",
      "name": "proof",
      "type": "bytes"
    }
  ],
  "name": "fulfillPayoutAll",
  "outputs": [
    {
      "internalType": "euint64",
      "name": "moved",
      "type": "bytes32"
    }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "viewer",
      "type": "address"
    }
  ],
  "name": "grantHardCapView",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "viewer",
      "type": "address"
    }
  ],
  "name": "grantPaidOutView",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "viewer",
      "type": "address"
    }
  ],
  "name": "grantRaisedView",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "hardCapEncryptedMode",
  "outputs": [
    {
      "internalType": "bool",
      "name": "",
      "type": "bool"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "hardCapPublic",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "maxPerAddress",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    }
  ],
  "name": "maxPerAddressOverride",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "minPerAddress",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    }
  ],
  "name": "minPerAddressOverride",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "owner",
  "outputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "payoutRequested",
  "outputs": [
    {
      "internalType": "bool",
      "name": "",
      "type": "bool"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "payoutTo",
  "outputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "priceDenominator",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "priceNumerator",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "projectName",
  "outputs": [
    {
      "internalType": "string",
      "name": "",
      "type": "string"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "raisedEthPublic",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "refreshMyView",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "relayer",
  "outputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "to",
      "type": "address"
    }
  ],
  "name": "requestPayoutAll",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "saleEnd",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "saleStart",
  "outputs": [
    {
      "internalType": "uint64",
      "name": "",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "saleSupplyAtEnd",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "saleToken",
  "outputs": [
    {
      "internalType": "contract IERC20",
      "name": "",
      "type": "address"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "uint64",
      "name": "_minPerAddress",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "_maxPerAddress",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "_hardCapPublic",
      "type": "uint64"
    }
  ],
  "name": "setCapsPublic",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "externalEuint64[]",
      "name": "parts",
      "type": "bytes32[]"
    },
    {
      "internalType": "bytes[]",
      "name": "proofs",
      "type": "bytes[]"
    }
  ],
  "name": "setEncryptedNote",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "externalEuint64",
      "name": "cap",
      "type": "bytes32"
    },
    {
      "internalType": "bytes",
      "name": "proof",
      "type": "bytes"
    }
  ],
  "name": "setHardCap",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "string",
      "name": "name_",
      "type": "string"
    },
    {
      "internalType": "address",
      "name": "saleToken_",
      "type": "address"
    }
  ],
  "name": "setPublicMeta",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "newRelayer",
      "type": "address"
    }
  ],
  "name": "setRelayer",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "_priceNumerator",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "_priceDenominator",
      "type": "uint256"
    },
    {
      "internalType": "uint64",
      "name": "_start",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "_end",
      "type": "uint64"
    }
  ],
  "name": "setSaleParams",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    },
    {
      "internalType": "externalEuint64",
      "name": "minCap",
      "type": "bytes32"
    },
    {
      "internalType": "bytes",
      "name": "minProof",
      "type": "bytes"
    },
    {
      "internalType": "externalEuint64",
      "name": "maxCap",
      "type": "bytes32"
    },
    {
      "internalType": "bytes",
      "name": "maxProof",
      "type": "bytes"
    }
  ],
  "name": "setUserCaps",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "user",
      "type": "address"
    },
    {
      "internalType": "uint64",
      "name": "minCap",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "maxCap",
      "type": "uint64"
    }
  ],
  "name": "setUserCapsPublic",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "newOwner",
      "type": "address"
    }
  ],
  "name": "transferOwnership",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "to",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "amount",
      "type": "uint256"
    }
  ],
  "name": "withdrawUnsold",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "zethc",
  "outputs": [
    {
      "internalType": "contract IConfidentialZETH",
      "name": "",
      "type": "address"
    }
  ],
  "stateMutability": "view",
  "type": "function"
}] as const;
export default IDOPoolAbi;


