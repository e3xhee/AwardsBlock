import { handleRoleLogin, isLoginRole } from "../auth/roleLogin";

export function renderRoleLoginPage(): string {
  return `
    <main class="page-shell role-login-page">
      <section class="role-hero">
        <div>
          <p class="eyebrow">역할 로그인</p>
          <h1>역할을 선택하고 지갑으로 로그인하세요</h1>
          <p>등록자는 행사 등록과 우승자 선택 화면으로, 참가자는 프로젝트 제출 화면으로 분리해서 진입합니다.</p>
        </div>
      </section>
      <section class="role-grid" aria-label="역할별 지갑 로그인">
        <article class="role-card">
          <span class="status-badge">등록자</span>
          <h2>등록자 로그인</h2>
          <p>행사를 만들고 참가자가 제출한 프로젝트 중 우승자를 선택합니다.</p>
          <button class="button" type="button" data-role-login="organizer">등록자로 지갑 연결</button>
        </article>
        <article class="role-card">
          <span class="status-badge">참가자</span>
          <h2>참가자 로그인</h2>
          <p>등록된 행사에 프로젝트 설명, GitHub, 데모 링크를 제출합니다.</p>
          <button class="button" type="button" data-role-login="participant">참가자로 지갑 연결</button>
        </article>
      </section>
      <aside id="role-login-status" class="organizer-result" aria-live="polite">
        <p class="eyebrow">대기 중</p>
        <h2>먼저 역할을 선택하세요</h2>
        <p>선택한 역할은 지갑 세션과 함께 저장되고, 로그인 후 각 역할의 첫 화면으로 이동합니다.</p>
      </aside>
    </main>
  `;
}

export function mountRoleLoginPage(root: ParentNode): void {
  const status = root.querySelector<HTMLElement>("#role-login-status");
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-role-login]");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const role = button.dataset.roleLogin ?? "";

      if (!isLoginRole(role)) return;

      setButtonsDisabled(buttons, true);
      if (status) {
        status.innerHTML = `
          <p class="eyebrow">로그인 중</p>
          <h2>${role === "organizer" ? "등록자" : "참가자"} 지갑 서명 대기 중</h2>
          <span class="loading-bar"></span>
        `;
      }

      try {
        await handleRoleLogin(role);
      } catch {
        setButtonsDisabled(buttons, false);
        if (status) {
          status.innerHTML = `
            <p class="eyebrow">로그인 실패</p>
            <h2>지갑 로그인을 완료하지 못했습니다</h2>
            <p>지갑 연결 상태를 확인하고 같은 역할로 다시 시도하세요.</p>
          `;
        }
      }
    });
  });
}

function setButtonsDisabled(buttons: NodeListOf<HTMLButtonElement>, disabled: boolean): void {
  buttons.forEach((button) => {
    button.disabled = disabled;
  });
}