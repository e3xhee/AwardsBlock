import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

export function renderOrganizerDashboardPage(): string {
  return `
    <main class="page-shell organizer-page organizer-dashboard-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">등록자 콘솔</p>
          <h1>행사 등록과 우승자 선택을 분리했습니다</h1>
          <p>먼저 행사를 등록하고, 참가자가 제출한 프로젝트를 확인한 뒤 별도 화면에서 우승자를 선택하세요.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">등록자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="role-grid" aria-label="등록자 작업">
        <a class="role-card" href="/organizer/events">
          <span class="status-badge">1단계</span>
          <h2>행사 등록</h2>
          <p>De-Buthon 2026 같은 행사의 기간, 장소, 공식 링크를 등록합니다.</p>
        </a>
        <a class="role-card" href="/organizer/winners">
          <span class="status-badge">3단계</span>
          <h2>우승자 선택</h2>
          <p>참가자가 제출한 프로젝트를 선택하고 Grand Prize 같은 수상 기록을 만듭니다.</p>
        </a>
      </section>
    </main>
  `;
}

export function mountOrganizerDashboardPage(root: ParentNode): void {
  mountWalletConnectButton(root);
}