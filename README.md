# PrivyGive

A decentralized crowdfunding, donation, tipping, and sponsorship platform with **privacy-preserving contributions**. Built on **Zama fhEVM**, PrivyGive allows users to choose between **public contributions** or **secret contributions** with fully encrypted amounts.

---

## Features

- **Complete Privacy Protection** - End-to-end encrypted contribution amounts  
- **Flexible Contribution Options** - Choose between public or secret contributions  
- **Secure & Trustless** - Powered by Zama fhEVM homomorphic encryption  
- **Decentralized** - No centralized servers required  
- **Multi-Scenario Support** - Perfect for crowdfunding, donations, tipping, and sponsorship campaigns

---

## Smart Contract Architecture

### 1. **ConfidentialZETH.sol** - Confidential Token Contract

A confidential ERC-20 token implementation based on fhEVM.

**Core Features:**
- Uses `euint64` (encrypted unsigned integer 64-bit) to store balances and allowances
- Fully confidential token transfers through homomorphic encryption
- Supports `mint` and `burn` functions for ETH ↔ zETH conversion
- Access control via `FHE.allow()` and `FHE.allowThis()` for encrypted data permissions

**Key Functions:**
- `encryptedTransfer()` - Transfer encrypted amounts privately
- `encryptedApprove()` - Approve encrypted spending allowances
- `mint()` / `burnFrom()` - Bridge between ETH and zETH

---

### 2. **FHEswap.sol** - Confidential Swap Contract

Implements bidirectional **ETH ↔ Encrypted zETH** conversion.

**Deposit Functionality:**
- Users deposit ETH, contract mints equivalent zETH with encrypted balance

**Withdrawal Functionality (Zama Gateway Decryption Service):**
- `FHE.requestDecryption()` - Request asynchronous decryption
- `fulfillSwap()` - Gateway callback function that verifies KMS signatures (`checkSignatures`)
- Implements reentrancy guard and emergency recovery mechanism (24-hour timeout protection)

**Privacy Flow:**  
User submits encrypted amount → Contract requests decryption → Gateway verifies and returns plaintext → Swap completed

---

### 3. **Pool.sol** - Confidential Funding Pool Contract

Fully confidential crowdfunding/donation pool.

**Confidential Ledger:**
- `_userContribE` - User's encrypted contribution amount
- `_raisedE` - Pool's encrypted total raised amount
- `_hardCapE` - Encrypted hard cap (funding limit)
- `_paidOutE` - Encrypted withdrawn amount

**Contribution Methods:**
- Supports ETH (automatically converted to euint64) or encrypted zETH
- Uses `externalEuint64 + inputProof` to submit encrypted contribution proofs
- Homomorphically accumulates to individual and total pool balances

**Privacy Features:**
- Individual contributions only visible to the contributor (`require(user == msg.sender)`)
- Fine-grained access control via `FHE.allow()`
- Supports encrypted notes for additional metadata
- Project owners and others cannot see specific donation amounts

**Settlement Mechanism:**
- **Relayer Role:** Trusted off-chain computation node
- ECDSA signature verification ensures relayer honesty
- `claimWithAuth()` - Users self-claim token rewards with relayer signature

---

### 4. **Factory.sol** - Pool Factory Contract

Deploys and manages confidential funding pools.

**Standardized Deployment:**
- Pre-configured default zETH and relayer addresses
- One-click creation of new crowdfunding/donation projects

**Pool Management:**
- Tracks all pools and creator pool lists
- Supports batch queries and indexing

**Ownership Transfer:**
- Project creators can claim pool ownership after completion
- Flexible management of raised funds and remaining tokens

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** or **yarn** or **pnpm**
- **Git**
- **MetaMask** or compatible Web3 wallet
- Access to Zama fhEVM testnet (Sepolia)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/privygive.git
   cd privygive
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment setup:**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_ZETH_ADDRESS=0x...
   NEXT_PUBLIC_FHESWAP_ADDRESS=0x...
   NEXT_PUBLIC_FACTORY_ADDRESS=0x...
   NEXT_PUBLIC_RELAYER_ADDRESS=0x...
   NEXT_PUBLIC_CHAIN_ID=9000
   ```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

---

## Smart Contract Deployment

### Prerequisites

- Hardhat or Foundry installed
- Private key with testnet ETH (Sepolia)
- RPC endpoint for Zama fhEVM testnet

### Deploy Contracts

1. **Deploy ConfidentialZETH:**
   ```bash
   npx hardhat run scripts/deployAll.ts --network sepolia
   ```

2. **Contracts will be deployed in order:**
   - ConfidentialZETH.sol
   - FHEswap.sol
   - Factory.sol

3. **Update contract addresses** in `config/app.config.ts` and `.env.local`

---

## Running the Relayer

The relayer is responsible for fulfilling decryption requests:

```bash
npm run relayer:fulfill
```

**Relayer Configuration:**
- Update relayer private key in environment variables
- Configure monitoring interval for pending requests
- Ensure sufficient gas for transaction execution

---

## Testing

### Run Tests

```bash
npm run test
```

### Test Coverage

```bash
npm run coverage
```

---

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Blockchain:** Ethereum (Sepolia), Zama fhEVM
- **Smart Contracts:** Solidity ^0.8.24
- **Encryption:** @fhevm/solidity (Zama Protocol)
- **Web3 Libraries:** Ethers.js 6, Viem 2
- **Wallet Integration:** MetaMask, WalletConnect

---

## Security

- All encrypted operations use Zama's fhEVM library
- Reentrancy protection on all state-changing functions
- Access control via `onlyOwner` and `onlyRelayer` modifiers
- KMS signature verification for decryption callbacks
- Emergency recovery mechanisms for failed transactions

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Resources

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## Contact & Support

For questions, suggestions, or support:
- Open an issue on GitHub
- Contact the development team

---

**Built with Zama fhEVM**