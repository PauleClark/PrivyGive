#!/usr/bin/env node
import { ethers } from "ethers";

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function usage() {
  console.log(
    "Usage: node scripts/fulfillSwap.mjs --rpc <RPC_URL> --pk <PRIVATE_KEY> --contract <CONTRACT_ADDRESS> --request <REQUEST_ID> --amount <UINT64> --sigs <hex1,hex2,...>"
  );
  console.log("Notes: signatures and amount must come from Zama Gateway decryption result; amount is uint64.");
}

async function main() {
  const rpc = getArg("--rpc") || process.env.RPC_URL;
  const pk = getArg("--pk") || process.env.PRIVATE_KEY;
  const contractAddress = getArg("--contract") || process.env.CONTRACT_ADDRESS;
  const requestIdStr = getArg("--request") || process.env.REQUEST_ID;
  const amountStr = getArg("--amount") || process.env.AMOUNT_UINT64;
  const sigsStr = getArg("--sigs") || process.env.SIGNATURES_CSV;

  if (!rpc || !pk || !contractAddress || !requestIdStr || !amountStr || !sigsStr) {
    usage();
    process.exit(1);
  }

  let requestId;
  let amount;
  try {
    requestId = BigInt(requestIdStr);
  } catch {
    throw new Error("REQUEST_ID must be an integer");
  }
  try {
    amount = BigInt(amountStr);
  } catch {
    throw new Error("AMOUNT_UINT64 must be an integer");
  }
  if (amount < 0n || amount > (1n << 64n) - 1n) {
    throw new Error("amount exceeds uint64 range");
  }

  const signatures = sigsStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.startsWith("0x") ? s : `0x${s}`));
  if (signatures.length === 0) throw new Error("Missing signatures");

  let address;
  try {
    address = ethers.getAddress(contractAddress);
  } catch {
    throw new Error("Invalid CONTRACT_ADDRESS");
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  const abi = [
    {
      inputs: [
        { internalType: "uint256", name: "requestId", type: "uint256" },
        { internalType: "uint64", name: "amountWei", type: "uint64" },
        { internalType: "bytes[]", name: "signatures", type: "bytes[]" },
      ],
      name: "fulfillSwap",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const contract = new ethers.Contract(address, abi, wallet);

  console.log("Sending fulfillSwap...", {
    contract: address,
    from: await wallet.getAddress(),
    requestId: requestId.toString(),
    amount: amount.toString(),
    signaturesCount: signatures.length,
  });

  try {
    const tx = await contract.fulfillSwap(requestId, amount, signatures);
    console.log("tx:", tx.hash);
    const receipt = await tx.wait();
    console.log("status:", receipt.status);
  } catch (err) {
    console.error("fulfillSwap failed:", err);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


