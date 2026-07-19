import { mapAwardBlocksToSummaries, type AwardBlockListResponse } from "./HomePage";

const response: AwardBlockListResponse = {
  awardBlocks: [
    {
      id: "award-1",
      organizerWallet: "0x0123456789abcdef0123456789abcdef01234567",
      event: {
        id: "event-1",
        name: "Seoul Demo Day",
        startDate: "2026-08-01T09:00:00.000Z",
        endDate: "2026-08-01T18:00:00.000Z"
      },
      project: {
        id: "project-1",
        name: "ProofBoard",
        tagline: "Verifiable award submissions"
      },
      award: {
        id: "award-1",
        title: "Best Product",
        rank: "1st",
        status: "Claiming",
        rewardTokenSymbol: "MNT",
        rewardTokenDecimals: 18,
        totalReward: "1000000000000000000",
        metadataHash: "0xabc123",
        contractAwardId: "contract-award-1"
      },
      claimStats: {
        recipientCount: 2,
        claimedCount: 1
      },
      createdAt: "2026-08-01T18:00:00.000Z"
    }
  ]
};

const summaries = mapAwardBlocksToSummaries(response.awardBlocks);

if (summaries[0]?.eventName !== "Seoul Demo Day") {
  throw new Error("Expected event name from award block");
}

if (summaries[0]?.rewardLabel !== "1 MNT") {
  throw new Error("Expected formatted reward label");
}

if (summaries[0]?.awardTitle !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (summaries[0]?.claimProgress !== "1/2 claimed") {
  throw new Error("Expected claim progress label");
}

if (summaries[0]?.organizer !== "0x0123...4567") {
  throw new Error("Expected shortened organizer wallet");
}

if (summaries[0]?.verified !== true) {
  throw new Error("Expected verified award block");
}
