import {
  mapAwardBlockDetailToViewModel,
  type AwardBlockDetailResponse
} from "./AwardDetailPage";

const response: AwardBlockDetailResponse = {
  awardBlock: {
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
      fundTxHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      finalizeTxHash: null
    },
    members: [
      {
        id: "member-1",
        displayName: "Ada Lee",
        walletAddress: "0x3333333333333333333333333333333333333333",
        allocation: "500000000000000000",
        inviteStatus: "Claimed",
        walletConnectedAt: "2026-08-03T00:00:00.000Z",
        claimedAt: "2026-08-04T00:00:00.000Z",
        claimTxHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      },
      {
        id: "member-2",
        displayName: "Grace Park",
        walletAddress: null,
        allocation: "500000000000000000",
        inviteStatus: "Pending",
        walletConnectedAt: null,
        claimedAt: null,
        claimTxHash: null
      }
    ],
    transactions: [
      {
        id: "transaction-1",
        transactionType: "AwardFunded",
        walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
        txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        blockNumber: 123456,
        createdAt: "2026-08-02T01:00:00.000Z"
      }
    ],
    claimStats: {
      recipientCount: 2,
      claimedCount: 1
    },
    createdAt: "2026-08-01T18:00:00.000Z",
    updatedAt: "2026-08-01T18:00:00.000Z"
  }
};

const viewModel = mapAwardBlockDetailToViewModel(response.awardBlock);

if (viewModel.awardTitle !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (viewModel.rewardLabel !== "1 MNT") {
  throw new Error("Expected formatted total reward");
}

if (viewModel.claimProgress !== "1/2 claimed") {
  throw new Error("Expected claim progress label");
}

if (viewModel.organizerLabel !== "0x0123...4567") {
  throw new Error("Expected shortened organizer wallet");
}

if (viewModel.verificationLabel !== "Verified") {
  throw new Error("Expected verified metadata label");
}

if (viewModel.onchainAward.contractAwardId !== "contract-award-1") {
  throw new Error("Expected on-chain award contract ID");
}

if (viewModel.onchainAward.totalReward !== "1000000000000000000") {
  throw new Error("Expected on-chain award reward amount");
}

if (viewModel.members[0]?.allocationLabel !== "0.5 MNT") {
  throw new Error("Expected formatted member allocation");
}

if (viewModel.members[1]?.walletLabel !== "Not connected") {
  throw new Error("Expected missing wallet label");
}

if (viewModel.transactions[0]?.txHashLabel !== "0xbbbb...bbbb") {
  throw new Error("Expected shortened transaction hash");
}
