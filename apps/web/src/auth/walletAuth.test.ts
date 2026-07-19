import {
  authenticateWallet,
  type AuthApi,
  type EthereumProvider
} from "./walletAuth";
import { walletState } from "../state/appState";

const requests: Array<{ method: string; params?: unknown }> = [];
const posts: Array<{ path: string; body: unknown }> = [];

const provider: EthereumProvider = {
  async request<TResponse = unknown>({
    method,
    params
  }: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) {
    requests.push({ method, params });

    if (method === "eth_requestAccounts") {
      return ["0x0123456789abcdef0123456789abcdef01234567"] as TResponse;
    }

    if (method === "personal_sign") {
      return "0xsignature" as TResponse;
    }

    if (method === "eth_chainId") {
      return "0x1389" as TResponse;
    }

    throw new Error(`Unexpected provider method ${method}`);
  }
};

const authApi: AuthApi = {
  async post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    posts.push({ path, body });

    if (path === "/auth/nonce") {
      return {
        nonce: {
          walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
          nonce: "nonce-1",
          message: "Sign in with AwardBlock nonce-1",
          expiresAt: "2026-08-01T00:00:00.000Z"
        }
      } as TResponse;
    }

    if (path === "/auth/session") {
      return {
        session: {
          walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
          expiresAt: "2026-08-08T00:00:00.000Z"
        }
      } as TResponse;
    }

    throw new Error(`Unexpected API path ${path}`);
  }
};

const session = await authenticateWallet(provider, authApi);

if (requests[0]?.method !== "eth_requestAccounts") {
  throw new Error("Expected account request before signing");
}

if (requests[1]?.method !== "personal_sign") {
  throw new Error("Expected personal_sign request");
}

if (JSON.stringify(requests[1]?.params) !== JSON.stringify(["Sign in with AwardBlock nonce-1", "0x0123456789abcdef0123456789abcdef01234567"])) {
  throw new Error("Expected signature request to use nonce message and wallet address");
}

if (posts[0]?.path !== "/auth/nonce") {
  throw new Error("Expected nonce request");
}

if (posts[1]?.path !== "/auth/session") {
  throw new Error("Expected session request");
}

if (session.walletAddress !== "0x0123456789abcdef0123456789abcdef01234567") {
  throw new Error("Expected authenticated session wallet");
}

if (walletState.address !== "0x0123456789abcdef0123456789abcdef01234567") {
  throw new Error("Expected wallet state address update");
}

if (walletState.chainId !== 5001) {
  throw new Error("Expected parsed chain id");
}
