import {
  buildOrganizerAwardPayloads,
  type OrganizerAwardDraft
} from "./OrganizerPage";

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
  rewardTokenAddress: "0x2222222222222222222222222222222222222222",
  rewardTokenSymbol: "MNT",
  rewardTokenDecimals: "18",
  totalReward: "1000000000000000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
  metadataUri: "ipfs://awardblock/best-product",
  metadataHash: "",
  recipientName: "Ada Lee",
  recipientEmail: "ada@example.com",
  recipientAllocation: "600000000000000000",
  inviteExpiresAt: "2026-08-15T00:00:00.000Z"
};

const payloads = buildOrganizerAwardPayloads(draft);

if (payloads.event.name !== "Seoul Demo Day") {
  throw new Error("Expected event name payload");
}

if (payloads.project.problem !== null) {
  throw new Error("Expected blank project problem to become null");
}

if (payloads.project.demoUrl !== null) {
  throw new Error("Expected blank project demo URL to become null");
}

if (payloads.award.rewardTokenDecimals !== 18) {
  throw new Error("Expected reward decimals to become a number");
}

if (payloads.award.metadataHash !== null) {
  throw new Error("Expected blank metadata hash to become null");
}

if (payloads.member.email !== "ada@example.com") {
  throw new Error("Expected member email payload");
}

if (payloads.invite.expiresAt !== "2026-08-15T00:00:00.000Z") {
  throw new Error("Expected invite expiration payload");
}
