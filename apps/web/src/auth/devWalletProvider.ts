import { keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { EthereumProvider } from "./walletAuth";

export type DevWalletProviderConfig = {
  enabled: boolean;
  privateKey?: string;
  chainId: number;
};

export type DevWalletEnv = {
  VITE_ENABLE_DEV_WALLET?: string;
  VITE_DEV_WALLET_PRIVATE_KEY?: string;
  VITE_CHAIN_ID?: string | number;
};

export function getDevEthereumProviderFromEnv(
  env: DevWalletEnv,
): EthereumProvider | null {
  return createDevEthereumProvider({
    enabled: env.VITE_ENABLE_DEV_WALLET === "true",
    privateKey: env.VITE_DEV_WALLET_PRIVATE_KEY,
    chainId: Number(env.VITE_CHAIN_ID ?? 31337),
  });
}

export function createDevEthereumProvider(
  config: DevWalletProviderConfig,
): EthereumProvider | null {
  if (!config.enabled || !isHexPrivateKey(config.privateKey)) {
    return null;
  }

  const account = privateKeyToAccount(config.privateKey);
  let transactionCount = 0;

  return {
    async request<TResponse = unknown>({
      method,
      params,
    }: {
      method: string;
      params?: unknown[] | Record<string, unknown>;
    }) {
      if (method === "eth_requestAccounts" || method === "eth_accounts") {
        return [account.address] as TResponse;
      }

      if (method === "eth_chainId") {
        return `0x${config.chainId.toString(16)}` as TResponse;
      }

      if (method === "personal_sign") {
        const [message] = Array.isArray(params) ? params : [];

        if (typeof message !== "string") {
          throw new Error("DEV_WALLET_MESSAGE_REQUIRED");
        }

        return account.signMessage({ message }) as TResponse;
      }

      if (method === "eth_sendTransaction") {
        transactionCount += 1;
        return buildTransactionHash(transactionCount) as TResponse;
      }

      if (method === "eth_getTransactionReceipt") {
        const [txHash] = Array.isArray(params) ? params : [];
        const blockNumber = getReceiptBlockNumber(txHash);

        return { blockNumber } as TResponse;
      }

      throw new Error(`DEV_WALLET_UNSUPPORTED_METHOD:${method}`);
    },
  };
}

function buildTransactionHash(transactionCount: number): Hex {
  return keccak256(toBytes(`awardblock-dev-wallet:${transactionCount}`));
}

function getReceiptBlockNumber(txHash: unknown): Hex | null {
  if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return null;
  }

  return "0x1";
}

function isHexPrivateKey(value: string | undefined): value is Hex {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}
