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
          <p class="eyebrow">Award Block</p>
          <h1>${awardId ? "Award Block" : "Award unavailable"}</h1>
        </div>
        <span class="status-badge">Public</span>
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
    awardReason: awardBlock.award.reason ?? "No reason recorded",
    judgingSummary: awardBlock.award.judgingSummary ?? "No judging summary recorded",
    status: awardBlock.award.status,
    organizerLabel: shortenAddress(awardBlock.organizerWallet),
    rewardLabel: `${formatReward(
      awardBlock.award.totalReward,
      awardBlock.award.rewardTokenDecimals
    )} ${awardBlock.award.rewardTokenSymbol}`,
    claimProgress: `${awardBlock.claimStats.claimedCount}/${awardBlock.claimStats.recipientCount} claimed`,
    claimWindowLabel: `${formatDateLabel(awardBlock.award.claimStart)} - ${formatDateLabel(
      awardBlock.award.claimEnd
    )}`,
    verificationLabel:
      awardBlock.award.metadataHash && awardBlock.award.contractAwardId ? "Verified" : "Needs review",
    metadataHashLabel: awardBlock.award.metadataHash ?? "Not recorded",
    contractAwardIdLabel: awardBlock.award.contractAwardId ?? "Not recorded",
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
      walletLabel: member.walletAddress ? shortenAddress(member.walletAddress) : "Not connected",
      allocationLabel: `${formatReward(
        member.allocation,
        awardBlock.award.rewardTokenDecimals
      )} ${awardBlock.award.rewardTokenSymbol}`,
      status: member.inviteStatus,
      claimedAtLabel: formatNullableDateLabel(member.claimedAt),
      claimTxLabel: member.claimTxHash ? shortenAddress(member.claimTxHash) : "Not recorded"
    })),
    transactions: awardBlock.transactions.map((transaction) => ({
      id: transaction.id,
      typeLabel: transaction.transactionType,
      walletLabel: shortenAddress(transaction.walletAddress),
      txHashLabel: shortenAddress(transaction.txHash),
      blockLabel:
        transaction.blockNumber === null ? "Pending block" : `#${transaction.blockNumber}`,
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
      ${renderDetailMetric("Organizer", awardBlock.organizerLabel)}
      ${renderDetailMetric("Reward", awardBlock.rewardLabel)}
      ${renderDetailMetric("Claim", awardBlock.claimProgress)}
      ${renderDetailMetric("Verification", awardBlock.verificationLabel)}
    </div>
    <section class="detail-section">
      <h2>Project Context</h2>
      <p>${escapeHtml(awardBlock.projectDescription)}</p>
      <p>${escapeHtml(awardBlock.awardReason)}</p>
      <p>${escapeHtml(awardBlock.judgingSummary)}</p>
    </section>
    <section class="detail-section">
      <h2>Verification</h2>
      <dl class="detail-metadata">
        <div><dt>Claim window</dt><dd>${escapeHtml(awardBlock.claimWindowLabel)}</dd></div>
        <div><dt>Metadata hash</dt><dd>${escapeHtml(awardBlock.metadataHashLabel)}</dd></div>
        <div><dt>Contract award ID</dt><dd>${escapeHtml(awardBlock.contractAwardIdLabel)}</dd></div>
      </dl>
    </section>
    ${renderAwardOnchainActions(awardBlock.onchainAward)}
    <section class="detail-section">
      <h2>Recipients</h2>
      ${renderMembers(awardBlock.members)}
    </section>
    <section class="detail-section">
      <h2>Transactions</h2>
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
        <p class="eyebrow">No recipients</p>
        <h2>No award members yet</h2>
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
        <div><dt>Allocation</dt><dd>${escapeHtml(member.allocationLabel)}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(member.status)}</dd></div>
        <div><dt>Claimed</dt><dd>${escapeHtml(member.claimedAtLabel)}</dd></div>
        <div><dt>Claim tx</dt><dd>${escapeHtml(member.claimTxLabel)}</dd></div>
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
        <p class="eyebrow">No transactions</p>
        <h2>No on-chain activity recorded</h2>
      </div>
    `;
  }

  return `
    <ul class="claim-transaction-list" aria-label="Award transactions">
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
      <p class="eyebrow">Missing award</p>
      <h2>Award ID is required</h2>
    </div>
  `;
}

function renderAwardDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">Award error</p>
      <h2>Unable to load award block</h2>
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
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

function formatNullableDateLabel(value: string | null): string {
  return value ? formatDateLabel(value) : "Not claimed";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
