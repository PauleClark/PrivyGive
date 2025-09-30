"use client";

import { useEffect } from "react";
import appConfig from "@/config/app.config";

type RelayerSDK = {
  initSDK: () => Promise<void>;
  createInstance: (config: Record<string, unknown>) => Promise<unknown>;
  SepoliaConfig?: Record<string, unknown>;
  version?: string;
};

declare global {
  interface Window {
    fhevm?: RelayerSDK;
    relayerSDK?: RelayerSDK;
    zamaRelayer?: RelayerSDK;
    relayer?: RelayerSDK;
    __fhevm?: { sdk: RelayerSDK; instance: unknown };
  }
}

let initDone = false;
let initPromise: Promise<void> | null = null;
let loadingScript = false;

export default function RelayerSetup() {
  useEffect(() => {
    if (initDone) return;
    const url = `${appConfig.sdkCdnBase}/${appConfig.sdkVersion}/relayer-sdk-js.umd.cjs`;
    const key = "relayer-sdk-js-umd";
    const existing = document.getElementById(key) as HTMLScriptElement | null;

    const isRelayerSDK = (obj: unknown): obj is RelayerSDK => {
      if (!obj || typeof obj !== "object") return false;
      const o = obj as Record<string, unknown>;
      return typeof o.initSDK === "function" && typeof o.createInstance === "function";
    };

    const resolveSdk = (): RelayerSDK | null => {
      const w = window;
      const candidates = [w.fhevm, w.relayerSDK, w.zamaRelayer, w.relayer];
      for (const c of candidates) {
        if (isRelayerSDK(c)) return c;
      }
      const entries = Object.entries(w as unknown as Record<string, unknown>);
      for (const [, value] of entries) {
        if (isRelayerSDK(value)) return value;
      }
      return null;
    };

    const doInit = async () => {
      if (initPromise) return initPromise;
      initPromise = (async () => {
        try {
          let sdk: RelayerSDK | null = null;
          for (let i = 0; i < 20; i++) {
            sdk = resolveSdk();
            if (sdk) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          if (!sdk) throw new Error("RelayerSDK global object not found");
          console.log("crossOriginIsolated:", window.crossOriginIsolated);
          await sdk.initSDK();
          console.log("RelayerSDK initialized successfully", { version: sdk?.version || "unknown" });
          if (!window.__fhevm) {
            window.__fhevm = { sdk, instance: undefined as unknown };
          } else {
            window.__fhevm.sdk = sdk;
          }
          if (!window.__fhevm) {
            window.__fhevm = { sdk, instance: undefined as unknown };
          } else {
            window.__fhevm.sdk = sdk;
          }
          console.log("RelayerSDK loaded, instance will be created when needed");
          initDone = true;
        } catch (e) {
          console.error("RelayerSDK initialization failed", e);
        }
      })();
      return initPromise;
    };

    if (existing) {
      doInit();
      return;
    }

    if (!loadingScript) {
      loadingScript = true;
      const s = document.createElement("script");
      s.id = key;
      s.src = url;
      s.type = "text/javascript";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = () => {
        console.log("RelayerSDK UMD loaded");
        doInit();
      };
      s.onerror = (e: Event | string) => {
        console.error("RelayerSDK UMD loading failed", e);
        loadingScript = false;
      };
      document.head.appendChild(s);
    } else {
      doInit();
    }
  }, []);
  return null;
}


