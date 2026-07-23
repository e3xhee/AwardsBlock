import { apiPost } from "../api/client";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

type EventPayload = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string | null;
  officialUrl: string | null;
  status: string;
};

type CreatedEventResponse = {
  event: {
    id: string;
    name: string;
  };
};

const defaultEvent = {
  name: "De-Buthon 2026",
  description: "Web3 빌더가 프로젝트를 제출하고 검증 가능한 수상 기록을 남기는 해커톤입니다.",
  startDate: "2026-08-01T09:00:00.000Z",
  endDate: "2026-08-01T18:00:00.000Z",
  location: "Seoul, Korea",
  officialUrl: "https://awardblock.example/events/de-buthon-2026"
};

export function renderOrganizerEventPage(): string {
  return `
    <main class="page-shell organizer-event-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">등록자 로그인</p>
          <h1>행사 등록</h1>
          <p>이 화면은 등록자만 사용하는 행사 생성 플로우입니다. 프로젝트 제출과 우승자 선택은 별도 화면에서 처리합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">등록자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="organizer-layout">
        <form id="organizer-event-form" class="organizer-form">
          <fieldset>
            <legend>행사 정보</legend>
            ${renderInput("행사 이름", "name", defaultEvent.name, true)}
            ${renderTextarea("행사 설명", "description", defaultEvent.description, true)}
            <div class="organizer-field-grid">
              ${renderInput("시작일", "startDate", defaultEvent.startDate, true)}
              ${renderInput("종료일", "endDate", defaultEvent.endDate, true)}
            </div>
            <div class="organizer-field-grid">
              ${renderInput("장소", "location", defaultEvent.location)}
              ${renderInput("공식 URL", "officialUrl", defaultEvent.officialUrl)}
            </div>
          </fieldset>
          <button class="button" type="submit">행사 등록</button>
        </form>
        <aside id="organizer-event-result" class="organizer-result" aria-live="polite">
          <p class="eyebrow">대기 중</p>
          <h2>등록자 지갑을 연결하세요</h2>
          <p>등록한 행사의 ID는 참가자 프로젝트 제출과 우승자 선택 화면에서 사용됩니다.</p>
        </aside>
      </section>
    </main>
  `;
}

export function mountOrganizerEventPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#organizer-event-form");
  const result = root.querySelector<HTMLElement>("#organizer-event-result");

  if (!form || !result) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.innerHTML = renderProgress("행사를 등록하는 중입니다");

    try {
      const created = await createOrganizerEvent(readEventPayload(form));
      result.innerHTML = `
        <p class="eyebrow">행사 등록 완료</p>
        <h2>${escapeHtml(created.event.name)}</h2>
        <dl class="organizer-result-list">
          <div><dt>행사 ID</dt><dd>${escapeHtml(created.event.id)}</dd></div>
        </dl>
        <div class="organizer-result-actions">
          <a class="text-link" href="/events/${encodeURIComponent(created.event.id)}">행사 보기</a>
          <a class="text-link" href="/participant/projects">참가자 제출 화면</a>
        </div>
      `;
    } catch {
      result.innerHTML = renderError("행사 등록에 실패했습니다", "지갑 연결 상태와 입력값을 확인하세요.");
    }
  });
}

export async function createOrganizerEvent(payload: EventPayload): Promise<CreatedEventResponse> {
  return apiPost<CreatedEventResponse, EventPayload>("/events", payload);
}

function readEventPayload(form: HTMLFormElement): EventPayload {
  const formData = new FormData(form);
  return {
    name: readRequired(formData, "name"),
    description: readRequired(formData, "description"),
    startDate: readRequired(formData, "startDate"),
    endDate: readRequired(formData, "endDate"),
    location: readNullable(formData, "location"),
    officialUrl: readNullable(formData, "officialUrl"),
    status: "Published"
  };
}

function renderInput(label: string, name: string, value: string, required = false): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" value="${escapeHtml(value)}"${required ? " required" : ""} />
    </label>
  `;
}

function renderTextarea(label: string, name: string, value: string, required = false): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea name="${escapeHtml(name)}"${required ? " required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderProgress(title: string): string {
  return `<p class="eyebrow">진행 중</p><h2>${escapeHtml(title)}</h2><span class="loading-bar"></span>`;
}

function renderError(title: string, description: string): string {
  return `<p class="eyebrow">오류</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>`;
}

function readRequired(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readNullable(formData: FormData, key: string): string | null {
  const value = readRequired(formData, key);
  return value === "" ? null : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}