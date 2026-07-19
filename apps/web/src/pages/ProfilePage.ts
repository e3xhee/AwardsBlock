import { apiGet } from "../api/client";
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
    claimTransactions: Array<{
      id: string;
      txHashLabel: string;
      blockLabel: string;
      createdAtLabel: string;
    }>;
  }>;
};

export function renderProfilePage(walletAddress: string | null = null): string {
  const addressLabel = walletAddress ? escapeHtml(shortenAddress(walletAddress)) : "No wallet";

  return `
    <main class="page-shell profile-page">
      <section class="profile-hero">
        <div>
          <p class="eyebrow">Wallet Profile</p>
          <h1>${addressLabel}</h1>
        </div>
        <span class="status-badge">Public</span>
      </section>
      <section id="profile-content" class="profile-content" aria-live="polite">
        ${walletAddress ? renderProfileLoading() : renderProfileMissingWallet()}
      </section>
    </main>
  `;
}

export async function mountProfilePage(root: ParentNode, walletAddress: string): Promise<void> {
  const content = root.querySelector<HTMLElement>("#profile-content");

  if (!content) return;

  content.innerHTML = renderProfileLoading();

  try {
    const response = await apiGet<WalletProfileResponse>(
      `/profiles/${encodeURIComponent(walletAddress)}`
    );
    content.innerHTML = renderProfileContent(mapProfileToViewModel(response.profile));
  } catch {
    content.innerHTML = renderProfileError();
  }
}

export function mapProfileToViewModel(profile: WalletProfile): WalletProfileViewModel {
  return {
    walletAddress: profile.walletAddress,
    walletLabel: shortenAddress(profile.walletAddress),
    stats: [
      { label: "Awards", value: profile.stats.awardCount.toString() },
      { label: "Claimed", value: profile.stats.claimedAwardCount.toString() },
      { label: "Projects", value: profile.stats.projectCount.toString() }
    ],
    awards: profile.awards.map((award) => {
      const claimTransaction = award.claimTransactions[0];

      return {
        memberId: award.member.id,
        title: award.award.title,
        rankLabel: award.award.rank ?? "Unranked",
        projectName: award.project.name,
        eventName: award.event.name,
        recipientName: award.member.displayName,
        rewardLabel: `${formatReward(award.member.allocation, award.award.rewardTokenDecimals)} ${
          award.award.rewardTokenSymbol
        }`,
        status: award.member.inviteStatus,
        claimedAtLabel: formatDateLabel(award.member.claimedAt),
        claimTransactionLabel: claimTransaction
          ? shortenAddress(claimTransaction.txHash)
          : formatNullableHash(award.member.claimTxHash),
        claimTransactions: award.claimTransactions.map((transaction) => ({
          id: transaction.id,
          txHashLabel: shortenAddress(transaction.txHash),
          blockLabel:
            transaction.blockNumber === null ? "Pending block" : `#${transaction.blockNumber}`,
          createdAtLabel: formatDateLabel(transaction.createdAt)
        }))
      };
    })
  };
}

function renderProfileContent(profile: WalletProfileViewModel): string {
  if (profile.awards.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">No awards</p>
        <h2>${escapeHtml(profile.walletLabel)}</h2>
      </div>
    `;
  }

  return `
    <div class="profile-summary">
      ${profile.stats.map(renderStat).join("")}
    </div>
    <section class="profile-awards" aria-label="Award history">
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

function renderProfileAward(award: WalletProfileViewModel["awards"][number]): string {
  return `
    <article class="profile-award">
      <header class="profile-award__header">
        <div>
          <p class="eyebrow">${escapeHtml(award.eventName)}</p>
          <h2>${escapeHtml(award.title)}</h2>
          <p>${escapeHtml(award.projectName)} · ${escapeHtml(award.rankLabel)}</p>
        </div>
        <span class="status-badge">${escapeHtml(award.status)}</span>
      </header>
      <dl class="profile-award__meta">
        <div><dt>Recipient</dt><dd>${escapeHtml(award.recipientName)}</dd></div>
        <div><dt>Reward</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>Claimed</dt><dd>${escapeHtml(award.claimedAtLabel)}</dd></div>
        <div><dt>Claim tx</dt><dd>${escapeHtml(award.claimTransactionLabel)}</dd></div>
      </dl>
      ${renderClaimTransactions(award.claimTransactions)}
    </article>
  `;
}

function renderClaimTransactions(
  transactions: WalletProfileViewModel["awards"][number]["claimTransactions"]
): string {
  if (transactions.length === 0) {
    return "";
  }

  return `
    <ul class="claim-transaction-list" aria-label="Claim transactions">
      ${transactions
        .map(
          (transaction) => `
            <li>
              <span>${escapeHtml(transaction.txHashLabel)}</span>
              <strong>${escapeHtml(transaction.blockLabel)}</strong>
              <small>${escapeHtml(transaction.createdAtLabel)}</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
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
      <p class="eyebrow">Missing wallet</p>
      <h2>Profile unavailable</h2>
    </div>
  `;
}

function renderProfileError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">Profile error</p>
      <h2>Unable to load wallet history</h2>
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
  return value ? shortenAddress(value) : "Not recorded";
}

function formatDateLabel(value: string | null): string {
  if (!value) return "Not claimed";

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
