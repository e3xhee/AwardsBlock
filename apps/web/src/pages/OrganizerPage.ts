import { apiPatch, apiPost } from "../api/client";
import {
  buildAwardContractId,
  buildCreateAwardRequest,
  buildSetRecipientsRequest,
  sendContractWrite,
  type ContractWriteProvider
} from "../blockchain/awardRegistry";
import { chainConfig } from "../blockchain/config";
import { getBrowserEthereumProvider } from "../auth/walletAuth";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";
import { walletState } from "../state/appState";

export type OrganizerAwardDraft = {
  eventName: string;
  eventDescription: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  eventOfficialUrl: string;
  projectName: string;
  projectTagline: string;
  projectDescription: string;
  projectProblem: string;
  projectSolution: string;
  projectGithubUrl: string;
  projectDemoUrl: string;
  awardTitle: string;
  awardRank: string;
  awardReason: string;
  judgingSummary: string;
  rewardTokenAddress: string;
  rewardTokenSymbol: string;
  rewardTokenDecimals: string;
  totalReward: string;
  claimStart: string;
  claimEnd: string;
  metadataUri: string;
  metadataHash: string;
  recipientName: string;
  recipientEmail: string;
  recipientWalletAddress: string;
  recipientAllocation: string;
  inviteExpiresAt: string;
};

type OrganizerAwardPayloads = {
  event: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string | null;
    officialUrl: string | null;
  };
  project: {
    name: string;
    tagline: string;
    description: string;
    problem: string | null;
    solution: string | null;
    githubUrl: string | null;
    demoUrl: string | null;
  };
  award: {
    title: string;
    rank: string | null;
    reason: string | null;
    judgingSummary: string | null;
    rewardTokenAddress: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    totalReward: string;
    claimStart: string;
    claimEnd: string;
    metadataUri: string | null;
    metadataHash: string | null;
    status: string;
  };
  member: {
    displayName: string;
    email: string | null;
    walletAddress: string;
    allocation: string;
    inviteStatus: string;
  };
  invite: {
    expiresAt?: string;
  };
};

type CreatedEventResponse = {
  event: {
    id: string;
    name: string;
  };
};

type CreatedProjectResponse = {
  project: {
    id: string;
    name: string;
  };
};

type CreatedAwardResponse = {
  award: {
    id: string;
    title: string;
  };
};

type CreatedMemberResponse = {
  member: {
    id: string;
    displayName: string;
    walletAddress: string | null;
    allocation: string;
  };
};

type CreatedInviteResponse = {
  invite: {
    id: string;
    token: string;
  };
};

type OrganizerSubmissionResult = {
  eventId: string;
  projectId: string;
  awardId: string;
  memberId: string;
  inviteId: string;
  inviteToken: string;
  awardTitle: string;
  recipientName: string;
  contractAwardId: string;
  createTxHash: string;
  setRecipientsTxHash: string;
  claimPath: string;
  awardPath: string;
};

type UpdatedAwardResponse = {
  award: {
    id: string;
  };
};

type CreatedTransactionResponse = {
  transaction: {
    id: string;
  };
};

type OrganizerAwardSetupApi = {
  post<TResponse, TBody = unknown>(path: string, body?: TBody): Promise<TResponse>;
  patch<TResponse, TBody = unknown>(path: string, body?: TBody): Promise<TResponse>;
};

type OrganizerAwardSetupDependencies = {
  api?: OrganizerAwardSetupApi;
  provider?: ContractWriteProvider | null;
  from?: string | null;
  registryAddress?: string;
};

const defaultApi: OrganizerAwardSetupApi = {
  post: apiPost,
  patch: apiPatch
};

const defaultDraft: OrganizerAwardDraft = {
  eventName: "Seoul Demo Day",
  eventDescription: "Demo day for builder award submissions",
  eventStartDate: "2026-08-01T09:00:00.000Z",
  eventEndDate: "2026-08-01T18:00:00.000Z",
  eventLocation: "Seoul",
  eventOfficialUrl: "https://awardblock.example/events/seoul-demo-day",
  projectName: "ProofBoard",
  projectTagline: "Verifiable award submissions",
  projectDescription: "A project that makes award review traceable.",
  projectProblem: "Judges need consistent context before assigning prize rewards.",
  projectSolution: "Teams submit canonical award proof.",
  projectGithubUrl: "https://github.com/example/proofboard",
  projectDemoUrl: "https://proofboard.example",
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
  metadataHash: "0xabc123",
  recipientName: "Ada Lee",
  recipientEmail: "ada@example.com",
  recipientWalletAddress: "0x3333333333333333333333333333333333333333",
  recipientAllocation: "600000000000000000",
  inviteExpiresAt: "2026-08-15T00:00:00.000Z"
};

export function renderOrganizerPage(): string {
  return `
    <main class="page-shell organizer-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">주최자</p>
          <h1>어워드 설정</h1>
          <p>이벤트, 프로젝트, 어워드, 수령자 배정, 클레임 초대, 온체인 등록까지 한 번에 생성합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">초안 플로우</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="organizer-layout">
        <form id="organizer-award-form" class="organizer-form">
          ${renderEventFields(defaultDraft)}
          ${renderProjectFields(defaultDraft)}
          ${renderAwardFields(defaultDraft)}
          ${renderRecipientFields(defaultDraft)}
          <button class="button" type="submit">어워드 설정 생성</button>
        </form>
        <aside id="organizer-result" class="organizer-result" aria-live="polite">
          <p class="eyebrow">준비됨</p>
          <h2>주최자 지갑 세션 대기 중</h2>
          <p>주최자 지갑을 연결한 뒤 제출하세요. 온체인 등록에는 컨트랙트 주소 설정도 필요합니다.</p>
        </aside>
      </section>
    </main>
  `;
}

export function mountOrganizerPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#organizer-award-form");
  const result = root.querySelector<HTMLElement>("#organizer-result");

  if (!form || !result) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "생성 중...";
    }

    result.innerHTML = renderOrganizerProgress("이벤트 생성");

    try {
      const submission = await createOrganizerAwardSetup(readOrganizerAwardDraft(form), (step) => {
        result.innerHTML = renderOrganizerProgress(step);
      });
      result.innerHTML = renderOrganizerSuccess(submission);
      form.reset();
    } catch {
      result.innerHTML = renderOrganizerError();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "어워드 설정 생성";
      }
    }
  });
}

export function buildOrganizerAwardPayloads(
  draft: OrganizerAwardDraft
): OrganizerAwardPayloads {
  return {
    event: {
      name: requiredText(draft.eventName),
      description: requiredText(draft.eventDescription),
      startDate: requiredText(draft.eventStartDate),
      endDate: requiredText(draft.eventEndDate),
      location: nullableText(draft.eventLocation),
      officialUrl: nullableText(draft.eventOfficialUrl)
    },
    project: {
      name: requiredText(draft.projectName),
      tagline: requiredText(draft.projectTagline),
      description: requiredText(draft.projectDescription),
      problem: nullableText(draft.projectProblem),
      solution: nullableText(draft.projectSolution),
      githubUrl: nullableText(draft.projectGithubUrl),
      demoUrl: nullableText(draft.projectDemoUrl)
    },
    award: {
      title: requiredText(draft.awardTitle),
      rank: nullableText(draft.awardRank),
      reason: nullableText(draft.awardReason),
      judgingSummary: nullableText(draft.judgingSummary),
      rewardTokenAddress: requiredText(draft.rewardTokenAddress),
      rewardTokenSymbol: requiredText(draft.rewardTokenSymbol),
      rewardTokenDecimals: Number(requiredText(draft.rewardTokenDecimals)),
      totalReward: requiredText(draft.totalReward),
      claimStart: requiredText(draft.claimStart),
      claimEnd: requiredText(draft.claimEnd),
      metadataUri: nullableText(draft.metadataUri),
      metadataHash: nullableText(draft.metadataHash),
      status: "Draft"
    },
    member: {
      displayName: requiredText(draft.recipientName),
      email: nullableText(draft.recipientEmail),
      walletAddress: requiredText(draft.recipientWalletAddress),
      allocation: requiredText(draft.recipientAllocation),
      inviteStatus: "Pending"
    },
    invite: {
      ...(nullableText(draft.inviteExpiresAt) === null
        ? {}
        : { expiresAt: requiredText(draft.inviteExpiresAt) })
    }
  };
}

export async function createOrganizerAwardSetup(
  draft: OrganizerAwardDraft,
  onStep: (step: string) => void,
  dependencies: OrganizerAwardSetupDependencies = {}
): Promise<OrganizerSubmissionResult> {
  const api = dependencies.api ?? defaultApi;
  const provider = dependencies.provider ?? getBrowserEthereumProvider();
  const from = dependencies.from ?? walletState.address;
  const registryAddress = dependencies.registryAddress ?? chainConfig.registryAddress;

  if (!provider || !from || registryAddress === "") {
    throw new Error("ONCHAIN_CONTEXT_REQUIRED");
  }

  const payloads = buildOrganizerAwardPayloads(draft);
  const event = await api.post<CreatedEventResponse, OrganizerAwardPayloads["event"]>(
    "/events",
    payloads.event
  );

  onStep("프로젝트 생성");
  const project = await api.post<CreatedProjectResponse, OrganizerAwardPayloads["project"]>(
    `/events/${encodeURIComponent(event.event.id)}/projects`,
    payloads.project
  );

  onStep("어워드 초안 생성");
  const award = await api.post<CreatedAwardResponse, OrganizerAwardPayloads["award"]>(
    `/projects/${encodeURIComponent(project.project.id)}/awards`,
    payloads.award
  );

  onStep("수령자 추가");
  const member = await api.post<CreatedMemberResponse, OrganizerAwardPayloads["member"]>(
    `/awards/${encodeURIComponent(award.award.id)}/members`,
    payloads.member
  );

  onStep("클레임 초대 생성");
  const invite = await api.post<CreatedInviteResponse, OrganizerAwardPayloads["invite"]>(
    `/award-members/${encodeURIComponent(member.member.id)}/claim-invites`,
    payloads.invite
  );

  onStep("온체인 어워드 생성");
  const contractAwardId = buildAwardContractId(award.award.id);
  const createTxHash = await sendContractWrite(
    provider,
    buildCreateAwardRequest({
      from,
      registryAddress,
      awardId: award.award.id,
      eventId: event.event.id,
      projectId: project.project.id,
      metadataUri: payloads.award.metadataUri,
      metadataHash: payloads.award.metadataHash,
      rewardTokenAddress: payloads.award.rewardTokenAddress,
      claimStart: payloads.award.claimStart,
      claimEnd: payloads.award.claimEnd
    })
  );

  await api.patch<
    UpdatedAwardResponse,
    {
      contractAwardId: string;
      createTxHash: string;
    }
  >(`/awards/${encodeURIComponent(award.award.id)}`, {
    contractAwardId,
    createTxHash
  });

  await api.post<
    CreatedTransactionResponse,
    {
      transactionType: string;
      walletAddress: string;
      txHash: string;
    }
  >(`/awards/${encodeURIComponent(award.award.id)}/transactions`, {
    transactionType: "AwardRegistered",
    walletAddress: from,
    txHash: createTxHash
  });

  onStep("수령자 배정 등록");
  const setRecipientsTxHash = await sendContractWrite(
    provider,
    buildSetRecipientsRequest({
      from,
      registryAddress,
      awardId: award.award.id,
      recipients: [
        {
          walletAddress: member.member.walletAddress ?? payloads.member.walletAddress,
          allocation: member.member.allocation
        }
      ]
    })
  );

  await api.patch<
    UpdatedAwardResponse,
    {
      status: string;
    }
  >(`/awards/${encodeURIComponent(award.award.id)}`, {
    status: "ReadyToFund"
  });

  return {
    eventId: event.event.id,
    projectId: project.project.id,
    awardId: award.award.id,
    memberId: member.member.id,
    inviteId: invite.invite.id,
    inviteToken: invite.invite.token,
    awardTitle: award.award.title,
    recipientName: member.member.displayName,
    contractAwardId,
    createTxHash,
    setRecipientsTxHash,
    claimPath: `/claim/${encodeURIComponent(invite.invite.token)}`,
    awardPath: `/awards/${encodeURIComponent(award.award.id)}`
  };
}

function readOrganizerAwardDraft(form: HTMLFormElement): OrganizerAwardDraft {
  const formData = new FormData(form);
  return {
    eventName: readFormString(formData, "eventName"),
    eventDescription: readFormString(formData, "eventDescription"),
    eventStartDate: readFormString(formData, "eventStartDate"),
    eventEndDate: readFormString(formData, "eventEndDate"),
    eventLocation: readFormString(formData, "eventLocation"),
    eventOfficialUrl: readFormString(formData, "eventOfficialUrl"),
    projectName: readFormString(formData, "projectName"),
    projectTagline: readFormString(formData, "projectTagline"),
    projectDescription: readFormString(formData, "projectDescription"),
    projectProblem: readFormString(formData, "projectProblem"),
    projectSolution: readFormString(formData, "projectSolution"),
    projectGithubUrl: readFormString(formData, "projectGithubUrl"),
    projectDemoUrl: readFormString(formData, "projectDemoUrl"),
    awardTitle: readFormString(formData, "awardTitle"),
    awardRank: readFormString(formData, "awardRank"),
    awardReason: readFormString(formData, "awardReason"),
    judgingSummary: readFormString(formData, "judgingSummary"),
    rewardTokenAddress: readFormString(formData, "rewardTokenAddress"),
    rewardTokenSymbol: readFormString(formData, "rewardTokenSymbol"),
    rewardTokenDecimals: readFormString(formData, "rewardTokenDecimals"),
    totalReward: readFormString(formData, "totalReward"),
    claimStart: readFormString(formData, "claimStart"),
    claimEnd: readFormString(formData, "claimEnd"),
    metadataUri: readFormString(formData, "metadataUri"),
    metadataHash: readFormString(formData, "metadataHash"),
    recipientName: readFormString(formData, "recipientName"),
    recipientEmail: readFormString(formData, "recipientEmail"),
    recipientWalletAddress: readFormString(formData, "recipientWalletAddress"),
    recipientAllocation: readFormString(formData, "recipientAllocation"),
    inviteExpiresAt: readFormString(formData, "inviteExpiresAt")
  };
}

function renderEventFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>이벤트</legend>
      ${renderInput("이벤트 이름", "eventName", draft.eventName, true)}
      ${renderTextarea("설명", "eventDescription", draft.eventDescription, true)}
      <div class="organizer-field-grid">
        ${renderInput("시작일", "eventStartDate", draft.eventStartDate, true)}
        ${renderInput("종료일", "eventEndDate", draft.eventEndDate, true)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("장소", "eventLocation", draft.eventLocation)}
        ${renderInput("공식 URL", "eventOfficialUrl", draft.eventOfficialUrl)}
      </div>
    </fieldset>
  `;
}

function renderProjectFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>프로젝트</legend>
      ${renderInput("프로젝트 이름", "projectName", draft.projectName, true)}
      ${renderInput("한 줄 소개", "projectTagline", draft.projectTagline, true)}
      ${renderTextarea("설명", "projectDescription", draft.projectDescription, true)}
      <div class="organizer-field-grid">
        ${renderInput("문제", "projectProblem", draft.projectProblem)}
        ${renderInput("해결책", "projectSolution", draft.projectSolution)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("GitHub URL", "projectGithubUrl", draft.projectGithubUrl)}
        ${renderInput("데모 URL", "projectDemoUrl", draft.projectDemoUrl)}
      </div>
    </fieldset>
  `;
}

function renderAwardFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>어워드</legend>
      <div class="organizer-field-grid">
        ${renderInput("어워드 제목", "awardTitle", draft.awardTitle, true)}
        ${renderInput("순위", "awardRank", draft.awardRank)}
      </div>
      ${renderTextarea("선정 이유", "awardReason", draft.awardReason)}
      ${renderTextarea("심사 요약", "judgingSummary", draft.judgingSummary)}
      <div class="organizer-field-grid">
        ${renderInput("리워드 토큰 주소", "rewardTokenAddress", draft.rewardTokenAddress, true)}
        ${renderInput("심볼", "rewardTokenSymbol", draft.rewardTokenSymbol, true)}
        ${renderInput("소수점", "rewardTokenDecimals", draft.rewardTokenDecimals, true)}
      </div>
      ${renderInput("총 리워드(base unit)", "totalReward", draft.totalReward, true)}
      <div class="organizer-field-grid">
        ${renderInput("클레임 시작", "claimStart", draft.claimStart, true)}
        ${renderInput("클레임 종료", "claimEnd", draft.claimEnd, true)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("Metadata URI", "metadataUri", draft.metadataUri)}
        ${renderInput("Metadata hash", "metadataHash", draft.metadataHash)}
      </div>
    </fieldset>
  `;
}

function renderRecipientFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>수령자</legend>
      <div class="organizer-field-grid">
        ${renderInput("수령자 이름", "recipientName", draft.recipientName, true)}
        ${renderInput("수령자 이메일", "recipientEmail", draft.recipientEmail)}
      </div>
      ${renderInput("수령자 지갑 주소", "recipientWalletAddress", draft.recipientWalletAddress, true)}
      <div class="organizer-field-grid">
        ${renderInput("배정 수량(base unit)", "recipientAllocation", draft.recipientAllocation, true)}
        ${renderInput("초대 만료일", "inviteExpiresAt", draft.inviteExpiresAt)}
      </div>
    </fieldset>
  `;
}

function renderInput(label: string, name: keyof OrganizerAwardDraft, value: string, required = false): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input name="${name}" value="${escapeHtml(value)}"${required ? " required" : ""} />
    </label>
  `;
}

function renderTextarea(
  label: string,
  name: keyof OrganizerAwardDraft,
  value: string,
  required = false
): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea name="${name}"${required ? " required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderOrganizerProgress(step: string): string {
  return `
    <p class="eyebrow">진행 중</p>
    <h2>${escapeHtml(step)}</h2>
    <span class="loading-bar"></span>
  `;
}

export function renderOrganizerSuccess(result: OrganizerSubmissionResult): string {
  return `
    <p class="eyebrow">생성 완료</p>
    <h2>${escapeHtml(result.awardTitle)}</h2>
    <p>어워드가 온체인에 등록됐습니다. 상세 페이지에서 Approve token / Fund award를 이어서 실행하세요.</p>
    <dl class="organizer-result-list">
      <div><dt>수령자</dt><dd>${escapeHtml(result.recipientName)}</dd></div>
      <div><dt>Event ID</dt><dd>${escapeHtml(result.eventId)}</dd></div>
      <div><dt>Project ID</dt><dd>${escapeHtml(result.projectId)}</dd></div>
      <div><dt>Award ID</dt><dd>${escapeHtml(result.awardId)}</dd></div>
      <div><dt>Contract Award ID</dt><dd>${escapeHtml(result.contractAwardId)}</dd></div>
      <div><dt>Create Tx</dt><dd>${escapeHtml(result.createTxHash)}</dd></div>
      <div><dt>Invite ID</dt><dd>${escapeHtml(result.inviteId)}</dd></div>
    </dl>
    <div class="organizer-result-actions">
      <a class="text-link" href="${escapeHtml(result.awardPath)}">펀딩 진행하기</a>
      <a class="text-link" href="${escapeHtml(result.claimPath)}">클레임 초대 열기</a>
    </div>
  `;
}

function renderOrganizerError(): string {
  return `
    <p class="eyebrow">생성 실패</p>
    <h2>주최자 지갑 세션과 컨트랙트 설정이 필요합니다</h2>
    <p>지갑을 연결하고 registry 컨트랙트 주소를 설정한 뒤 다시 제출하세요.</p>
  `;
}

function readFormString(formData: FormData, key: keyof OrganizerAwardDraft): string {
  return String(formData.get(key) ?? "");
}

function requiredText(value: string): string {
  return value.trim();
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
