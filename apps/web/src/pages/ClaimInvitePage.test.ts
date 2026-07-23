import type { AwardBlockDetail } from "./AwardDetailPage";
import {
  executeClaimInviteAction,
  mapClaimInviteToViewModel,
  renderClaimInviteContent,
  renderClaimInvitePage,
  type ClaimInviteActionApi,
  type ClaimInviteLookupResponse,
} from "./ClaimInvitePage";
import {
  buildAwardContractId,
  type ContractWriteProvider,
} from "../blockchain/awardRegistry";

const inviteResponse: ClaimInviteLookupResponse = {
  invite: {
    id: "invite-1",
    awardMemberId: "member-1",
    expiresAt: "2026-08-15T00:00:00.000Z",
    usedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    member: {
      id: "member-1",
      awardId: "award-1",
      displayName: "Ada Lee",
      allocation: "600000",
      inviteStatus: "Invited",
    },
  },
};

const awardBlock: AwardBlockDetail = {
  id: "award-1",
  organizerWallet: "0x0123456789abcdef0123456789abcdef01234567",
  event: {
    id: "event-1",
    name: "Seoul Demo Day",
    description: "Demo day for builder award submissions",
    startDate: "2026-08-01T09:00:00.000Z",
    endDate: "2026-08-01T18:00:00.000Z",
    location: "Seoul",
    officialUrl: "https://awardblock.example/events/seoul-demo-day",
  },
  project: {
    id: "project-1",
    name: "ProofBoard",
    tagline: "Verifiable award submissions",
    description: "A project that makes award review traceable.",
    githubUrl: "https://github.com/example/proofboard",
    demoUrl: "https://proofboard.example",
  },
  award: {
    id: "award-1",
    title: "Best Product",
    rank: "1st",
    reason: "The team delivered the clearest user-facing award flow.",
    judgingSummary: "Strong product thinking and complete demo.",
    status: "Claiming",
    rewardTokenSymbol: "mUSDC",
    rewardTokenAddress: "0x2222222222222222222222222222222222222222",
    rewardTokenDecimals: 6,
    totalReward: "1000000",
    claimStart: "2026-08-02T00:00:00.000Z",
    claimEnd: "2026-09-01T00:00:00.000Z",
    metadataUri: "ipfs://awardblock/best-product",
    metadataHash: "0xabc123",
    contractAwardId: "contract-award-1",
    createTxHash: null,
    fundTxHash: null,
    finalizeTxHash: null,
  },
  members: [
    {
      id: "member-1",
      displayName: "Ada Lee",
      walletAddress: null,
      allocation: "600000",
      inviteStatus: "Invited",
      walletConnectedAt: null,
      claimedAt: null,
      claimTxHash: null,
    },
  ],
  transactions: [],
  claimStats: {
    recipientCount: 1,
    claimedCount: 0,
  },
  createdAt: "2026-08-01T18:00:00.000Z",
  updatedAt: "2026-08-01T18:00:00.000Z",
};

const invitedViewModel = mapClaimInviteToViewModel(
  inviteResponse.invite,
  awardBlock,
);

if (invitedViewModel.awardTitle !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (invitedViewModel.recipientName !== "Ada Lee") {
  throw new Error("Expected recipient name from invite");
}

if (invitedViewModel.allocationLabel !== "0.6 mUSDC") {
  throw new Error("Expected formatted allocation");
}

if (invitedViewModel.walletLabel !== "미연결") {
  throw new Error("Expected missing wallet label");
}

if (invitedViewModel.statusLabel !== "초대됨") {
  throw new Error("Expected invite status label");
}

if (invitedViewModel.canClaim !== false) {
  throw new Error("Expected invited member to require wallet connection first");
}

const connectedAwardBlock: AwardBlockDetail = {
  ...awardBlock,
  members: [
    {
      ...awardBlock.members[0]!,
      walletAddress: "0x3333333333333333333333333333333333333333",
      inviteStatus: "WalletConnected",
      walletConnectedAt: "2026-08-03T00:00:00.000Z",
    },
  ],
};

const connectedViewModel = mapClaimInviteToViewModel(
  {
    ...inviteResponse.invite,
    member: {
      ...inviteResponse.invite.member,
      inviteStatus: "WalletConnected",
    },
  },
  connectedAwardBlock,
);

if (connectedViewModel.walletLabel !== "0x3333...3333") {
  throw new Error("Expected connected wallet label");
}

if (connectedViewModel.canClaim !== true) {
  throw new Error("Expected connected member to be claim-ready");
}

const preassignedAwardBlock: AwardBlockDetail = {
  ...awardBlock,
  members: [
    {
      ...awardBlock.members[0]!,
      walletAddress: "0x3333333333333333333333333333333333333333",
      inviteStatus: "Pending",
    },
  ],
};

const preassignedViewModel = mapClaimInviteToViewModel(
  {
    ...inviteResponse.invite,
    member: {
      ...inviteResponse.invite.member,
      walletAddress: "0x3333333333333333333333333333333333333333",
      inviteStatus: "Pending",
    },
  },
  preassignedAwardBlock,
);

if (preassignedViewModel.canClaim !== true) {
  throw new Error("Expected preassigned recipient wallet to be claim-ready");
}

const claimedAwardBlock: AwardBlockDetail = {
  ...awardBlock,
  members: [
    {
      ...awardBlock.members[0]!,
      walletAddress: "0x3333333333333333333333333333333333333333",
      inviteStatus: "Claimed",
      walletConnectedAt: "2026-08-03T00:00:00.000Z",
      claimedAt: "2026-08-04T00:00:00.000Z",
      claimTxHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
  ],
};

const claimedViewModel = mapClaimInviteToViewModel(
  {
    ...inviteResponse.invite,
    member: {
      ...inviteResponse.invite.member,
      inviteStatus: "Claimed",
    },
  },
  claimedAwardBlock,
  "",
  "https://explorer.test",
);

if (
  claimedViewModel.claimTxUrl !==
  "https://explorer.test/tx/0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
) {
  throw new Error("Expected claimed invite tx to link to explorer");
}

if (!renderClaimInvitePage("invite-token-1").includes("data-wallet-auth")) {
  throw new Error("Expected claim invite page to render wallet auth controls");
}

const providerRequests: Array<{ method: string; params?: unknown }> = [];
const provider: ContractWriteProvider = {
  async request<TResponse = unknown>({
    method,
    params,
  }: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) {
    providerRequests.push({ method, params });

    if (method === "eth_getTransactionReceipt") {
      return { blockNumber: "0x1e241" } as TResponse;
    }

    return "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as TResponse;
  },
};

const posts: Array<{ path: string; body: unknown }> = [];
const api: ClaimInviteActionApi = {
  async post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    posts.push({ path, body });

    if (path === "/award-members/member-1/claim") {
      return {
        member: {
          id: "member-1",
          walletAddress: "0x3333333333333333333333333333333333333333",
          inviteStatus: "Claimed",
          claimedAt: "2026-08-04T00:00:00.000Z",
          claimTxHash:
            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
      } as TResponse;
    }

    if (path === "/awards/award-1/transactions") {
      return { transaction: { id: "transaction-1" } } as TResponse;
    }

    throw new Error(`Unexpected POST ${path}`);
  },
};

const claimResult = await executeClaimInviteAction({
  awardId: "award-1",
  memberId: "member-1",
  contractAwardId: "contract-award-1",
  from: "0x3333333333333333333333333333333333333333",
  registryAddress: "0x1111111111111111111111111111111111111111",
  provider,
  api,
});

if (
  claimResult.txHash !==
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
) {
  throw new Error("Expected on-chain claim transaction hash");
}

if (providerRequests[0]?.method !== "eth_sendTransaction") {
  throw new Error("Expected claim wallet transaction request");
}

if (
  !JSON.stringify(providerRequests[0]?.params).includes(
    buildAwardContractId("contract-award-1").slice(2),
  )
) {
  throw new Error("Expected claim request to encode contract award id");
}

if (
  JSON.stringify(posts[0]) !==
  JSON.stringify({
    path: "/award-members/member-1/claim",
    body: {
      claimTxHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
  })
) {
  throw new Error("Expected member claim record with wallet tx hash");
}

if (
  JSON.stringify(posts[1]) !==
  JSON.stringify({
    path: "/awards/award-1/transactions",
    body: {
      transactionType: "AwardClaimed",
      walletAddress: "0x3333333333333333333333333333333333333333",
      txHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      blockNumber: 123457,
    },
  })
) {
  throw new Error("Expected AwardClaimed transaction record");
}

const connectedClaimHtml = renderClaimInviteContent(connectedViewModel);

if (
  !connectedClaimHtml.includes("\ud074\ub808\uc784 \ud2b8\ub79c\uc7ad\uc158")
) {
  throw new Error("Expected claim invite transaction label to be Korean");
}

if (
  !connectedClaimHtml.includes(
    "\ud2b8\ub79c\uc7ad\uc158 \ud574\uc2dc\uac00 \uc790\ub3d9\uc73c\ub85c \uc800\uc7a5",
  )
) {
  throw new Error(
    "Expected claim invite guidance to use Korean transaction hash copy",
  );
}

for (const englishCopy of [
  "\ud074\ub808\uc784 tx",
  "claim \ud2b8\ub79c\uc7ad\uc158",
  "tx hash",
]) {
  if (connectedClaimHtml.includes(englishCopy)) {
    throw new Error("Expected claim invite not to include " + englishCopy);
  }
}
