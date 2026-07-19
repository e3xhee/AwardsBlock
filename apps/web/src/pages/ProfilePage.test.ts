import { mapProfileToViewModel, type WalletProfileResponse } from "./ProfilePage";

const profile: WalletProfileResponse["profile"] = {
  walletAddress: "0x1111111111111111111111111111111111111111",
  stats: {
    awardCount: 1,
    claimedAwardCount: 1,
    projectCount: 1
  },
  awards: [
    {
      member: {
        id: "member-1",
        displayName: "Ada Lee",
        allocation: "600000000000000000",
        inviteStatus: "Claimed",
        walletConnectedAt: "2026-08-03T00:00:00.000Z",
        claimedAt: "2026-08-04T00:00:00.000Z",
        claimTxHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      },
      award: {
        id: "award-1",
        title: "Best Product",
        rank: "1st",
        rewardTokenSymbol: "MNT",
        rewardTokenDecimals: 18,
        totalReward: "1000000000000000000"
      },
      project: {
        id: "project-1",
        name: "ProofBoard"
      },
      event: {
        id: "event-1",
        name: "Seoul Demo Day"
      },
      claimTransactions: [
        {
          id: "transaction-1",
          transactionType: "AwardClaimed",
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          blockNumber: 123456,
          createdAt: "2026-08-04T00:00:00.000Z"
        }
      ]
    }
  ]
};

const viewModel = mapProfileToViewModel(profile);

if (viewModel.walletLabel !== "0x1111...1111") {
  throw new Error("Expected shortened wallet label");
}

if (viewModel.awards[0]?.rewardLabel !== "0.6 MNT") {
  throw new Error("Expected formatted allocation label");
}

if (viewModel.awards[0]?.claimTransactionLabel !== "0xaaaa...aaaa") {
  throw new Error("Expected shortened claim transaction label");
}
