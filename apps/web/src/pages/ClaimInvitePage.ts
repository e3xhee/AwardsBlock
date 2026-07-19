import { apiGet, apiPost } from "../api/client";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";
import type { AwardBlockDetail, AwardBlockDetailResponse } from "./AwardDetailPage";
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

type ClaimInviteViewModel = {
  token: string;
  inviteId: string;
  awardId: string;
  memberId: string;
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

export function renderClaimInvitePage(token: string | null = null): string {
  return `
    <main class="page-shell claim-page">
      <section class="claim-hero">
        <div>
          <p class="eyebrow">Claim Invite</p>
          <h1>${token ? "Award Claim" : "Claim unavailable"}</h1>
        </div>
        <div class="page-actions">
          <span class="status-badge">Recipient</span>
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
    statusLabel: inviteStatus,
    walletLabel: walletAddress ? shortenAddress(walletAddress) : "Not connected",
    expiresAtLabel: formatDateLabel(invite.expiresAt),
    canConnectWallet: walletAddress === null && inviteStatus !== "Claimed",
    canClaim: walletAddress !== null && inviteStatus === "WalletConnected",
    isClaimed: inviteStatus === "Claimed" || claimTxHash !== null,
    claimTxLabel: claimTxHash ? shortenAddress(claimTxHash) : "Not recorded"
  };
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
    connectButton.textContent = "Connecting...";

    try {
      const connected = await apiPost<ConnectedClaimInviteResponse>(
        `/claim-invites/${encodeURIComponent(token)}/connect-wallet`
      );
      const refreshedAward = await apiGet<AwardBlockDetailResponse>(
        `/award-blocks/${encodeURIComponent(connected.invite.member.awardId)}`
      );
      renderInteractiveClaimInvite(content, token, connected.invite, refreshedAward.awardBlock);
    } catch {
      content.insertAdjacentHTML("afterbegin", renderClaimActionError("Wallet session required"));
      connectButton.disabled = false;
      connectButton.textContent = "Attach wallet";
    }
  });

  const claimForm = content.querySelector<HTMLFormElement>("[data-claim-form]");
  claimForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(claimForm);
    const claimTxHash = String(form.get("claimTxHash") ?? "").trim();
    const submitButton = claimForm.querySelector<HTMLButtonElement>("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Recording...";
    }

    try {
      const claimed = await apiPost<ClaimedAwardMemberResponse>(
        `/award-members/${encodeURIComponent(viewModel.memberId)}/claim`,
        { claimTxHash }
      );
      content.innerHTML = renderClaimSuccess(claimed.member.claimTxHash);
    } catch {
      claimForm.insertAdjacentHTML("beforebegin", renderClaimActionError("Claim could not be recorded"));
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Record claim";
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
      ${renderClaimMetric("Allocation", invite.allocationLabel)}
      ${renderClaimMetric("Wallet", invite.walletLabel)}
      ${renderClaimMetric("Expires", invite.expiresAtLabel)}
      ${renderClaimMetric("Claim tx", invite.claimTxLabel)}
    </div>
    <section class="detail-section">
      <h2>Recipient Actions</h2>
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
        <p class="eyebrow">Claim recorded</p>
        <h3>Reward claim is complete</h3>
      </div>
    `;
  }

  if (invite.canClaim) {
    return `
      <form class="claim-action-panel" data-claim-form>
        <label>
          <span>Claim transaction hash</span>
          <input name="claimTxHash" type="text" placeholder="0x..." required />
        </label>
        <button class="button" type="submit">Record claim</button>
      </form>
    `;
  }

  if (invite.canConnectWallet) {
    return `
      <div class="claim-action-panel">
        <p>Sign in with a wallet session above, then attach that wallet to this invite.</p>
        <button class="button" type="button" data-claim-connect>Attach wallet</button>
      </div>
    `;
  }

  return `
    <div class="claim-action-panel">
      <p>This invite cannot be claimed from its current state.</p>
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
      <p class="eyebrow">Missing invite</p>
      <h2>Claim token is required</h2>
    </div>
  `;
}

function renderClaimError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">Invite error</p>
      <h2>Unable to load claim invite</h2>
    </div>
  `;
}

function renderClaimActionError(message: string): string {
  return `
    <div class="empty-state empty-state--error claim-action-error">
      <p class="eyebrow">Action failed</p>
      <h2>${escapeHtml(message)}</h2>
    </div>
  `;
}

function renderClaimSuccess(claimTxHash: string): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">Claim recorded</p>
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
