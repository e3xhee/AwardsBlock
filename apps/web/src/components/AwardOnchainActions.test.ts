import {
  executeAwardOnchainAction,
  renderAwardOnchainActions,
  type AwardOnchainActionApi,
  type OnchainAward
} from "./AwardOnchainActions";
import type { ContractWriteProvider } from "../blockchain/awardRegistry";

const award: OnchainAward = {
  id: "award-1",
  contractAwardId: "award-1",
  rewardTokenAddress: "0x2222222222222222222222222222222222222222",
  totalReward: "1000000000000000000",
  status: "ReadyToFund"
};

const html = renderAwardOnchainActions(award);

if (!html.includes("data-onchain-actions")) {
  throw new Error("Expected on-chain action panel root");
}

if (!html.includes('data-onchain-action="approve"')) {
  throw new Error("Expected approve action for ready-to-fund awards");
}

if (!html.includes('data-onchain-action="fund"')) {
  throw new Error("Expected fund action for ready-to-fund awards");
}

if (!html.includes("어워드 펀딩")) {
  throw new Error("Expected Korean fund action label");
}

if (
  !renderAwardOnchainActions({ ...award, status: "Funded" }).includes(
    'data-onchain-action="finalize"'
  )
) {
  throw new Error("Expected finalize action for funded awards");
}

if (!renderAwardOnchainActions({ ...award, status: "Funded" }).includes("어워드 확정")) {
  throw new Error("Expected Korean finalize action label");
}

if (renderAwardOnchainActions({ ...award, contractAwardId: null }).includes("data-onchain-action=\"")) {
  throw new Error("Expected missing contract award id to suppress actions");
}

const providerRequests: Array<{ method: string; params?: unknown }> = [];
const provider: ContractWriteProvider = {
  async request<TResponse = unknown>({
    method,
    params
  }: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) {
    providerRequests.push({ method, params });
    return "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as TResponse;
  }
};

const posts: Array<{ path: string; body: unknown }> = [];
const patches: Array<{ path: string; body: unknown }> = [];
const api: AwardOnchainActionApi = {
  async post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    posts.push({ path, body });
    return { transaction: { id: "transaction-1" } } as TResponse;
  },
  async patch<TResponse, TBody = unknown>(path: string, body?: TBody) {
    patches.push({ path, body });
    return { award: { id: "award-1" } } as TResponse;
  }
};

const result = await executeAwardOnchainAction({
  action: "fund",
  award,
  from: "0x0123456789abcdef0123456789abcdef01234567",
  registryAddress: "0x1111111111111111111111111111111111111111",
  provider,
  api
});

if (result.txHash !== "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb") {
  throw new Error("Expected fund transaction hash");
}

if (providerRequests[0]?.method !== "eth_sendTransaction") {
  throw new Error("Expected wallet transaction request");
}

if (posts[0]?.path !== "/awards/award-1/transactions") {
  throw new Error("Expected fund transaction record path");
}

if (
  JSON.stringify(posts[0]?.body) !==
  JSON.stringify({
    transactionType: "AwardFunded",
    walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
    txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  })
) {
  throw new Error("Expected fund transaction record payload");
}

if (
  JSON.stringify(patches[0]) !==
  JSON.stringify({
    path: "/awards/award-1",
    body: {
      fundTxHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      status: "Funded"
    }
  })
) {
  throw new Error("Expected funded award patch after fund transaction");
}

await executeAwardOnchainAction({
  action: "finalize",
  award: { ...award, status: "Funded" },
  from: "0x0123456789abcdef0123456789abcdef01234567",
  registryAddress: "0x1111111111111111111111111111111111111111",
  provider,
  api
});

if (
  JSON.stringify(patches[1]) !==
  JSON.stringify({
    path: "/awards/award-1",
    body: {
      finalizeTxHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      status: "Claiming"
    }
  })
) {
  throw new Error("Expected claiming award patch after finalize transaction");
}
