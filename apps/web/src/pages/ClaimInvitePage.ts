import { apiGet, apiPost } from "../api/client";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";
import type { AwardBlockDetail, AwardBlockDetailResponse } from "./AwardDetailPage";
import {
  buildClaimAwardRequest,
  sendContractWrite,
  type ContractWriteProvider
} from "../blockchain/awardRegistry";
import { chainConfig } from "../blockchain/config";
import { getBrowserEthereumProvider } from "../auth/walletAuth";
import { walletState } from "../state/appState";
import { formatTokenAmount, shortenAddress } from "../utils/format";

export type ClaimInviteLookupResponse = {
  invite: ClaimInviteLookup;
};

export type ClaimInviteLookup = {
  id: string;
  awardMemberId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  member: {
    id: string;
    awardId: string;
    displayName: string;
    allocation: string;
    inviteStatus: string;
    walletAddress?: string | null;
    walletConnectedAt?: string | null;
  };
};

type ConnectedClaimInviteResponse = {
  invite: ClaimInviteLookup;
};

type ClaimedAwardMemberResponse = {
  member: {
    id: string;
    walletAddress: string;
    inviteStatus: string;
    claimedAt: string;
    claimTxHash: string;
  };
};

export type ClaimInviteActionApi = {
  post<TResponse, TBody = unknown>(path: string, body?: TBody): Promise<TResponse>;
};

type ClaimInviteViewModel = {
  token: string;
  inviteId: string;
  awardId: string;
  memberId: string;
  contractAwardId: string | null;
  eventName: string;
  projectName: string;
  awardTitle: string;
  recipientName: string;
  allocationLabel: string;
  statusLabel: string;
  walletLabel: string;
  expiresAtLabel: string;
  canConnectWallet: boolean;
  canClaim: boolean;
  isClaimed: boolean;
  claimTxLabel: string;
};

const defaultClaimInviteActionApi: ClaimInviteActionApi = {
  post: apiPost
};

export function renderClaimInvitePage(token: string | null = null): string {
  return `
    <main class="page-shell claim-page">
      <section class="claim-hero">
        <div>
          <p class="eyebrow">클레임 초대</p>
          <h1>${token ? "어워드 리워드 클레임" : "클레임을 사용할 수 없습니다"}</h1>
        </div>
        <div class="page-actions">
          <span class="status-badge">수신자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section id="claim-invite-content" class="claim-content" aria-live="polite">
        ${token ? renderClaimLoading() : renderClaimMissingToken()}
      </section>
    </main>
  `;
}

export async function mountClaimInvitePage(root: ParentNode, token: string): Promise<void> {
  mountWalletConnectButton(root);

  const content = root.querySelector<HTMLElement>("#claim-invite-content");

  if (!content) return;

  content.innerHTML = renderClaimLoading();

  try {
    const { invite } = await apiGet<ClaimInviteLookupResponse>(
      `/claim-invites/${encodeURIComponent(token)}`
    );
    const { awardBlock } = await apiGet<AwardBlockDetailResponse>(
      `/award-blocks/${encodeURIComponent(invite.member.awardId)}`
    );

    renderInteractiveClaimInvite(content, token, invite, awardBlock);
  } catch {
    content.innerHTML = renderClaimError();
  }
}

export function mapClaimInviteToViewModel(
  invite: ClaimInviteLookup,
  awardBlock: AwardBlockDetail,
  token = ""
): ClaimInviteViewModel {
  const member =
    awardBlock.members.find((candidate) => candidate.id === invite.member.id) ?? null;
  const walletAddress = invite.member.walletAddress ?? member?.walletAddress ?? null;
  const inviteStatus = invite.member.inviteStatus ?? member?.inviteStatus ?? "Invited";
  const claimTxHash = member?.claimTxHash ?? null;

  return {
    token,
    inviteId: invite.id,
    awardId: invite.member.awardId,
    memberId: invite.member.id,
    contractAwardId: awardBlock.award.contractAwardId,
    eventName: awardBlock.event.name,
    projectName: awardBlock.project.name,
    awardTitle: awardBlock.award.rank
      ? `${awardBlock.award.rank} - ${awardBlock.award.title}`
      : awardBlock.award.title,
    recipientName: invite.member.displayName,
    allocationLabel: `${formatReward(
      invite.member.allocation,
      awardBlock.award.rewardTokenDecimals
    )} ${awardBlock.award.rewardTokenSymbol}`,
    statusLabel: formatInviteStatusLabel(inviteStatus),
    walletLabel: walletAddress ? shortenAddress(walletAddress) : "미연결",
    expiresAtLabel: formatDateLabel(invite.expiresAt),
    canConnectWallet: walletAddress === null && inviteStatus !== "Claimed",
    canClaim: walletAddress !== null && inviteStatus === "WalletConnected",
    isClaimed: inviteStatus === "Claimed" || claimTxHash !== null,
    claimTxLabel: claimTxHash ? shortenAddress(claimTxHash) : "기록 없음"
  };
}

export async function executeClaimInviteAction({
  awardId,
  memberId,
  contractAwardId,
  from,
  registryAddress,
  provider,
  api = defaultClaimInviteActionApi
}: {
  awardId: string;
  memberId: string;
  contractAwardId: string | null;
  from: string;
  registryAddress: string;
  provider: ContractWriteProvider;
  api?: ClaimInviteActionApi;
}): Promise<{ txHash: string }> {
  if (!contractAwardId) {
    throw new Error("CONTRACT_AWARD_ID_REQUIRED");
  }

  const txHash = await sendContractWrite(
    provider,
    buildClaimAwardRequest({
      from,
      registryAddress,
      awardId: contractAwardId
    })
  );

  const claimed = await api.post<ClaimedAwardMemberResponse, { claimTxHash: string }>(
    `/award-members/${encodeURIComponent(memberId)}/claim`,
    { claimTxHash: txHash }
  );

  await api.post<
    { transaction: { id: string } },
    {
      transactionType: string;
      walletAddress: string;
      txHash: string;
    }
  >(`/awards/${encodeURIComponent(awardId)}/transactions`, {
    transactionType: "AwardClaimed",
    walletAddress: from,
    txHash
  });

  return { txHash: claimed.member.claimTxHash };
}

function renderInteractiveClaimInvite(
  content: HTMLElement,
  token: string,
  invite: ClaimInviteLookup,
  awardBlock: AwardBlockDetail
): void {
  const viewModel = mapClaimInviteToViewModel(invite, awardBlock, token);
  content.innerHTML = renderClaimInviteContent(viewModel);

  const connectButton = content.querySelector<HTMLButtonElement>("[data-claim-connect]");
  connectButton?.addEventListener("click", async () => {
    connectButton.disabled = true;
    connectButton.textContent = "지갑 연결 중...";

    try {
      const connected = await apiPost<ConnectedClaimInviteResponse>(
        `/claim-invites/${encodeURIComponent(token)}/connect-wallet`
      );
      const refreshedAward = await apiGet<AwardBlockDetailResponse>(
        `/award-blocks/${encodeURIComponent(connected.invite.member.awardId)}`
      );
      renderInteractiveClaimInvite(content, token, connected.invite, refreshedAward.awardBlock);
    } catch {
      content.insertAdjacentHTML("afterbegin", renderClaimActionError("지갑 세션이 필요합니다"));
      connectButton.disabled = false;
      connectButton.textContent = "지갑 연결";
    }
  });

  const claimForm = content.querySelector<HTMLFormElement>("[data-claim-form]");
  claimForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = claimForm.querySelector<HTMLButtonElement>("button[type='submit']");
    const provider = getBrowserEthereumProvider();
    const from = walletState.address;

    if (!provider || !from || chainConfig.registryAddress === "") {
      claimForm.insertAdjacentHTML(
        "beforebegin",
        renderClaimActionError("지갑 세션과 Registry 컨트랙트 주소가 필요합니다")
      );
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "지갑 승인 대기 중...";
    }

    try {
      const result = await executeClaimInviteAction({
        awardId: viewModel.awardId,
        memberId: viewModel.memberId,
        contractAwardId: viewModel.contractAwardId,
        from,
        registryAddress: chainConfig.registryAddress,
        provider
      });
      content.innerHTML = renderClaimSuccess(result.txHash);
    } catch {
      claimForm.insertAdjacentHTML(
        "beforebegin",
        renderClaimActionError("클레임 트랜잭션을 완료하지 못했습니다")
      );
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "리워드 클레임 실행";
      }
    }
  });
}

function renderClaimInviteContent(invite: ClaimInviteViewModel): string {
  return `
    <section class="claim-summary">
      <div>
        <p class="eyebrow">${escapeHtml(invite.eventName)}</p>
        <h2>${escapeHtml(invite.awardTitle)}</h2>
        <p>${escapeHtml(invite.projectName)} - ${escapeHtml(invite.recipientName)}</p>
      </div>
      <span class="status-badge">${escapeHtml(invite.statusLabel)}</span>
    </section>
    <div class="detail-grid">
      ${renderClaimMetric("배정 수량", invite.allocationLabel)}
      ${renderClaimMetric("지갑", invite.walletLabel)}
      ${renderClaimMetric("만료일", invite.expiresAtLabel)}
      ${renderClaimMetric("클레임 tx", invite.claimTxLabel)}
    </div>
    <section class="detail-section">
      <h2>수신자 작업</h2>
      ${renderClaimActions(invite)}
    </section>
  `;
}

function renderClaimMetric(label: string, value: string): string {
  return `
    <div class="profile-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderClaimActions(invite: ClaimInviteViewModel): string {
  if (invite.isClaimed) {
    return `
      <div class="claim-action-panel">
        <p class="eyebrow">클레임 기록 완료</p>
        <h3>리워드 클레임이 완료되었습니다</h3>
      </div>
    `;
  }

  if (invite.canClaim) {
    return `
      <form class="claim-action-panel" data-claim-form>
        <p>지갑에서 claim 트랜잭션을 승인하면 tx hash가 자동으로 저장됩니다.</p>
        <button class="button" type="submit">리워드 클레임 실행</button>
      </form>
    `;
  }

  if (invite.canConnectWallet) {
    return `
      <div class="claim-action-panel">
        <p>상단에서 지갑 세션을 만든 뒤 이 초대에 지갑을 연결하세요.</p>
        <button class="button" type="button" data-claim-connect>지갑 연결</button>
      </div>
    `;
  }

  return `
    <div class="claim-action-panel">
      <p>현재 상태에서는 이 초대를 클레임할 수 없습니다.</p>
    </div>
  `;
}

function renderClaimLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderClaimMissingToken(): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">초대 없음</p>
      <h2>클레임 토큰이 필요합니다</h2>
    </div>
  `;
}

function renderClaimError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">초대 오류</p>
      <h2>클레임 초대를 불러오지 못했습니다</h2>
    </div>
  `;
}

function renderClaimActionError(message: string): string {
  return `
    <div class="empty-state empty-state--error claim-action-error">
      <p class="eyebrow">작업 실패</p>
      <h2>${escapeHtml(message)}</h2>
    </div>
  `;
}

function renderClaimSuccess(claimTxHash: string): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">클레임 기록 완료</p>
      <h2>${escapeHtml(shortenAddress(claimTxHash))}</h2>
    </div>
  `;
}

function formatReward(value: string, decimals: number): string {
  try {
    return formatTokenAmount(BigInt(value), decimals);
  } catch {
    return value;
  }
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

function formatInviteStatusLabel(value: string): string {
  if (value === "Invited") return "초대됨";
  if (value === "WalletConnected") return "지갑 연결됨";
  if (value === "Claimed") return "클레임 완료";
  if (value === "Revoked") return "취소됨";

  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
