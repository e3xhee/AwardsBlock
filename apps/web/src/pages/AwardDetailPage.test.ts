import {
  getMockAwardBlockDetail,
  mapAwardBlockDetailToViewModel,
  renderAwardDetailContent,
  renderAwardDetailPage,
  type AwardBlockDetailResponse,
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
      fundTxHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      finalizeTxHash: null,
    },
    members: [
      {
        id: "member-1",
        displayName: "Ada Lee",
        walletAddress: "0x3333333333333333333333333333333333333333",
        allocation: "500000",
        inviteStatus: "Claimed",
        walletConnectedAt: "2026-08-03T00:00:00.000Z",
        claimedAt: "2026-08-04T00:00:00.000Z",
        claimTxHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      {
        id: "member-2",
        displayName: "Grace Park",
        walletAddress: null,
        allocation: "500000",
        inviteStatus: "Pending",
        walletConnectedAt: null,
        claimedAt: null,
        claimTxHash: null,
      },
    ],
    transactions: [
      {
        id: "transaction-1",
        transactionType: "AwardClaimed",
        walletAddress: "0x3333333333333333333333333333333333333333",
        txHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        blockNumber: null,
        createdAt: "2026-08-04T00:00:00.000Z",
      },
      {
        id: "transaction-2",
        transactionType: "AwardFunded",
        walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
        txHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        blockNumber: 123456,
        createdAt: "2026-08-02T01:00:00.000Z",
      },
      {
        id: "transaction-3",
        transactionType: "RecipientsSet",
        walletAddress: "0x3333333333333333333333333333333333333333",
        txHash:
          "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        blockNumber: null,
        createdAt: "2026-08-01T19:00:00.000Z",
      },
      {
        id: "transaction-4",
        transactionType: "AwardRegistered",
        walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
        txHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        blockNumber: null,
        createdAt: "2026-08-01T18:30:00.000Z",
      },
    ],
    claimStats: {
      recipientCount: 2,
      claimedCount: 1,
    },
    createdAt: "2026-08-01T18:00:00.000Z",
    updatedAt: "2026-08-01T18:00:00.000Z",
  },
};

const viewModel = mapAwardBlockDetailToViewModel(response.awardBlock);
const explorerViewModel = mapAwardBlockDetailToViewModel(
  response.awardBlock,
  "https://explorer.test",
);

if (viewModel.awardTitle !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (viewModel.rewardLabel !== "1 mUSDC") {
  throw new Error("Expected formatted total reward");
}

if (viewModel.claimProgress !== "1/2 클레임 완료") {
  throw new Error("Expected claim progress label");
}

if (viewModel.organizerLabel !== "0x0123...4567") {
  throw new Error("Expected shortened organizer wallet");
}

if (viewModel.verificationLabel !== "검증 완료") {
  throw new Error("Expected verified metadata label");
}

if (viewModel.onchainAward.contractAwardId !== "contract-award-1") {
  throw new Error("Expected on-chain award contract ID");
}

if (viewModel.onchainAward.totalReward !== "1000000") {
  throw new Error("Expected on-chain award reward amount");
}

if (viewModel.members[0]?.allocationLabel !== "0.5 mUSDC") {
  throw new Error("Expected formatted member allocation");
}

if (viewModel.members[0]?.status !== "클레임 완료") {
  throw new Error("Expected Korean member claim status");
}

if (viewModel.members[0]?.claimedAtLabel !== "2026년 8월 04일") {
  throw new Error("Expected Korean member claimed date label");
}

if (viewModel.members[1]?.walletLabel !== "미연결") {
  throw new Error("Expected missing wallet label");
}

const transactionTypeLabels = viewModel.transactions.map(
  (transaction) => transaction.typeLabel,
);

if (
  JSON.stringify(transactionTypeLabels) !==
  JSON.stringify(["어워드 등록", "수신자 설정", "리워드 예치", "리워드 클레임"])
) {
  throw new Error(
    "Expected transaction labels to follow award lifecycle order",
  );
}

if (viewModel.transactions[2]?.txHashLabel !== "0xbbbb...bbbb") {
  throw new Error("Expected shortened funded transaction hash");
}

if (
  explorerViewModel.transactions[0]?.txUrl !==
  "https://explorer.test/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
) {
  throw new Error("Expected transaction hash to link to block explorer");
}

if (viewModel.transactions[3]?.typeLabel !== "리워드 클레임") {
  throw new Error("Expected Korean claimed transaction type");
}

if (viewModel.transactions[3]?.blockLabel !== "블록 대기 중") {
  throw new Error("Expected pending block label");
}

if (!renderAwardDetailPage("award-1").includes("어워드 블록")) {
  throw new Error("Expected Korean award detail page title");
}

const awardDetailHtml = renderAwardDetailContent(viewModel);

if (!awardDetailHtml.includes("\ud074\ub808\uc784 \ud2b8\ub79c\uc7ad\uc158")) {
  throw new Error("Expected award detail member claim transaction label");
}

if (awardDetailHtml.includes("\ud074\ub808\uc784 tx")) {
  throw new Error("Expected award detail not to expose abbreviated tx label");
}

const mockAwardDetail = getMockAwardBlockDetail("award-1");

if (!mockAwardDetail) {
  throw new Error("Expected mock award detail for home award block");
}

const mockAwardViewModel = mapAwardBlockDetailToViewModel(mockAwardDetail);

if (mockAwardViewModel.eventName !== "De-Buthon 2026") {
  throw new Error("Expected mock detail to keep the clicked event context");
}

if (mockAwardViewModel.projectName !== "Uniport") {
  throw new Error("Expected mock detail to show the Uniport project");
}

if (mockAwardViewModel.members.length < 3) {
  throw new Error("Expected mock detail to include team recipients");
}

if (mockAwardViewModel.transactions.length < 4) {
  throw new Error("Expected mock detail to include lifecycle transactions");
}

const mockAwardHtml = renderAwardDetailContent(mockAwardViewModel);

if (!mockAwardHtml.includes("Uniport Team")) {
  throw new Error("Expected mock award detail to render recipient names");
}

if (!mockAwardHtml.includes("0xawardblock2026uniportmetadata")) {
  throw new Error("Expected mock award detail to render metadata hash");
}

if (getMockAwardBlockDetail("unknown-award") !== null) {
  throw new Error("Expected unknown award ids not to return mock detail");
}
const chainfolioAwardDetail = getMockAwardBlockDetail(
  "mock-award-chainfolio-product",
);
const impactPassAwardDetail = getMockAwardBlockDetail("mock-award-impact-pass");

if (!chainfolioAwardDetail || !impactPassAwardDetail) {
  throw new Error(
    "Expected every home mock award route to have detail fallback",
  );
}

const chainfolioAwardViewModel = mapAwardBlockDetailToViewModel(
  chainfolioAwardDetail,
);
const impactPassAwardViewModel = mapAwardBlockDetailToViewModel(
  impactPassAwardDetail,
);

if (
  chainfolioAwardViewModel.projectName !== "Chainfolio" ||
  chainfolioAwardViewModel.eventName !== "Campus Proof Demo Day"
) {
  throw new Error("Expected Chainfolio mock route to render Chainfolio detail");
}

if (
  impactPassAwardViewModel.projectName !== "Impact Pass" ||
  impactPassAwardViewModel.eventName !== "Public Goods Mini Hack"
) {
  throw new Error(
    "Expected Impact Pass mock route to render Impact Pass detail",
  );
}

if (impactPassAwardDetail.award.metadataHash !== null) {
  throw new Error(
    "Expected unverified Impact Pass mock detail to stay pending",
  );
}
