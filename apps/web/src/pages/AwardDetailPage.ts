import { apiGet } from "../api/client";
import {
  mountAwardOnchainActions,
  renderAwardOnchainActions,
  type OnchainAward
} from "../components/AwardOnchainActions";
import { formatTokenAmount, shortenAddress } from "../utils/format";

export type AwardBlockDetailResponse = {
  awardBlock: AwardBlockDetail;
};

export type AwardBlockDetail = {
  id: string;
  organizerWallet: string;
  event: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string | null;
    officialUrl: string | null;
  };
  project: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    githubUrl: string | null;
    demoUrl: string | null;
  };
  award: {
    id: string;
    title: string;
    rank: string | null;
    reason: string | null;
    judgingSummary: string | null;
    status: string;
    rewardTokenSymbol: string;
    rewardTokenAddress: string;
    rewardTokenDecimals: number;
    totalReward: string;
    claimStart: string;
    claimEnd: string;
    metadataUri: string | null;
    metadataHash: string | null;
    contractAwardId: string | null;
    createTxHash: string | null;
    fundTxHash: string | null;
    finalizeTxHash: string | null;
  };
  members: AwardBlockMember[];
  transactions: AwardBlockTransaction[];
  claimStats: {
    recipientCount: number;
    claimedCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

type AwardBlockMember = {
  id: string;
  displayName: string;
  walletAddress: string | null;
  allocation: string;
  inviteStatus: string;
  walletConnectedAt: string | null;
  claimedAt: string | null;
  claimTxHash: string | null;
};

type AwardBlockTransaction = {
  id: string;
  transactionType: string;
  walletAddress: string;
  txHash: string;
  blockNumber: number | null;
  createdAt: string;
};

type AwardBlockDetailViewModel = {
  id: string;
  eventName: string;
  projectName: string;
  projectTagline: string;
  projectDescription: string;
  awardTitle: string;
  awardReason: string;
  judgingSummary: string;
  status: string;
  organizerLabel: string;
  rewardLabel: string;
  claimProgress: string;
  claimWindowLabel: string;
  verificationLabel: string;
  metadataHashLabel: string;
  contractAwardIdLabel: string;
  onchainAward: OnchainAward;
  members: Array<{
    id: string;
    displayName: string;
    walletLabel: string;
    allocationLabel: string;
    status: string;
    claimedAtLabel: string;
    claimTxLabel: string;
  }>;
  transactions: Array<{
    id: string;
    typeLabel: string;
    walletLabel: string;
    txHashLabel: string;
    blockLabel: string;
    createdAtLabel: string;
  }>;
};

export function renderAwardDetailPage(awardId: string | null = null): string {
  return `
    <main class="page-shell award-detail-page">
      <section class="award-detail-hero">
        <div>
          <p class="eyebrow">어워드 블록</p>
          <h1>${awardId ? "어워드 블록" : "어워드를 사용할 수 없습니다"}</h1>
        </div>
        <span class="status-badge">공개</span>
      </section>
      <section id="award-detail-content" class="award-detail-content" aria-live="polite">
        ${awardId ? renderAwardDetailLoading() : renderAwardDetailMissingId()}
      </section>
    </main>
  `;
}

export async function mountAwardDetailPage(root: ParentNode, awardId: string): Promise<void> {
  const content = root.querySelector<HTMLElement>("#award-detail-content");

  if (!content) return;

  content.innerHTML = renderAwardDetailLoading();

  try {
    const response = await apiGet<AwardBlockDetailResponse>(
      `/award-blocks/${encodeURIComponent(awardId)}`
    );
    content.innerHTML = renderAwardDetailContent(mapAwardBlockDetailToViewModel(response.awardBlock));
    mountAwardOnchainActions(content);
  } catch {
    content.innerHTML = renderAwardDetailError();
  }
}

export function mapAwardBlockDetailToViewModel(
  awardBlock: AwardBlockDetail
): AwardBlockDetailViewModel {
  return {
    id: awardBlock.id,
    eventName: awardBlock.event.name,
    projectName: awardBlock.project.name,
    projectTagline: awardBlock.project.tagline,
    projectDescription: awardBlock.project.description,
    awardTitle: awardBlock.award.rank
      ? `${awardBlock.award.rank} - ${awardBlock.award.title}`
      : awardBlock.award.title,
    awardReason: awardBlock.award.reason ?? "기록된 선정 사유가 없습니다",
    judgingSummary: awardBlock.award.judgingSummary ?? "기록된 심사 요약이 없습니다",
    status: formatAwardStatusLabel(awardBlock.award.status),
    organizerLabel: shortenAddress(awardBlock.organizerWallet),
    rewardLabel: `${formatReward(
      awardBlock.award.totalReward,
      awardBlock.award.rewardTokenDecimals
    )} ${awardBlock.award.rewardTokenSymbol}`,
    claimProgress: `${awardBlock.claimStats.claimedCount}/${awardBlock.claimStats.recipientCount} 클레임 완료`,
    claimWindowLabel: `${formatDateLabel(awardBlock.award.claimStart)} - ${formatDateLabel(
      awardBlock.award.claimEnd
    )}`,
    verificationLabel:
      awardBlock.award.metadataHash && awardBlock.award.contractAwardId ? "검증 완료" : "검토 필요",
    metadataHashLabel: awardBlock.award.metadataHash ?? "기록 없음",
    contractAwardIdLabel: awardBlock.award.contractAwardId ?? "기록 없음",
    onchainAward: {
      id: awardBlock.award.id,
      contractAwardId: awardBlock.award.contractAwardId,
      rewardTokenAddress: awardBlock.award.rewardTokenAddress,
      totalReward: awardBlock.award.totalReward,
      status: awardBlock.award.status
    },
    members: awardBlock.members.map((member) => ({
      id: member.id,
      displayName: member.displayName,
      walletLabel: member.walletAddress ? shortenAddress(member.walletAddress) : "미연결",
      allocationLabel: `${formatReward(
        member.allocation,
        awardBlock.award.rewardTokenDecimals
      )} ${awardBlock.award.rewardTokenSymbol}`,
      status: formatInviteStatusLabel(member.inviteStatus),
      claimedAtLabel: formatNullableDateLabel(member.claimedAt),
      claimTxLabel: member.claimTxHash ? shortenAddress(member.claimTxHash) : "기록 없음"
    })),
    transactions: awardBlock.transactions.map((transaction) => ({
      id: transaction.id,
      typeLabel: formatTransactionTypeLabel(transaction.transactionType),
      walletLabel: shortenAddress(transaction.walletAddress),
      txHashLabel: shortenAddress(transaction.txHash),
      blockLabel:
        transaction.blockNumber === null ? "블록 대기 중" : `#${transaction.blockNumber}`,
      createdAtLabel: formatDateLabel(transaction.createdAt)
    }))
  };
}

function renderAwardDetailContent(awardBlock: AwardBlockDetailViewModel): string {
  return `
    <section class="award-detail-summary">
      <div>
        <p class="eyebrow">${escapeHtml(awardBlock.eventName)}</p>
        <h2>${escapeHtml(awardBlock.awardTitle)}</h2>
        <p>${escapeHtml(awardBlock.projectName)} - ${escapeHtml(awardBlock.projectTagline)}</p>
      </div>
      <span class="status-badge">${escapeHtml(awardBlock.status)}</span>
    </section>
    <div class="detail-grid">
      ${renderDetailMetric("주최자", awardBlock.organizerLabel)}
      ${renderDetailMetric("리워드", awardBlock.rewardLabel)}
      ${renderDetailMetric("클레임", awardBlock.claimProgress)}
      ${renderDetailMetric("검증", awardBlock.verificationLabel)}
    </div>
    <section class="detail-section">
      <h2>프로젝트 정보</h2>
      <p>${escapeHtml(awardBlock.projectDescription)}</p>
      <p>${escapeHtml(awardBlock.awardReason)}</p>
      <p>${escapeHtml(awardBlock.judgingSummary)}</p>
    </section>
    <section class="detail-section">
      <h2>검증 정보</h2>
      <dl class="detail-metadata">
        <div><dt>클레임 기간</dt><dd>${escapeHtml(awardBlock.claimWindowLabel)}</dd></div>
        <div><dt>메타데이터 해시</dt><dd>${escapeHtml(awardBlock.metadataHashLabel)}</dd></div>
        <div><dt>컨트랙트 어워드 ID</dt><dd>${escapeHtml(awardBlock.contractAwardIdLabel)}</dd></div>
      </dl>
    </section>
    ${renderAwardOnchainActions(awardBlock.onchainAward)}
    <section class="detail-section">
      <h2>수신자</h2>
      ${renderMembers(awardBlock.members)}
    </section>
    <section class="detail-section">
      <h2>트랜잭션</h2>
      ${renderTransactions(awardBlock.transactions)}
    </section>
  `;
}

function renderDetailMetric(label: string, value: string): string {
  return `
    <div class="profile-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderMembers(members: AwardBlockDetailViewModel["members"]): string {
  if (members.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">수신자 없음</p>
        <h2>아직 어워드 멤버가 없습니다</h2>
      </div>
    `;
  }

  return `
    <div class="award-member-list">
      ${members.map(renderMember).join("")}
    </div>
  `;
}

function renderMember(member: AwardBlockDetailViewModel["members"][number]): string {
  return `
    <article class="award-member-row">
      <div>
        <strong>${escapeHtml(member.displayName)}</strong>
        <span>${escapeHtml(member.walletLabel)}</span>
      </div>
      <dl>
        <div><dt>배정 수량</dt><dd>${escapeHtml(member.allocationLabel)}</dd></div>
        <div><dt>상태</dt><dd>${escapeHtml(member.status)}</dd></div>
        <div><dt>클레임일</dt><dd>${escapeHtml(member.claimedAtLabel)}</dd></div>
        <div><dt>클레임 tx</dt><dd>${escapeHtml(member.claimTxLabel)}</dd></div>
      </dl>
    </article>
  `;
}

function renderTransactions(
  transactions: AwardBlockDetailViewModel["transactions"]
): string {
  if (transactions.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">트랜잭션 없음</p>
        <h2>기록된 온체인 활동이 없습니다</h2>
      </div>
    `;
  }

  return `
    <ul class="claim-transaction-list" aria-label="어워드 트랜잭션">
      ${transactions
        .map(
          (transaction) => `
            <li>
              <span>${escapeHtml(transaction.txHashLabel)}</span>
              <strong>${escapeHtml(transaction.typeLabel)}</strong>
              <small>${escapeHtml(transaction.blockLabel)} - ${escapeHtml(
                transaction.createdAtLabel
              )}</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderAwardDetailLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderAwardDetailMissingId(): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">어워드 없음</p>
      <h2>어워드 ID가 필요합니다</h2>
    </div>
  `;
}

function renderAwardDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">어워드 오류</p>
      <h2>어워드 블록을 불러오지 못했습니다</h2>
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

function formatNullableDateLabel(value: string | null): string {
  return value ? formatDateLabel(value) : "미클레임";
}

function formatAwardStatusLabel(value: string): string {
  if (value === "Draft") return "초안";
  if (value === "ReadyToFund") return "예치 대기";
  if (value === "Funded") return "예치 완료";
  if (value === "Claiming") return "클레임 진행 중";
  if (value === "Closed") return "종료";

  return value;
}

function formatInviteStatusLabel(value: string): string {
  if (value === "Invited") return "초대됨";
  if (value === "Pending") return "대기 중";
  if (value === "WalletConnected") return "지갑 연결됨";
  if (value === "Claimed") return "클레임 완료";
  if (value === "Revoked") return "취소됨";

  return value;
}

function formatTransactionTypeLabel(value: string): string {
  if (value === "AwardCreated") return "어워드 생성";
  if (value === "RecipientsSet") return "수신자 설정";
  if (value === "AwardFunded") return "리워드 예치";
  if (value === "AwardFinalized") return "어워드 확정";
  if (value === "AwardClaimed") return "리워드 클레임";

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
