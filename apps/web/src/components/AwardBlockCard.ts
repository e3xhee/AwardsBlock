import type { AwardBlockSummary } from "../types/award";

export function renderAwardBlockCard(award: AwardBlockSummary): string {
  const verificationLabel = award.verified ? "Verified" : "Needs review";

  return `
    <article class="award-card">
      <div>
        <p class="eyebrow">${escapeHtml(award.eventName)}</p>
        <h3>${escapeHtml(award.awardTitle)}</h3>
        <strong>${escapeHtml(award.projectName)}</strong>
      </div>
      <dl class="award-card__meta">
        <div><dt>Organizer</dt><dd>${escapeHtml(award.organizer)}</dd></div>
        <div><dt>Reward</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>Claim</dt><dd>${escapeHtml(award.claimProgress)}</dd></div>
        <div><dt>Status</dt><dd>${verificationLabel}</dd></div>
      </dl>
      <a class="text-link" href="${escapeHtml(award.href)}">View award</a>
    </article>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
