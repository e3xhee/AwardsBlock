import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

export function renderRoleLoginPage(): string {
  return `
    <main class="page-shell role-login-page">
      <section class="role-hero">
        <div>
          <p class="eyebrow">역할 선택</p>
          <h1>로그인 역할을 먼저 선택하세요</h1>
          <p>등록자는 행사를 만들고 우승자를 선택합니다. 참가자는 등록된 행사에 프로젝트를 제출합니다.</p>
        </div>
        ${renderWalletConnectButton()}
      </section>
      <section class="role-grid" aria-label="역할별 시작">
        <a class="role-card" href="/organizer/events">
          <span class="status-badge">등록자</span>
          <h2>등록자로 로그인</h2>
          <p>행사 정보를 만들고 제출된 프로젝트를 검토한 뒤 우승자를 선택합니다.</p>
        </a>
        <a class="role-card" href="/participant/projects">
          <span class="status-badge">참가자</span>
          <h2>참가자로 로그인</h2>
          <p>참가할 행사를 선택하고 프로젝트 설명, GitHub, 데모 링크를 제출합니다.</p>
        </a>
      </section>
    </main>
  `;
}

export function mountRoleLoginPage(root: ParentNode): void {
  mountWalletConnectButton(root);
}