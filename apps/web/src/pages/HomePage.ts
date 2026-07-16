import { renderAwardBlockCard } from "../components/AwardBlockCard";

export function renderHomePage(): string {
  return `
    <main class="page-shell">
      <section class="hero-section">
        <p class="eyebrow">Verifiable award archive</p>
        <h1>AwardBlock</h1>
        <p class="hero-copy">해커톤 수상 결과, 프로젝트 정보, ERC-20 상금 Claim 이력을 하나의 검증 가능한 Award Block으로 연결합니다.</p>
      </section>
      <section class="section-stack">
        <h2>Latest Award Block</h2>
        ${renderAwardBlockCard({
          eventName: "De-Buthon 2026",
          awardTitle: "Grand Prize",
          projectName: "Uniport",
          organizer: "0x71A3...29F0",
          rewardLabel: "1,000 MockUSDC",
          claimProgress: "0/3 claimed",
          verified: true,
        })}
      </section>
    </main>
  `;
}
