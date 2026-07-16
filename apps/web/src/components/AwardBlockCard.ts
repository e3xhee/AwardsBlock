import type { AwardBlockSummary } from "../types/award";

export function renderAwardBlockCard(award: AwardBlockSummary): string {
  const verificationLabel = award.verified ? "온체인 검증 완료" : "검증 필요";

  return `
    <article class="award-card">
      <div>
        <p class="eyebrow">${award.eventName}</p>
        <h3>${award.awardTitle}</h3>
        <strong>${award.projectName}</strong>
      </div>
      <dl class="award-card__meta">
        <div><dt>운영자</dt><dd>${award.organizer}</dd></div>
        <div><dt>상금</dt><dd>${award.rewardLabel}</dd></div>
        <div><dt>Claim</dt><dd>${award.claimProgress}</dd></div>
        <div><dt>검증</dt><dd>${verificationLabel}</dd></div>
      </dl>
    </article>
  `;
}
