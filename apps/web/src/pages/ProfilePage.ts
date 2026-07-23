import { apiGet } from "../api/client";
import { chainConfig } from "../blockchain/config";
import { buildTransactionExplorerUrl } from "../utils/explorer";
import { formatTokenAmount, shortenAddress } from "../utils/format";

export type WalletProfileResponse = {
  profile: WalletProfile;
};

export type WalletProfile = {
  walletAddress: string;
  stats: {
    awardCount: number;
    claimedAwardCount: number;
    projectCount: number;
  };
  awards: WalletProfileAward[];
};

export type WalletProfileAward = {
  member: {
    id: string;
    displayName: string;
    allocation: string;
    inviteStatus: string;
    walletConnectedAt: string | null;
    claimedAt: string | null;
    claimTxHash: string | null;
  };
  award: {
    id: string;
    title: string;
    rank: string | null;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    totalReward: string;
  };
  project: {
    id: string;
    name: string;
  };
  event: {
    id: string;
    name: string;
  };
  claimTransactions: Array<{
    id: string;
    transactionType: string;
    txHash: string;
    blockNumber: number | null;
    createdAt: string;
  }>;
};

type WalletProfileViewModel = {
  walletAddress: string;
  walletLabel: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
  awards: Array<{
    memberId: string;
    title: string;
    rankLabel: string;
    projectName: string;
    eventName: string;
    recipientName: string;
    rewardLabel: string;
    status: string;
    claimedAtLabel: string;
    claimTransactionLabel: string;
    claimTransactionUrl: string | null;
    claimTransactions: Array<{
      id: string;
      txHashLabel: string;
      txUrl: string | null;
      blockLabel: string;
      createdAtLabel: string;
    }>;
  }>;
};

export function renderProfilePage(walletAddress: string | null = null): string {
  const addressLabel = walletAddress
    ? escapeHtml(shortenAddress(walletAddress))
    : "지갑 없음";

  return `
    <main class="page-shell profile-page">
      <section class="profile-hero">
        <div>
          <p class="eyebrow">지갑 프로필</p>
          <h1>${addressLabel}</h1>
        </div>
        <span class="status-badge">공개</span>
      </section>
      <section id="profile-content" class="profile-content" aria-live="polite">
        ${walletAddress ? renderProfileLoading() : renderProfileMissingWallet()}
      </section>
    </main>
  `;
}

export async function mountProfilePage(
  root: ParentNode,
  walletAddress: string,
): Promise<void> {
  const content = root.querySelector<HTMLElement>("#profile-content");

  if (!content) return;

  content.innerHTML = renderProfileLoading();

  try {
    const response = await apiGet<WalletProfileResponse>(
      `/profiles/${encodeURIComponent(walletAddress)}`,
    );
    content.innerHTML = renderProfileContent(
      mapProfileToViewModel(response.profile),
    );
  } catch {
    content.innerHTML = renderProfileError();
  }
}

export function mapProfileToViewModel(
  profile: WalletProfile,
  blockExplorerUrl: string = chainConfig.blockExplorerUrl,
): WalletProfileViewModel {
  return {
    walletAddress: profile.walletAddress,
    walletLabel: shortenAddress(profile.walletAddress),
    stats: [
      { label: "어워드", value: profile.stats.awardCount.toString() },
      {
        label: "클레임 완료",
        value: profile.stats.claimedAwardCount.toString(),
      },
      { label: "프로젝트", value: profile.stats.projectCount.toString() },
    ],
    awards: profile.awards.map((award) => {
      const claimTransaction = award.claimTransactions[0];

      return {
        memberId: award.member.id,
        title: award.award.title,
        rankLabel: award.award.rank ?? "순위 없음",
        projectName: award.project.name,
        eventName: award.event.name,
        recipientName: award.member.displayName,
        rewardLabel: `${formatReward(award.member.allocation, award.award.rewardTokenDecimals)} ${
          award.award.rewardTokenSymbol
        }`,
        status: formatInviteStatusLabel(award.member.inviteStatus),
        claimedAtLabel: formatDateLabel(award.member.claimedAt),
        claimTransactionLabel: claimTransaction
          ? shortenAddress(claimTransaction.txHash)
          : formatNullableHash(award.member.claimTxHash),
        claimTransactionUrl: buildTransactionExplorerUrl(
          blockExplorerUrl,
          claimTransaction?.txHash ?? award.member.claimTxHash ?? "",
        ),
        claimTransactions: award.claimTransactions.map((transaction) => ({
          id: transaction.id,
          txHashLabel: shortenAddress(transaction.txHash),
          txUrl: buildTransactionExplorerUrl(
            blockExplorerUrl,
            transaction.txHash,
          ),
          blockLabel:
            transaction.blockNumber === null
              ? "블록 대기 중"
              : `#${transaction.blockNumber}`,
          createdAtLabel: formatDateLabel(transaction.createdAt),
        })),
      };
    }),
  };
}

export function renderProfileContent(profile: WalletProfileViewModel): string {
  if (profile.awards.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">어워드 없음</p>
        <h2>${escapeHtml(profile.walletLabel)}</h2>
      </div>
    `;
  }

  return `
    <div class="profile-summary">
      ${profile.stats.map(renderStat).join("")}
    </div>
    <section class="profile-awards" aria-label="어워드 이력">
      ${profile.awards.map(renderProfileAward).join("")}
    </section>
  `;
}

function renderStat(stat: WalletProfileViewModel["stats"][number]): string {
  return `
    <div class="profile-stat">
      <span>${escapeHtml(stat.label)}</span>
      <strong>${escapeHtml(stat.value)}</strong>
    </div>
  `;
}

function renderProfileAward(
  award: WalletProfileViewModel["awards"][number],
): string {
  return `
    <article class="profile-award">
      <header class="profile-award__header">
        <div>
          <p class="eyebrow">${escapeHtml(award.eventName)}</p>
          <h2>${escapeHtml(award.title)}</h2>
          <p>${escapeHtml(award.projectName)} - ${escapeHtml(award.rankLabel)}</p>
        </div>
        <span class="status-badge">${escapeHtml(award.status)}</span>
      </header>
      <dl class="profile-award__meta">
        <div><dt>수신자</dt><dd>${escapeHtml(award.recipientName)}</dd></div>
        <div><dt>리워드</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>클레임일</dt><dd>${escapeHtml(award.claimedAtLabel)}</dd></div>
        <div><dt>클레임 트랜잭션</dt><dd>${renderProfileTxHash(award.claimTransactionLabel, award.claimTransactionUrl)}</dd></div>
      </dl>
      ${renderClaimTransactions(award.claimTransactions)}
    </article>
  `;
}

function renderClaimTransactions(
  transactions: WalletProfileViewModel["awards"][number]["claimTransactions"],
): string {
  if (transactions.length === 0) {
    return "";
  }

  return `
    <ul class="claim-transaction-list" aria-label="클레임 트랜잭션">
      ${transactions
        .map(
          (transaction) => `
            <li>
              ${renderProfileTxHash(transaction.txHashLabel, transaction.txUrl)}
              <strong>${escapeHtml(transaction.blockLabel)}</strong>
              <small>${escapeHtml(transaction.createdAtLabel)}</small>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderProfileTxHash(label: string, txUrl: string | null): string {
  if (!txUrl) {
    return `<span>${escapeHtml(label)}</span>`;
  }

  return `<a class="text-link" href="${escapeHtml(txUrl)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function renderProfileLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderProfileMissingWallet(): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">지갑 없음</p>
      <h2>프로필을 사용할 수 없습니다</h2>
    </div>
  `;
}

function renderProfileError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">프로필 오류</p>
      <h2>지갑 기록을 불러오지 못했습니다</h2>
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

function formatNullableHash(value: string | null): string {
  return value ? shortenAddress(value) : "기록 없음";
}

function formatDateLabel(value: string | null): string {
  if (!value) return "미클레임";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatInviteStatusLabel(value: string): string {
  if (value === "Invited") return "초대됨";
  if (value === "Pending") return "대기 중";
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
