import {
  buildOrganizerAwardPayloads,
  createOrganizerAwardSetup,
  renderOrganizerPage,
  type OrganizerAwardDraft
} from "./OrganizerPage";
import { buildAwardContractId, type ContractWriteProvider } from "../blockchain/awardRegistry";

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
  recipientWalletAddress: "0x3333333333333333333333333333333333333333",
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

if (payloads.award.status !== "Draft") {
  throw new Error("Expected award to start as Draft before on-chain registration");
}

if (payloads.award.metadataHash !== null) {
  throw new Error("Expected blank metadata hash to become null");
}

if (payloads.member.email !== "ada@example.com") {
  throw new Error("Expected member email payload");
}

if (payloads.member.walletAddress !== "0x3333333333333333333333333333333333333333") {
  throw new Error("Expected member wallet address payload");
}

if (payloads.invite.expiresAt !== "2026-08-15T00:00:00.000Z") {
  throw new Error("Expected invite expiration payload");
}

if (!renderOrganizerPage().includes("data-wallet-auth")) {
  throw new Error("Expected organizer page to render wallet auth controls");
}

if (!renderOrganizerPage().includes("어워드 설정 생성")) {
  throw new Error("Expected organizer page to render Korean copy");
}

const txHashes = [
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
];
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
    return txHashes[providerRequests.length - 1] as TResponse;
  }
};

const postCalls: Array<{ path: string; body: unknown }> = [];
const patchCalls: Array<{ path: string; body: unknown }> = [];
const api = {
  async post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    postCalls.push({ path, body });

    if (path === "/events") {
      return { event: { id: "event-1", name: "Seoul Demo Day" } } as TResponse;
    }

    if (path === "/events/event-1/projects") {
      return { project: { id: "project-1", name: "ProofBoard" } } as TResponse;
    }

    if (path === "/projects/project-1/awards") {
      return { award: { id: "award-1", title: "Best Product" } } as TResponse;
    }

    if (path === "/awards/award-1/members") {
      return {
        member: {
          id: "member-1",
          displayName: "Ada Lee",
          walletAddress: "0x3333333333333333333333333333333333333333",
          allocation: "600000000000000000"
        }
      } as TResponse;
    }

    if (path === "/award-members/member-1/claim-invites") {
      return { invite: { id: "invite-1", token: "invite-token-1" } } as TResponse;
    }

    if (path === "/awards/award-1/transactions") {
      return { transaction: { id: "transaction-1" } } as TResponse;
    }

    throw new Error(`Unexpected POST ${path}`);
  },
  async patch<TResponse, TBody = unknown>(path: string, body?: TBody) {
    patchCalls.push({ path, body });
    return { award: { id: "award-1", title: "Best Product" } } as TResponse;
  }
};

const steps: string[] = [];
const result = await createOrganizerAwardSetup(draft, (step) => steps.push(step), {
  api,
  provider,
  from: "0x0123456789abcdef0123456789abcdef01234567",
  registryAddress: "0x1111111111111111111111111111111111111111"
});

if (!steps.includes("온체인 어워드 생성")) {
  throw new Error("Expected on-chain create step");
}

if (!steps.includes("수령자 배정 등록")) {
  throw new Error("Expected set recipients step");
}

if (providerRequests.length !== 2) {
  throw new Error("Expected createAward and setRecipients wallet requests");
}

const contractAwardId = buildAwardContractId("award-1");

if (result.contractAwardId !== contractAwardId) {
  throw new Error("Expected generated contract award id in result");
}

if (result.createTxHash !== txHashes[0]) {
  throw new Error("Expected create transaction hash in result");
}

if (
  JSON.stringify(patchCalls[0]) !==
  JSON.stringify({
    path: "/awards/award-1",
    body: {
      contractAwardId,
      createTxHash: txHashes[0]
    }
  })
) {
  throw new Error("Expected award contract id and create tx patch");
}

if (
  JSON.stringify(patchCalls[1]) !==
  JSON.stringify({
    path: "/awards/award-1",
    body: {
      status: "ReadyToFund"
    }
  })
) {
  throw new Error("Expected ReadyToFund status patch after setRecipients");
}

if (
  JSON.stringify(postCalls[5]) !==
  JSON.stringify({
    path: "/awards/award-1/transactions",
    body: {
      transactionType: "AwardRegistered",
      walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
      txHash: txHashes[0]
    }
  })
) {
  throw new Error("Expected AwardRegistered transaction record");
}
