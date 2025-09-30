export type AppConfig = {
  chainId: number;
  networkName: string;
  rpcUrl: string;
  zethcAddress?: `0x${string}` | "";
  launchAddress?: `0x${string}` | "";
  factoryAddress: `0x${string}` | "";
  relayerAddress?: `0x${string}` | "";
  // Zama Relayer SDK (CDN UMD)
  sdkCdnBase?: string;         // e.g. https://cdn.zama.ai/relayer-sdk-js
  sdkVersion?: string;         // e.g. 0.1.0-9
  relayerUrl?: string;         // your relayer service URL, e.g. https://relayer.example.com
  gatewayChainId?: number;     // e.g. 55815 (example)
};

// Fill the deployed addresses here; or switch to env variables if needed
export const appConfig: AppConfig = {
  chainId: 11155111,
  networkName: "sepolia",
  rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/  key", // shared public RPC; replace with your own service if needed
  zethcAddress: "0x5E78fb61F973f462712c280DF0d73Bed63F91AB6",
  launchAddress: "0x95E8250c6cc42148d8D067C1AAF6b6d961be338f",
  factoryAddress: "0xc1d3344B16cDfc10bFDe73169daF9F817EA46f5F",    // LaunchpadFactory address
  sdkCdnBase: "https://cdn.zama.ai/relayer-sdk-js",
  sdkVersion: "0.2.0",
  relayerUrl: "https://relayer.testnet.zama.cloud",
  gatewayChainId: 55815,
};

export default appConfig;


