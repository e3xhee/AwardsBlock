import type { AwardBlockDetail } from "./AwardDetailPage";
import {
  mapClaimInviteToViewModel,
  renderClaimInvitePage,
  type ClaimInviteLookupResponse
} from "./ClaimInvitePage";

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
      allocation: "600000000000000000",
      inviteStatus: "Invited"
    }
  }
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
    officialUrl: "https://awardblock.example/events/seoul-demo-day"
  },
  project: {
    id: "project-1",
    name: "ProofBoard",
    tagline: "Verifiable award submissions",
    description: "A project that makes award review traceable.",
    githubUrl: "https://github.com/example/proofboard",
    demoUrl: "https://proofboard.example"
  },
  award: {
    id: "award-1",
    title: "Best Product",
    rank: "1st",
    reason: "The team delivered the clearest user-facing award flow.",
    judgingSummary: "Strong product thinking and complete demo.",
    status: "Claiming",
    rewardTokenSymbol: "MNT",
    rewardTokenAddress: "0x2222222222222222222222222222222222222222",
    rewardTokenDecimals: 18,
    totalReward: "1000000000000000000",
    claimStart: "2026-08-02T00:00:00.000Z",
    claimEnd: "2026-09-01T00:00:00.000Z",
    metadataUri: "ipfs://awardblock/best-product",
    metadataHash: "0xabc123",
    contractAwardId: "contract-award-1",
    createTxHash: null,
    fundTxHash: null,
    finalizeTxHash: null
  },
  members: [
    {
      id: "member-1",
      displayName: "Ada Lee",
      walletAddress: null,
      allocation: "600000000000000000",
      inviteStatus: "Invited",
      walletConnectedAt: null,
      claimedAt: null,
      claimTxHash: null
    }
  ],
  transactions: [],
  claimStats: {
    recipientCount: 1,
    claimedCount: 0
  },
  createdAt: "2026-08-01T18:00:00.000Z",
  updatedAt: "2026-08-01T18:00:00.000Z"
};

const invitedViewModel = mapClaimInviteToViewModel(inviteResponse.invite, awardBlock);

if (invitedViewModel.awardTitle !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (invitedViewModel.recipientName !== "Ada Lee") {
  throw new Error("Expected recipient name from invite");
}

if (invitedViewModel.allocationLabel !== "0.6 MNT") {
  throw new Error("Expected formatted allocation");
}

if (invitedViewModel.walletLabel !== "Not connected") {
  throw new Error("Expected missing wallet label");
}

if (invitedViewModel.statusLabel !== "Invited") {
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
      walletConnectedAt: "2026-08-03T00:00:00.000Z"
    }
  ]
};

const connectedViewModel = mapClaimInviteToViewModel(
  {
    ...inviteResponse.invite,
    member: {
      ...inviteResponse.invite.member,
      inviteStatus: "WalletConnected"
    }
  },
  connectedAwardBlock
);

if (connectedViewModel.walletLabel !== "0x3333...3333") {
  throw new Error("Expected connected wallet label");
}

if (connectedViewModel.canClaim !== true) {
  throw new Error("Expected connected member to be claim-ready");
}

if (!renderClaimInvitePage("invite-token-1").includes("data-wallet-auth")) {
  throw new Error("Expected claim invite page to render wallet auth controls");
}
