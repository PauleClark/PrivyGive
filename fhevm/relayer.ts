// Browser-only utilities for Zama Relayer SDK
import { getAddress } from "viem";
import appConfig from "@/config/app.config";

export type RelayerInstance = {
  generateKeypair: () => { privateKey: string; publicKey: string };
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestampSec: string,
    durationDays: string,
  ) => {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    message: Record<string, unknown>;
  };
  userDecrypt: (
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signatureNo0x: string,
    contractAddresses: string[],
    signerAddress: string,
    startTimestampSec: string,
    durationDays: string,
  ) => Promise<Record<string, string>>;
  createEncryptedInput: (contractAddress: string, userAddress: string) => EncryptedInput;
};

export type EncryptedInput = {
  add64: (value: number | bigint) => EncryptedInput;
  add32: (value: number | bigint) => EncryptedInput;
  add16: (value: number | bigint) => EncryptedInput;
  add8: (value: number | bigint) => EncryptedInput;
  addBool: (value: boolean) => EncryptedInput;
  // Some SDK versions (protocol v0.7) require extraData in the input-proof payload
  encrypt: (options?: { extraData?: Record<string, unknown> }) => Promise<{ handles: string[]; inputProof: string }>;
};

export type RelayerSDK = {
  initSDK: () => Promise<void>;
  createInstance?: (config: Record<string, unknown>) => Promise<RelayerInstance>;
  SepoliaConfig?: Record<string, unknown>;
  version?: string;
};

type GlobalRelayerBag = { sdk?: RelayerSDK; instance?: RelayerInstance };

function detectSDKFromWindow(): RelayerSDK | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    fhevm?: RelayerSDK;
    relayerSDK?: RelayerSDK;
    zamaRelayer?: RelayerSDK;
    relayer?: RelayerSDK;
    __fhevm?: GlobalRelayerBag;
  };
  return (w.__fhevm?.sdk || w.fhevm || w.relayerSDK || w.zamaRelayer || w.relayer) ?? null;
}

export async function ensureRelayer(options?: { requireInstance?: boolean }): Promise<{ sdk: RelayerSDK; instance: RelayerInstance | null }> {
  if (typeof window === "undefined") throw new Error("Relayer only available in browser");
  const sdk = detectSDKFromWindow();
  if (!sdk) throw new Error("RelayerSDK not found");
  await sdk.initSDK();

  const g = window as unknown as { __fhevm?: GlobalRelayerBag & { cfgSig?: string } };
  const bag = g.__fhevm ?? {};
  let instance = bag.instance ?? null;
  const desiredSig = `${appConfig.relayerUrl}|${appConfig.gatewayChainId}`;
  const currentSig = (bag as unknown as { cfgSig?: string }).cfgSig;

  if ((options?.requireInstance ?? false) && (!instance || currentSig !== desiredSig)) {
    const w = window as unknown as { ethereum?: unknown };
    if (!w.ethereum) throw new Error("Ethereum wallet not found");
    if (!sdk.createInstance) throw new Error("SDK does not support createInstance");
    if (!appConfig.relayerUrl || !appConfig.gatewayChainId) {
      throw new Error("Missing relayer config: set relayerUrl and gatewayChainId in app.config.ts");
    }
    const config = {
      ...(sdk.SepoliaConfig || {}),
      network: w.ethereum,
      relayerUrl: appConfig.relayerUrl,
      gatewayChainId: appConfig.gatewayChainId,
      usePreset: "sepolia",
    } as Record<string, unknown>;
    instance = await sdk.createInstance(config);
    (window as unknown as { __fhevm?: GlobalRelayerBag & { cfgSig?: string } }).__fhevm = { sdk, instance, cfgSig: desiredSig };
  }

  return { sdk, instance };
}

async function signTypedDataV4(address: string, typedData: unknown): Promise<string> {
  const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } }).ethereum;
  if (!ethereum) throw new Error("Ethereum wallet not found");
  const json = JSON.stringify(typedData);
  const sig = await ethereum.request({ method: "eth_signTypedData_v4", params: [address, json] });
  return sig as string;
}



export async function encryptEuint64(
  contractAddress: string,
  userAddress: string,
  value: number | bigint,
  functionName: string = "contribute",
): Promise<{ data: string; proof: string }> {
  const { instance } = await ensureRelayer({ requireInstance: true });
  if (!instance) throw new Error("Relayer instance unavailable");

  try {
    const contractAddr = getAddress(contractAddress);
    const userAddr = getAddress(userAddress);
    console.log("Encryption context:", { contract: contractAddr, user: userAddr, value: typeof value === 'bigint' ? value.toString() : String(value) });
    const input = instance.createEncryptedInput(contractAddr, userAddr);
    input.add64(value);
    const extraData = {
      chainId: appConfig.chainId,
      gatewayChainId: appConfig.gatewayChainId,
      contractAddress: contractAddr,
      userAddress: userAddr,
      function: functionName,
      argTypes: ["euint64"],
    } as Record<string, unknown>;
    let encrypted: { handles: string[]; inputProof: string };
    try {

      encrypted = await (input.encrypt as (o: { extraData: Record<string, unknown> }) => Promise<{ handles: string[]; inputProof: string }>)({ extraData });
    } catch (err) {
      const msg = (err as Error)?.message || String(err);
      if (/missing field `?extraData`?/i.test(msg) || /Failed to parse the request body as JSON: missing field `?extraData`?/i.test(msg)) {
        throw new Error("Relayer request missing extraData, failed even with 0.7 format. Please ensure frontend uses Relayer SDK version ≥0.2.0 and relayer service is 0.7 compatible.");
      }

      try {
        encrypted = await (input.encrypt as () => Promise<{ handles: string[]; inputProof: string }>)();
      } catch (err2) {
        throw new Error(`Relayer encryption failed: ${(err2 as Error).message}`);
      }
    }
    
    console.log("Encryption result:", encrypted);
    
    if (!encrypted.handles || encrypted.handles.length === 0) {
      throw new Error("Invalid encryption result: missing handles");
    }
    
    const handle = encrypted.handles[0];
    const proof = encrypted.inputProof;
    
    let data: string;
    let inputProof: string;
    function uint8ArrayToHex(arr: Uint8Array): string {
      return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    function isUint8Array(obj: unknown): obj is Uint8Array {
      return obj instanceof Uint8Array;
    }
    if (typeof handle === 'string') {
      data = handle.startsWith('0x') ? handle : `0x${handle}`;
    } else if (typeof handle === 'object' && handle !== null && isUint8Array(handle)) {
      data = uint8ArrayToHex(handle);
    } else if (typeof handle === 'object' && handle !== null) {
      const handleObj = handle as { toString?: () => string };
      data = handleObj.toString ? handleObj.toString() : JSON.stringify(handle);
      if (!data.startsWith('0x')) data = `0x${data}`;
    } else {
      throw new Error(`Unsupported handle type: ${typeof handle}, value: ${handle}`);
    }
    
    if (typeof proof === 'string') {
      inputProof = proof.startsWith('0x') ? proof : `0x${proof}`;
    } else if (typeof proof === 'object' && proof !== null && isUint8Array(proof)) {
      inputProof = uint8ArrayToHex(proof);
    } else if (typeof proof === 'object' && proof !== null) {
      const proofObj = proof as { toString?: () => string };
      inputProof = proofObj.toString ? proofObj.toString() : JSON.stringify(proof);
      if (!inputProof.startsWith('0x')) inputProof = `0x${inputProof}`;
    } else {
      throw new Error(`Unsupported inputProof type: ${typeof proof}, value: ${proof}`);
    }
    
    console.log("Formatted encryption result:", { data, inputProof });
    
    return {
      data,
      proof: inputProof
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error(`Encryption failed: ${(error as Error).message}`);
  }
}

export async function userDecryptEuint64(contractAddress: string, ciphertextHandle: string): Promise<bigint> {
  const { instance } = await ensureRelayer({ requireInstance: true });
  if (!instance) throw new Error("Relayer instance unavailable");

  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } }).ethereum;
  if (!eth) throw new Error("Ethereum wallet not found");
  const accountsResponse = await eth.request({ method: "eth_requestAccounts" });
  const accounts = Array.isArray(accountsResponse) ? accountsResponse as string[] : [];
  if (!accounts || accounts.length === 0 || !accounts[0]) {
    throw new Error("Wallet address not found");
  }
  const rawUserAddress = accounts[0];

  const userAddress = getAddress(rawUserAddress);
  const contractAddr = getAddress(contractAddress);
  try {
    const keypair = instance.generateKeypair();
    const contractAddresses = [contractAddr];
    const handles = [ciphertextHandle];
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const duration = "1";
    
    const eip712Data = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      timestamp,
      duration
    );

    const signature = await signTypedDataV4(userAddress, {
      types: eip712Data.types,
      domain: eip712Data.domain,
      primaryType: "UserDecryptRequestVerification",
      message: eip712Data.message,
    });
    const handleContractPairs = handles.map((handle, index) => ({
      handle,
      contractAddress: contractAddresses[index] || contractAddr,
    }));

    const decryptionResults = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace(/^0x/i, ""),
      contractAddresses,
      userAddress,
      timestamp,
      duration
    );

    const decryptedValue = decryptionResults[ciphertextHandle];
    if (decryptedValue === undefined) {
      throw new Error("Decryption result is empty");
    }

    return BigInt(decryptedValue as string | number);
    
  } catch (error) {
    console.error("User decryption failed:", error);
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
}


export type OracleDecryptionResult = {
  plaintexts: string[];
  signatures: string[];
};

export async function fetchOracleResult(relayerBaseUrl: string, requestId: string): Promise<OracleDecryptionResult> {
  const url = `/api/oracle?requestId=${encodeURIComponent(requestId)}`;
  
  try {
    const res = await fetch(url, { 
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`API proxy error: ${res.status}, ${JSON.stringify(errorData)}`);
    }
    
    const data = await res.json();
    console.log("API proxy response:", data);
    
    if (!data || !Array.isArray(data.plaintexts) || !Array.isArray(data.signatures)) {
      throw new Error(`Invalid API proxy response format: ${JSON.stringify(data)}`);
    }
    
    return { plaintexts: data.plaintexts, signatures: data.signatures };
  } catch (error) {
    console.error("Failed to fetch decryption result via API proxy:", error);
    throw new Error(`Proxy request failed: ${(error as Error).message}`);
  }
}
