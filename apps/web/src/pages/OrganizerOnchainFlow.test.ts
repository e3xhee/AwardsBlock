import { decodeFunctionData } from "viem";
import {
  createOrganizerAwardSetup,
  type OrganizerAwardDraft,
} from "./OrganizerPage";
import {
  awardRegistryAbi,
  buildAwardContractId,
  type ContractWriteProvider,
  type ContractTransactionRequest,
} from "../blockchain/awardRegistry";

const organizer = "0x0123456789abcdef0123456789abcdef01234567";
const registryAddress = "0x1111111111111111111111111111111111111111";
const recipient = "0x3333333333333333333333333333333333333333";
const rewardToken = "0x2222222222222222222222222222222222222222";
const createTxHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const setRecipientsTxHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function stringifyForTest(value: unknown): string {
  return JSON.stringify(value, (_key, candidate) =>
    typeof candidate === "bigint" ? `${candidate.toString()}n` : candidate,
  );
}

const draft: OrganizerAwardDraft = {
  eventName: "Seoul Demo Day",
  eventDescription: "Demo day for builder award submissions",
  eventStartDate: "2026-08-01T09:00:00.000Z",
  eventEndDate: "2026-08-01T18:00:00.000Z",
  eventLocation: "Seoul",
  eventOfficialUrl: "https://awardblock.example/events/seoul-demo-day",
  projectName: "ProofBoard",
  projectTagline: "Verifiable award submissions",
  projectDescription: "A project that makes award review traceable.",
  projectProblem: "",
  projectSolution: "Teams submit canonical award proof.",
  projectGithubUrl: "https://github.com/example/proofboard",
  projectDemoUrl: "",
  awardTitle: "Best Product",
  awardRank: "1st",
  awardReason: "The team delivered the clearest user-facing award flow.",
  judgingSummary: "Strong product thinking and complete demo.",
  rewardTokenAddress: rewardToken,
  rewardTokenSymbol: "mUSDC",
  rewardTokenDecimals: "6",
  totalReward: "1000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
  metadataUri: "ipfs://awardblock/best-product",
  metadataHash: "",
  recipientName: "Ada Lee",
  recipientEmail: "ada@example.com",
  recipientWalletAddress: recipient,
  recipientAllocation: "600000",
  inviteExpiresAt: "2026-08-15T00:00:00.000Z",
};

type Operation =
  | { type: "api.post"; path: string; body: unknown }
  | { type: "api.patch"; path: string; body: unknown }
  | { type: "wallet.tx"; request: ContractTransactionRequest };

const operations: Operation[] = [];
const txHashes = [createTxHash, setRecipientsTxHash];

const provider: ContractWriteProvider = {
  async request<TResponse = unknown>({
    method,
    params,
  }: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) {
    if (method !== "eth_sendTransaction" || !Array.isArray(params)) {
      throw new Error("Expected eth_sendTransaction wallet request");
    }

    operations.push({
      type: "wallet.tx",
      request: params[0] as ContractTransactionRequest,
    });

    return txHashes[
      operations.filter((operation) => operation.type === "wallet.tx").length -
        1
    ] as TResponse;
  },
};

const api = {
  async post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    operations.push({ type: "api.post", path, body });

    if (path === "/events") {
      return { event: { id: "event-1", name: draft.eventName } } as TResponse;
    }

    if (path === "/events/event-1/projects") {
      return {
        project: { id: "project-1", name: draft.projectName },
      } as TResponse;
    }

    if (path === "/projects/project-1/awards") {
      return { award: { id: "award-1", title: draft.awardTitle } } as TResponse;
    }

    if (path === "/awards/award-1/members") {
      return {
        member: {
          id: "member-1",
          displayName: draft.recipientName,
          walletAddress: recipient,
          allocation: draft.recipientAllocation,
        },
      } as TResponse;
    }

    if (path === "/award-members/member-1/claim-invites") {
      return {
        invite: { id: "invite-1", token: "invite-token-1" },
      } as TResponse;
    }

    if (path === "/awards/award-1/transactions") {
      return { transaction: { id: "transaction-1" } } as TResponse;
    }

    throw new Error(`Unexpected POST ${path}`);
  },
  async patch<TResponse, TBody = unknown>(path: string, body?: TBody) {
    operations.push({ type: "api.patch", path, body });
    return { award: { id: "award-1" } } as TResponse;
  },
};

const result = await createOrganizerAwardSetup(draft, () => undefined, {
  api,
  provider,
  from: organizer,
  registryAddress,
});

const operationLabels = operations.map((operation) =>
  operation.type === "wallet.tx"
    ? decodeFunctionData({
        abi: awardRegistryAbi,
        data: operation.request.data,
      }).functionName
    : `${operation.type}:${operation.path}`,
);

const expectedOperationLabels = [
  "api.post:/events",
  "api.post:/events/event-1/projects",
  "api.post:/projects/project-1/awards",
  "api.post:/awards/award-1/members",
  "api.post:/award-members/member-1/claim-invites",
  "createAward",
  "setRecipients",
  "api.patch:/awards/award-1",
  "api.post:/awards/award-1/transactions",
];

if (
  JSON.stringify(operationLabels) !== JSON.stringify(expectedOperationLabels)
) {
  throw new Error(
    `Expected organizer on-chain operation order ${JSON.stringify(
      expectedOperationLabels,
    )}, got ${JSON.stringify(operationLabels)}`,
  );
}

const [createAwardOperation, setRecipientsOperation] = operations.filter(
  (operation): operation is Extract<Operation, { type: "wallet.tx" }> =>
    operation.type === "wallet.tx",
);

if (!createAwardOperation || !setRecipientsOperation) {
  throw new Error("Expected createAward and setRecipients wallet operations");
}

if (createAwardOperation.request.to !== registryAddress) {
  throw new Error("Expected createAward to target the configured Registry");
}

const decodedCreateAward = decodeFunctionData({
  abi: awardRegistryAbi,
  data: createAwardOperation.request.data,
});

if (decodedCreateAward.functionName !== "createAward") {
  throw new Error("Expected first wallet transaction to call createAward");
}

if (
  stringifyForTest(decodedCreateAward.args) !==
  stringifyForTest([
    buildAwardContractId("award-1"),
    buildAwardContractId("event-1"),
    buildAwardContractId("project-1"),
    draft.metadataUri,
    buildAwardContractId("award-1:metadata"),
    rewardToken,
    1785628800n,
    1788220800n,
  ])
) {
  throw new Error("Expected createAward payload to match organizer draft");
}

const decodedSetRecipients = decodeFunctionData({
  abi: awardRegistryAbi,
  data: setRecipientsOperation.request.data,
});

if (decodedSetRecipients.functionName !== "setRecipients") {
  throw new Error("Expected second wallet transaction to call setRecipients");
}

if (
  stringifyForTest(decodedSetRecipients.args) !==
  stringifyForTest([buildAwardContractId("award-1"), [recipient], [600000n]])
) {
  throw new Error(
    "Expected setRecipients payload to match recipient allocation",
  );
}

const awardPatch = operations[7];

if (
  JSON.stringify(awardPatch) !==
  JSON.stringify({
    type: "api.patch",
    path: "/awards/award-1",
    body: {
      contractAwardId: buildAwardContractId("award-1"),
      createTxHash,
      status: "ReadyToFund",
    },
  })
) {
  throw new Error(
    "Expected award patch after setRecipients to save on-chain state",
  );
}

const transactionRecord = operations[8];

if (
  JSON.stringify(transactionRecord) !==
  JSON.stringify({
    type: "api.post",
    path: "/awards/award-1/transactions",
    body: {
      transactionType: "AwardRegistered",
      walletAddress: organizer,
      txHash: createTxHash,
    },
  })
) {
  throw new Error("Expected transaction record after award patch");
}

if (result.createTxHash !== createTxHash) {
  throw new Error("Expected result to expose createAward transaction hash");
}

if (result.setRecipientsTxHash !== setRecipientsTxHash) {
  throw new Error("Expected result to expose setRecipients transaction hash");
}

const failedOperations: Operation[] = [];
const failingProvider: ContractWriteProvider = {
  async request<TResponse = unknown>({
    method,
    params,
  }: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) {
    if (method !== "eth_sendTransaction" || !Array.isArray(params)) {
      throw new Error("Expected eth_sendTransaction wallet request");
    }

    failedOperations.push({
      type: "wallet.tx",
      request: params[0] as ContractTransactionRequest,
    });

    const walletRequestCount = failedOperations.filter(
      (operation) => operation.type === "wallet.tx",
    ).length;

    if (walletRequestCount === 2) {
      throw new Error("SET_RECIPIENTS_REJECTED");
    }

    return createTxHash as TResponse;
  },
};

const failingApi = {
  async post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    failedOperations.push({ type: "api.post", path, body });

    if (path === "/events") {
      return { event: { id: "event-1", name: draft.eventName } } as TResponse;
    }

    if (path === "/events/event-1/projects") {
      return {
        project: { id: "project-1", name: draft.projectName },
      } as TResponse;
    }

    if (path === "/projects/project-1/awards") {
      return { award: { id: "award-1", title: draft.awardTitle } } as TResponse;
    }

    if (path === "/awards/award-1/members") {
      return {
        member: {
          id: "member-1",
          displayName: draft.recipientName,
          walletAddress: recipient,
          allocation: draft.recipientAllocation,
        },
      } as TResponse;
    }

    if (path === "/award-members/member-1/claim-invites") {
      return {
        invite: { id: "invite-1", token: "invite-token-1" },
      } as TResponse;
    }

    throw new Error(`Unexpected POST ${path}`);
  },
  async patch<TResponse, TBody = unknown>(path: string, body?: TBody) {
    failedOperations.push({ type: "api.patch", path, body });
    return { award: { id: "award-1" } } as TResponse;
  },
};

let setRecipientsFailure: Error | null = null;

try {
  await createOrganizerAwardSetup(draft, () => undefined, {
    api: failingApi,
    provider: failingProvider,
    from: organizer,
    registryAddress,
  });
} catch (error) {
  setRecipientsFailure = error as Error;
}

if (setRecipientsFailure?.message !== "SET_RECIPIENTS_FAILED") {
  throw new Error("Expected setRecipients failure to reject organizer setup");
}

const failedOperationLabels = failedOperations.map((operation) =>
  operation.type === "wallet.tx"
    ? decodeFunctionData({
        abi: awardRegistryAbi,
        data: operation.request.data,
      }).functionName
    : `${operation.type}:${operation.path}`,
);

if (
  JSON.stringify(failedOperationLabels) !==
  JSON.stringify([
    "api.post:/events",
    "api.post:/events/event-1/projects",
    "api.post:/projects/project-1/awards",
    "api.post:/awards/award-1/members",
    "api.post:/award-members/member-1/claim-invites",
    "createAward",
    "setRecipients",
  ])
) {
  throw new Error(
    `Expected failed organizer setup to stop before DB on-chain writes, got ${JSON.stringify(
      failedOperationLabels,
    )}`,
  );
}

if (
  failedOperations.some(
    (operation) =>
      operation.type === "api.patch" ||
      (operation.type === "api.post" &&
        operation.path === "/awards/award-1/transactions"),
  )
) {
  throw new Error(
    "Expected setRecipients failure to skip award patch and transaction record",
  );
}
