import { apiGet, apiPost } from "../api/client";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

type EventSummary = {
  id: string;
  name: string;
  status: string;
};

type EventListResponse = {
  events: EventSummary[];
};

type ProjectPayload = {
  name: string;
  tagline: string;
  description: string;
  problem: string | null;
  solution: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  presentationUrl: string | null;
};

type CreatedProjectResponse = {
  project: {
    id: string;
    eventId: string;
    submitterWallet: string;
    name: string;
  };
};

const defaultProject = {
  name: "Uniport",
  tagline: "대학생 빌더를 위한 통합 프로젝트 패스포트",
  description: "Uniport는 지갑 기반 프로필, 프로젝트 활동, 수상 기록을 하나의 검증 가능한 프로필로 연결합니다.",
  problem: "대학생 빌더는 참가 이력과 프로젝트 성과를 행사 밖에서도 증명하기 어렵습니다.",
  solution: "프로젝트 제출, 수상 기록, 클레임 이력을 지갑 프로필에 연결합니다.",
  githubUrl: "https://github.com/example/uniport",
  demoUrl: "https://uniport.example",
  presentationUrl: ""
};

export function renderParticipantProjectPage(): string {
  return `
    <main class="page-shell participant-project-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">참가자 로그인</p>
          <h1>프로젝트 제출</h1>
          <p>참가자는 등록된 행사를 선택하고 자신의 지갑 세션으로 프로젝트를 제출합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">참가자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="organizer-layout">
        <form id="participant-project-form" class="organizer-form">
          <fieldset>
            <legend>제출 대상</legend>
            <label>
              <span>행사</span>
              <select name="eventId" id="participant-event-select" required>
                <option value="">행사를 불러오는 중입니다</option>
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>프로젝트 정보</legend>
            ${renderInput("프로젝트 이름", "name", defaultProject.name, true)}
            ${renderInput("한 줄 소개", "tagline", defaultProject.tagline, true)}
            ${renderTextarea("프로젝트 설명", "description", defaultProject.description, true)}
            <div class="organizer-field-grid">
              ${renderInput("문제", "problem", defaultProject.problem)}
              ${renderInput("해결책", "solution", defaultProject.solution)}
            </div>
            <div class="organizer-field-grid">
              ${renderInput("GitHub URL", "githubUrl", defaultProject.githubUrl)}
              ${renderInput("데모 URL", "demoUrl", defaultProject.demoUrl)}
              ${renderInput("발표 자료 URL", "presentationUrl", defaultProject.presentationUrl)}
            </div>
          </fieldset>
          <button class="button" type="submit">프로젝트 제출</button>
        </form>
        <aside id="participant-project-result" class="organizer-result" aria-live="polite">
          <p class="eyebrow">대기 중</p>
          <h2>참가자 지갑을 연결하세요</h2>
          <p>제출한 프로젝트에는 참가자 지갑 주소가 제출자로 저장됩니다.</p>
        </aside>
      </section>
    </main>
  `;
}

export function mountParticipantProjectPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#participant-project-form");
  const eventSelect = root.querySelector<HTMLSelectElement>("#participant-event-select");
  const result = root.querySelector<HTMLElement>("#participant-project-result");

  if (!form || !eventSelect || !result) return;

  void loadEvents(eventSelect);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const eventId = String(new FormData(form).get("eventId") ?? "");
    result.innerHTML = renderProgress("프로젝트를 제출하는 중입니다");

    try {
      const created = await submitParticipantProject(eventId, readProjectPayload(form));
      result.innerHTML = `
        <p class="eyebrow">제출 완료</p>
        <h2>${escapeHtml(created.project.name)}</h2>
        <dl class="organizer-result-list">
          <div><dt>프로젝트 ID</dt><dd>${escapeHtml(created.project.id)}</dd></div>
          <div><dt>제출자 지갑</dt><dd>${escapeHtml(created.project.submitterWallet)}</dd></div>
        </dl>
        <a class="text-link" href="/projects/${encodeURIComponent(created.project.id)}">프로젝트 보기</a>
      `;
    } catch {
      result.innerHTML = renderError("프로젝트 제출에 실패했습니다", "참가자 지갑 연결 상태와 행사 선택을 확인하세요.");
    }
  });
}

export async function submitParticipantProject(
  eventId: string,
  payload: ProjectPayload
): Promise<CreatedProjectResponse> {
  return apiPost<CreatedProjectResponse, ProjectPayload>(
    `/events/${encodeURIComponent(eventId)}/projects`,
    payload
  );
}

async function loadEvents(select: HTMLSelectElement): Promise<void> {
  try {
    const response = await apiGet<EventListResponse>("/events");
    const events = response.events.filter((event) => event.status !== "Archived");
    select.innerHTML = events.length
      ? events
          .map((event) => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}</option>`)
          .join("")
      : `<option value="">등록된 행사가 없습니다</option>`;
  } catch {
    select.innerHTML = `<option value="">행사를 불러오지 못했습니다</option>`;
  }
}

function readProjectPayload(form: HTMLFormElement): ProjectPayload {
  const formData = new FormData(form);
  return {
    name: readRequired(formData, "name"),
    tagline: readRequired(formData, "tagline"),
    description: readRequired(formData, "description"),
    problem: readNullable(formData, "problem"),
    solution: readNullable(formData, "solution"),
    githubUrl: readNullable(formData, "githubUrl"),
    demoUrl: readNullable(formData, "demoUrl"),
    presentationUrl: readNullable(formData, "presentationUrl")
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