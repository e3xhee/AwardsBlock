import {
  mapProjectDetailToViewModel,
  renderProjectDetailPage,
  type ProjectAwardListResponse,
  type ProjectDetailResponse,
  type ProjectEventResponse
} from "./ProjectDetailPage";

const projectResponse: ProjectDetailResponse = {
  project: {
    id: "project-1",
    eventId: "event-1",
    name: "ProofBoard",
    tagline: "Verifiable award submissions",
    description: "A project that makes award review traceable.",
    problem: "Judges need consistent context before assigning prize rewards.",
    solution: "Teams submit canonical award proof.",
    imageUrl: null,
    githubUrl: "https://github.com/example/proofboard",
    demoUrl: "https://proofboard.example",
    presentationUrl: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z"
  }
};

const eventResponse: ProjectEventResponse = {
  event: {
    id: "event-1",
    organizerWallet: "0x0123456789abcdef0123456789abcdef01234567",
    name: "Seoul Demo Day",
    description: "Demo day for builder award submissions",
    startDate: "2026-08-01T09:00:00.000Z",
    endDate: "2026-08-02T18:00:00.000Z",
    location: "Seoul",
    imageUrl: null,
    officialUrl: "https://awardblock.example/events/seoul-demo-day",
    socialUrl: null,
    status: "Published",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z"
  }
};

const awardsResponse: ProjectAwardListResponse = {
  awards: [
    {
      id: "award-1",
      eventId: "event-1",
      projectId: "project-1",
      organizerWallet: "0x0123456789abcdef0123456789abcdef01234567",
      title: "Best Product",
      rank: "1st",
      reason: "The team delivered the clearest user-facing award flow.",
      judgingSummary: "Strong product thinking and complete demo.",
      rewardTokenAddress: "0x2222222222222222222222222222222222222222",
      rewardTokenSymbol: "mUSDC",
      rewardTokenDecimals: 6,
      totalReward: "1000000",
      claimStart: "2026-08-02T00:00:00.000Z",
      claimEnd: "2026-09-01T00:00:00.000Z",
      metadataUri: "ipfs://awardblock/best-product",
      metadataHash: "0xabc123",
      contractAwardId: "contract-award-1",
      status: "Claiming",
      createTxHash: null,
      fundTxHash: null,
      finalizeTxHash: null,
      supersededBy: null,
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z"
    }
  ]
};

const viewModel = mapProjectDetailToViewModel(
  projectResponse.project,
  eventResponse.event,
  awardsResponse.awards
);

if (viewModel.name !== "ProofBoard") {
  throw new Error("Expected project name");
}

if (viewModel.eventHref !== "/events/event-1") {
  throw new Error("Expected event detail link");
}

if (viewModel.organizerLabel !== "0x0123...4567") {
  throw new Error("Expected shortened organizer wallet");
}

if (viewModel.awards[0]?.title !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (viewModel.awards[0]?.rewardLabel !== "1 mUSDC") {
  throw new Error("Expected formatted award reward");
}

if (viewModel.awards[0]?.claimWindowLabel !== "2026년 8월 02일 - 2026년 9월 01일") {
  throw new Error("Expected formatted award claim window");
}

if (viewModel.awards[0]?.verificationLabel !== "검증 완료") {
  throw new Error("Expected verified award label");
}

if (viewModel.awards[0]?.status !== "클레임 진행 중") {
  throw new Error("Expected Korean project award status");
}

if (!renderProjectDetailPage("project-1").includes("프로젝트 상세")) {
  throw new Error("Expected Korean project detail title");
}

if (!renderProjectDetailPage("project-1").includes("project-detail-content")) {
  throw new Error("Expected project detail content mount target");
}
