// 粘贴 LaunchpadFactory 的 ABI JSON 数组到此处
// 例如：export const LaunchpadFactoryAbi = [ ... ] as const;

export const LaunchpadFactoryAbi = [       {
  "inputs": [
    {
      "internalType": "address",
      "name": "_zeth",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "_relayer",
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
      "name": "creator",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "address",
      "name": "pool",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "address",
      "name": "zeth",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "string",
      "name": "projectName",
      "type": "string"
    },
    {
      "indexed": false,
      "internalType": "address",
      "name": "saleToken",
      "type": "address"
    }
  ],
  "name": "PoolCreated",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "creator",
      "type": "address"
    },
    {
      "indexed": true,
      "internalType": "address",
      "name": "pool",
      "type": "address"
    }
  ],
  "name": "PoolOwnershipClaimed",
  "type": "event"
},
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "name": "allPools",
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
  "name": "allPoolsLength",
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
      "name": "pool",
      "type": "address"
    }
  ],
  "name": "claimPoolOwnership",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "string",
      "name": "projectName",
      "type": "string"
    },
    {
      "internalType": "uint256",
      "name": "priceNumerator",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "priceDenominator",
      "type": "uint256"
    },
    {
      "internalType": "uint64",
      "name": "saleStart",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "saleEnd",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "minPerAddress",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "maxPerAddress",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "hardCapPublic",
      "type": "uint64"
    },
    {
      "internalType": "bool",
      "name": "startNow",
      "type": "bool"
    }
  ],
  "name": "createAndInitPool",
  "outputs": [
    {
      "internalType": "address",
      "name": "pool",
      "type": "address"
    }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "string",
      "name": "projectName",
      "type": "string"
    }
  ],
  "name": "createPoolWithDefaults",
  "outputs": [
    {
      "internalType": "address",
      "name": "pool",
      "type": "address"
    }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "name": "creatorPools",
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
  "name": "defaultRelayer",
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
  "name": "defaultZeth",
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
      "name": "creator",
      "type": "address"
    }
  ],
  "name": "poolsOf",
  "outputs": [
    {
      "internalType": "address[]",
      "name": "",
      "type": "address[]"
    }
  ],
  "stateMutability": "view",
  "type": "function"
}] as const;
export default LaunchpadFactoryAbi;


