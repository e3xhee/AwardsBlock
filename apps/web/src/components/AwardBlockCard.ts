import type { AwardBlockSummary } from "../types/award";

export function renderAwardBlockCard(award: AwardBlockSummary): string {
  return `
    <a class="award-card" href="${escapeHtml(award.href)}" aria-label="${escapeHtml(award.awardTitle)} 상세 보기">
      <div class="award-card__main">
        <p class="eyebrow">${escapeHtml(award.eventName)}</p>
        <h3>${escapeHtml(award.awardTitle)}</h3>
        <strong>${escapeHtml(award.projectName)}</strong>
        <p>${escapeHtml(award.projectTagline)}</p>
      </div>
      <dl class="award-card__meta">
        <div><dt>행사일</dt><dd>${escapeHtml(award.eventDateLabel)}</dd></div>
        <div><dt>주최자</dt><dd>${escapeHtml(award.organizer)}</dd></div>
        <div><dt>리워드</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>수상자</dt><dd>${escapeHtml(award.recipientSummary)}</dd></div>
        <div><dt>클레임</dt><dd>${escapeHtml(award.claimProgress)}</dd></div>
        <div><dt>상태</dt><dd>${escapeHtml(award.statusLabel)}</dd></div>
      </dl>
      <span class="award-card__details">상세 보기</span>
    </a>
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
