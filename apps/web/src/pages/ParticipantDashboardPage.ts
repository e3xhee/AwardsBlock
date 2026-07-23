import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

export function renderParticipantDashboardPage(): string {
  return `
    <main class="page-shell participant-dashboard-page">
      <section class="role-hero">
        <div>
          <p class="eyebrow">참가자 대시보드</p>
          <h1>프로젝트 제출을 시작하세요</h1>
          <p>참가자는 행사 등록이나 우승자 선택을 하지 않습니다. 등록된 행사에 프로젝트를 제출하는 흐름만 사용합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">참가자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="role-grid" aria-label="참가자 작업">
        <a class="role-card" href="/participant/projects">
          <span class="status-badge">참가</span>
          <h2>프로젝트 제출</h2>
          <p>참가할 행사를 선택하고 프로젝트 정보와 링크를 제출합니다.</p>
        </a>
        <a class="role-card" href="/login">
          <span class="status-badge">역할 변경</span>
          <h2>다른 역할로 로그인</h2>
          <p>등록자 지갑으로 행사 등록이나 우승자 선택을 해야 한다면 역할을 다시 선택합니다.</p>
        </a>
      </section>
    </main>
  `;
}

export function mountParticipantDashboardPage(root: ParentNode): void {
  mountWalletConnectButton(root);
}