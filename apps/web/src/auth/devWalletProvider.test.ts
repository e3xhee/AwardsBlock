import { verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createDevEthereumProvider,
  getDevEthereumProviderFromEnv,
} from "./devWalletProvider";

const privateKey =
  "0x59c6995e998f97a5a004497e5da1622b90e371ad0c8b18d1cd7ecb100b5d6f83";
const account = privateKeyToAccount(privateKey);

if (
  createDevEthereumProvider({ enabled: false, privateKey, chainId: 31337 }) !==
  null
) {
  throw new Error("Expected disabled dev wallet provider to return null");
}

const provider = createDevEthereumProvider({
  enabled: true,
  privateKey,
  chainId: 31337,
});

if (!provider) {
  throw new Error("Expected enabled dev wallet provider");
}

const accounts = await provider.request<string[]>({
  method: "eth_requestAccounts",
});

if (accounts[0] !== account.address) {
  throw new Error("Expected dev wallet account derived from private key");
}

const chainId = await provider.request<string>({ method: "eth_chainId" });

if (chainId !== "0x7a69") {
  throw new Error("Expected dev wallet provider to expose configured chain id");
}

const message = "Sign in with AwardBlock test-nonce";
const signature = await provider.request<`0x${string}`>({
  method: "personal_sign",
  params: [message, account.address],
});

const validSignature = await verifyMessage({
  address: account.address,
  message,
  signature,
});

if (!validSignature) {
  throw new Error("Expected dev wallet provider to return a valid signature");
}

const firstTxHash = await provider.request<string>({
  method: "eth_sendTransaction",
  params: [{ from: account.address, to: account.address, data: "0x" }],
});
const secondTxHash = await provider.request<string>({
  method: "eth_sendTransaction",
  params: [{ from: account.address, to: account.address, data: "0x" }],
});

if (!/^0x[a-fA-F0-9]{64}$/.test(firstTxHash) || firstTxHash === secondTxHash) {
  throw new Error("Expected deterministic unique transaction hashes");
}

const receipt = await provider.request<{ blockNumber: string }>({
  method: "eth_getTransactionReceipt",
  params: [firstTxHash],
});

if (receipt.blockNumber !== "0x1") {
  throw new Error("Expected dev wallet transaction receipt block number");
}

const envProvider = getDevEthereumProviderFromEnv({
  VITE_ENABLE_DEV_WALLET: "true",
  VITE_DEV_WALLET_PRIVATE_KEY: privateKey,
  VITE_CHAIN_ID: "31337",
});

if (!envProvider) {
  throw new Error("Expected env-enabled dev wallet provider");
}

const envProviderChainId = await envProvider.request<string>({
  method: "eth_chainId",
});

if (envProviderChainId !== "0x7a69") {
  throw new Error("Expected env dev wallet provider to parse chain id");
}

if (
  getDevEthereumProviderFromEnv({
    VITE_ENABLE_DEV_WALLET: "false",
    VITE_DEV_WALLET_PRIVATE_KEY: privateKey,
    VITE_CHAIN_ID: "31337",
  }) !== null
) {
  throw new Error("Expected env-disabled dev wallet provider to return null");
}
