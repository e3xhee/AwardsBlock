import { apiGet, apiPost } from "../api/client";
import { walletState } from "../state/appState";
import {
  getDevEthereumProviderFromEnv,
  type DevWalletEnv,
} from "./devWalletProvider";

const viteEnv = import.meta.env ?? {};

export type EthereumProvider = {
  request<TResponse = unknown>(request: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<TResponse>;
};

export type AuthApi = {
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
  ): Promise<TResponse>;
};

type AuthNonceResponse = {
  nonce: {
    walletAddress: string;
    nonce: string;
    message: string;
    expiresAt: string;
  };
};

type AuthSessionResponse = {
  session: WalletSession;
};

export type WalletSession = {
  walletAddress: string;
  expiresAt: string;
};

const defaultAuthApi: AuthApi = {
  post: apiPost,
};

export async function authenticateWallet(
  provider = getBrowserEthereumProvider(),
  authApi = defaultAuthApi,
): Promise<WalletSession> {
  if (!provider) {
    throw new Error("WALLET_PROVIDER_UNAVAILABLE");
  }

  const accounts = await provider.request<string[]>({
    method: "eth_requestAccounts",
  });
  const walletAddress = accounts[0];

  if (!walletAddress) {
    throw new Error("WALLET_ACCOUNT_UNAVAILABLE");
  }

  const nonce = await authApi.post<
    AuthNonceResponse,
    { walletAddress: string }
  >("/auth/nonce", {
    walletAddress,
  });
  const signature = await provider.request<string>({
    method: "personal_sign",
    params: [nonce.nonce.message, nonce.nonce.walletAddress],
  });
  const session = await authApi.post<
    AuthSessionResponse,
    {
      walletAddress: string;
      nonce: string;
      signature: string;
    }
  >("/auth/session", {
    walletAddress: nonce.nonce.walletAddress,
    nonce: nonce.nonce.nonce,
    signature,
  });

  walletState.address = session.session.walletAddress;
  walletState.chainId = await readChainId(provider);

  return session.session;
}

export async function loadWalletSession(): Promise<WalletSession | null> {
  try {
    const response = await apiGet<AuthSessionResponse>("/auth/session");
    walletState.address = response.session.walletAddress;
    return response.session;
  } catch {
    walletState.address = null;
    walletState.chainId = null;
    return null;
  }
}

export function getBrowserEthereumProvider(): EthereumProvider | null {
  const ethereum = (globalThis as { ethereum?: EthereumProvider }).ethereum;
  return ethereum ?? getDevEthereumProviderFromEnv(viteEnv as DevWalletEnv);
}

async function readChainId(provider: EthereumProvider): Promise<number | null> {
  try {
    const chainId = await provider.request<string>({ method: "eth_chainId" });
    return Number.parseInt(chainId, 16);
  } catch {
    return null;
  }
}
