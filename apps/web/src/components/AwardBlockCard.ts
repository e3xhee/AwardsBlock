import type { AwardBlockSummary } from "../types/award";

export function renderAwardBlockCard(award: AwardBlockSummary): string {
  const verificationLabel = award.verified ? "검증 완료" : "검토 필요";

  return `
    <article class="award-card">
      <div>
        <p class="eyebrow">${escapeHtml(award.eventName)}</p>
        <h3>${escapeHtml(award.awardTitle)}</h3>
        <strong>${escapeHtml(award.projectName)}</strong>
      </div>
      <dl class="award-card__meta">
        <div><dt>주최자</dt><dd>${escapeHtml(award.organizer)}</dd></div>
        <div><dt>리워드</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>클레임</dt><dd>${escapeHtml(award.claimProgress)}</dd></div>
        <div><dt>상태</dt><dd>${verificationLabel}</dd></div>
      </dl>
      <a class="text-link" href="${escapeHtml(award.href)}">어워드 보기</a>
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
