import { apiGet, apiPost } from "../api/client";
import { loadWalletSession, type WalletSession } from "../auth/walletAuth";
import {
  mountWalletConnectButton,
  renderWalletConnectButton,
} from "../components/WalletConnectButton";

export type ParticipantEventSummary = {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  submissionDeadline?: string | null;
  location?: string | null;
  description?: string;
};

type EventListResponse = {
  events: ParticipantEventSummary[];
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
  project: ParticipantProjectSummary;
};

type ParticipantProjectSummary = {
  id: string;
  eventId: string;
  eventName?: string;
  submitterWallet: string;
  submittedAt?: string;
  name: string;
  tagline?: string;
  description?: string;
  githubUrl?: string | null;
  demoUrl?: string | null;
};

const defaultProject = {
  name: "Uniport",
  tagline: "대학생 빌더를 위한 통합 프로젝트 패스포트",
  description:
    "Uniport는 지갑 기반 프로필, 프로젝트 활동, 수상 기록을 하나의 검증 가능한 프로필로 연결합니다.",
  problem:
    "대학생 빌더는 참가 이력과 프로젝트 성과를 행사 밖에서도 증명하기 어렵습니다.",
  solution: "프로젝트 제출, 수상 기록, 커리어 이력을 지갑 프로필에 연결합니다.",
  githubUrl: "https://github.com/example/uniport",
  demoUrl: "https://uniport.example",
  presentationUrl: "",
};

const mockEventTemplates: ParticipantEventSummary[] = [
  {
    id: "mock-seoul-builder-sprint",
    name: "Seoul Builder Sprint",
    status: "Published",
    startDate: "2026-08-08T10:00:00.000Z",
    endDate: "2026-08-09T18:00:00.000Z",
    submissionDeadline: "2026-08-07T23:59:00.000Z",
    location: "Seoul, Korea",
    description:
      "지갑 온보딩과 커뮤니티 툴을 빠르게 검증하는 48시간 빌더 스프린트입니다.",
  },
  {
    id: "mock-campus-proof-demo-day",
    name: "Campus Proof Demo Day",
    status: "Published",
    startDate: "2026-08-15T11:00:00.000Z",
    endDate: "2026-08-15T19:00:00.000Z",
    submissionDeadline: "2026-08-12T23:59:00.000Z",
    location: "Daejeon, Korea",
    description:
      "대학생 빌더가 학습, 프로젝트, 기여 이력을 검증 가능한 포트폴리오로 제출하는 데모데이입니다.",
  },
  {
    id: "mock-public-goods-mini-hack",
    name: "Public Goods Mini Hack",
    status: "Published",
    startDate: "2026-08-22T09:30:00.000Z",
    endDate: "2026-08-23T17:30:00.000Z",
    submissionDeadline: "2026-08-20T23:59:00.000Z",
    location: "Busan, Korea",
    description:
      "공공재, 임팩트, 지역 문제 해결을 주제로 한 소규모 Web3 해커톤입니다.",
  },
];

export function renderParticipantProjectPage(): string {
  return `
    <main class="page-shell participant-project-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">참가자 콘솔</p>
          <h1>참가 가능한 행사에 프로젝트를 제출하세요</h1>
          <p>참가자는 행사를 선택하고 프로젝트를 제출한 뒤, 자신의 제출 내역을 확인합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">참가자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>

      <section class="participant-workspace-grid">
        <section class="detail-section participant-event-panel" aria-label="참가 가능한 행사">
          <div class="section-header">
            <div>
              <p class="eyebrow">행사 선택</p>
              <h2>참가 가능한 행사</h2>
            </div>
          </div>
          <div id="participant-event-list" class="participant-event-list" aria-live="polite">
            ${renderLoading()}
          </div>
        </section>

        <form id="participant-project-form" class="organizer-form">
          <fieldset>
            <legend>프로젝트 제출</legend>
            <label>
              <span>행사</span>
              <select name="eventId" id="participant-event-select" required>
                <option value="">행사를 불러오는 중입니다</option>
              </select>
            </label>
            <div id="participant-selected-event-summary" class="participant-selected-event-summary" aria-live="polite">
              ${renderSelectedParticipantEventSummary(null)}
            </div>
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
      </section>

      <section class="participant-submission-grid">
        <aside id="participant-project-result" class="organizer-result" aria-live="polite">
          <p class="eyebrow">대기 중</p>
          <h2>행사를 선택하고 제출하세요</h2>
          <p>제출한 프로젝트는 참가자 지갑 주소와 함께 저장됩니다.</p>
        </aside>
        <div id="participant-my-project-list" aria-live="polite">
          ${renderParticipantProjectList(getMockParticipantProjects(null))}
        </div>
      </section>
    </main>
  `;
}

export function mountParticipantProjectPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#participant-project-form");
  const eventSelect = root.querySelector<HTMLSelectElement>(
    "#participant-event-select",
  );
  const eventList = root.querySelector<HTMLElement>("#participant-event-list");
  const selectedEventSummary = root.querySelector<HTMLElement>(
    "#participant-selected-event-summary",
  );
  const projectList = root.querySelector<HTMLElement>(
    "#participant-my-project-list",
  );
  const result = root.querySelector<HTMLElement>("#participant-project-result");

  if (
    !form ||
    !eventSelect ||
    !eventList ||
    !selectedEventSummary ||
    !projectList ||
    !result
  )
    return;

  void loadEvents(eventSelect, eventList, selectedEventSummary);
  void loadWalletSession().then((session) => {
    projectList.innerHTML = renderParticipantProjectList(
      getMockParticipantProjects(session?.walletAddress ?? null),
    );
  });

  root.addEventListener("awardblock:wallet-session", (event) => {
    const session = (event as CustomEvent<WalletSession>).detail;
    projectList.innerHTML = renderParticipantProjectList(
      getMockParticipantProjects(session.walletAddress),
    );
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const eventId = String(new FormData(form).get("eventId") ?? "");
    result.innerHTML = renderProgress("프로젝트를 제출하는 중입니다");

    try {
      const created = await submitParticipantProject(
        eventId,
        readProjectPayload(form),
      );
      const session = await loadWalletSession();
      result.innerHTML = `
        <p class="eyebrow">제출 완료</p>
        <h2>${escapeHtml(created.project.name)}</h2>
        <dl class="organizer-result-list">
          <div><dt>프로젝트 ID</dt><dd>${escapeHtml(created.project.id)}</dd></div>
          <div><dt>제출자 지갑</dt><dd>${escapeHtml(created.project.submitterWallet)}</dd></div>
        </dl>
        <a class="text-link" href="/projects/${encodeURIComponent(created.project.id)}">프로젝트 보기</a>
      `;
      const selectedEventName =
        eventSelect.selectedOptions[0]?.textContent?.trim() || eventId;
      projectList.innerHTML = renderParticipantProjectList([
        normalizeCreatedProject(created.project, selectedEventName),
        ...getMockParticipantProjects(session?.walletAddress ?? null),
      ]);
    } catch {
      result.innerHTML = renderError(
        "프로젝트 제출에 실패했습니다",
        "참가자 지갑 연결 상태와 행사 선택을 확인하세요.",
      );
    }
  });
}

export function mergeParticipantEventsWithMockData(
  events: ParticipantEventSummary[],
): ParticipantEventSummary[] {
  const realEvents = events
    .filter((event) => event.status !== "Archived")
    .map(normalizeEventDeadline);
  const realKeys = new Set(realEvents.map(getEventKey));
  const mockEvents = mockEventTemplates.filter(
    (event) => !realKeys.has(getEventKey(event)),
  );

  return [...realEvents, ...mockEvents];
}

export function getMockParticipantProjects(
  walletAddress: string | null,
): ParticipantProjectSummary[] {
  const submitterWallet =
    walletAddress?.toLowerCase() ??
    "0x1111111111111111111111111111111111111111";

  return [
    {
      id: "mock-my-project-uniport",
      eventId: "mock-seoul-builder-sprint",
      eventName: "Seoul Builder Sprint",
      submitterWallet,
      submittedAt: "2026-08-07T12:30:00.000Z",
      name: "Uniport",
      tagline: "대학생 빌더를 위한 검증 프로필",
      description:
        "지갑, 프로젝트, 수상 기록을 하나의 공개 프로필로 연결합니다.",
      githubUrl: "https://github.com/example/uniport",
      demoUrl: "https://uniport.example",
    },
    {
      id: "mock-my-project-chainfolio",
      eventId: "mock-campus-proof-demo-day",
      eventName: "Campus Proof Demo Day",
      submitterWallet,
      submittedAt: "2026-08-12T09:00:00.000Z",
      name: "Chainfolio",
      tagline: "캠퍼스 활동을 증명하는 포트폴리오",
      description: "학습 이력과 해커톤 제출물을 지갑 기반 증명으로 정리합니다.",
      githubUrl: "https://github.com/example/chainfolio",
      demoUrl: "https://chainfolio.example",
    },
  ];
}

export function renderParticipantEventCard(
  event: ParticipantEventSummary,
): string {
  const deadline = event.submissionDeadline ?? event.endDate ?? event.startDate;

  return `
    <article class="organizer-event-row participant-event-row">
      <div>
        <p class="eyebrow">${escapeHtml(event.status)}</p>
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(event.description ?? "참가 가능한 행사입니다.")}</p>
      </div>
      <dl class="organizer-result-list">
        <div><dt>기간</dt><dd>${escapeHtml(formatDateRange(event.startDate, event.endDate))}</dd></div>
        <div><dt>제출 마감</dt><dd>${escapeHtml(formatDateTimeLabel(deadline))}</dd></div>
        <div><dt>장소</dt><dd>${escapeHtml(event.location ?? "장소 미정")}</dd></div>
      </dl>
      <button class="button" type="button" data-participant-event-id="${escapeHtml(event.id)}">이 행사에 제출</button>
    </article>
  `;
}

export function renderParticipantProjectList(
  projects: ParticipantProjectSummary[],
): string {
  return `
    <section class="detail-section participant-my-projects" aria-label="내 제출 프로젝트">
      <div class="section-header">
        <div>
          <p class="eyebrow">내 제출</p>
          <h2>내 제출 프로젝트</h2>
        </div>
      </div>
      <div class="organizer-project-list">
        ${projects.length ? projects.map(renderParticipantProject).join("") : renderEmptyProjectState()}
      </div>
    </section>
  `;
}

export async function submitParticipantProject(
  eventId: string,
  payload: ProjectPayload,
): Promise<CreatedProjectResponse> {
  return apiPost<CreatedProjectResponse, ProjectPayload>(
    `/events/${encodeURIComponent(eventId)}/projects`,
    payload,
  );
}

async function loadEvents(
  select: HTMLSelectElement,
  eventList: HTMLElement,
  selectedEventSummary: HTMLElement,
): Promise<void> {
  try {
    const response = await apiGet<EventListResponse>("/events");
    renderEvents(
      select,
      eventList,
      mergeParticipantEventsWithMockData(response.events),
      selectedEventSummary,
    );
  } catch {
    renderEvents(
      select,
      eventList,
      mergeParticipantEventsWithMockData([]),
      selectedEventSummary,
    );
  }
}

function renderEvents(
  select: HTMLSelectElement,
  eventList: HTMLElement,
  events: ParticipantEventSummary[],
  selectedEventSummary: HTMLElement,
): void {
  select.innerHTML = events.length
    ? events
        .map(
          (event) =>
            `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}</option>`,
        )
        .join("")
    : `<option value="">참가 가능한 행사가 없습니다</option>`;

  const selectedEvent = events[0] ?? null;
  eventList.innerHTML = events.map(renderParticipantEventCard).join("");
  selectedEventSummary.innerHTML =
    renderSelectedParticipantEventSummary(selectedEvent);

  select.addEventListener("change", () => {
    const event =
      events.find((candidate) => candidate.id === select.value) ?? null;
    selectedEventSummary.innerHTML =
      renderSelectedParticipantEventSummary(event);
  });

  bindParticipantEventButtons(select, eventList, events, selectedEventSummary);
}

function bindParticipantEventButtons(
  select: HTMLSelectElement,
  eventList: HTMLElement,
  events: ParticipantEventSummary[],
  selectedEventSummary: HTMLElement,
): void {
  eventList
    .querySelectorAll<HTMLButtonElement>("[data-participant-event-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const selectedEventId = button.dataset.participantEventId ?? "";
        select.value = selectedEventId;
        selectedEventSummary.innerHTML = renderSelectedParticipantEventSummary(
          events.find((event) => event.id === selectedEventId) ?? null,
        );
        eventList
          .querySelectorAll(".organizer-event-row--selected")
          .forEach((row) =>
            row.classList.remove("organizer-event-row--selected"),
          );
        button
          .closest(".participant-event-row")
          ?.classList.add("organizer-event-row--selected");
      });
    });
}

export function renderSelectedParticipantEventSummary(
  event: ParticipantEventSummary | null,
): string {
  if (!event) {
    return `
      <div class="participant-selected-event-summary__empty">
        <p class="eyebrow">선택한 행사</p>
        <h3>행사를 선택하세요</h3>
        <p>참가할 행사를 선택하면 제출 마감, 장소, 설명을 확인할 수 있습니다.</p>
      </div>
    `;
  }

  const deadline = event.submissionDeadline ?? event.endDate ?? event.startDate;

  return `
    <div>
      <p class="eyebrow">선택한 행사</p>
      <h3>${escapeHtml(event.name)}</h3>
      <p>${escapeHtml(event.description ?? "참가 가능한 행사입니다.")}</p>
      <dl class="organizer-result-list">
        <div><dt>제출 마감</dt><dd>${escapeHtml(formatDateTimeLabel(deadline))}</dd></div>
        <div><dt>장소</dt><dd>${escapeHtml(event.location ?? "장소 미정")}</dd></div>
      </dl>
    </div>
  `;
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
    presentationUrl: readNullable(formData, "presentationUrl"),
  };
}

function renderParticipantProject(project: ParticipantProjectSummary): string {
  return `
    <article class="organizer-project-row">
      <div>
        <p class="eyebrow">제출 완료</p>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.tagline ?? "프로젝트 제출이 저장되었습니다.")}</p>
      </div>
      <p>${escapeHtml(project.description ?? "")}</p>
      <dl class="organizer-result-list">
        <div><dt>행사</dt><dd>${escapeHtml(project.eventName ?? project.eventId)}</dd></div>
        <div><dt>제출일</dt><dd>${escapeHtml(formatDateTimeLabel(project.submittedAt))}</dd></div>
        <div><dt>제출자 지갑</dt><dd>${escapeHtml(project.submitterWallet)}</dd></div>
        <div><dt>GitHub</dt><dd>${renderProjectLink(project.githubUrl ?? null)}</dd></div>
        <div><dt>데모</dt><dd>${renderProjectLink(project.demoUrl ?? null)}</dd></div>
      </dl>
      <a class="text-link" href="/projects/${encodeURIComponent(project.id)}">프로젝트 보기</a>
    </article>
  `;
}

function normalizeCreatedProject(
  project: ParticipantProjectSummary,
  eventName: string,
): ParticipantProjectSummary {
  return {
    ...project,
    eventName: project.eventName ?? eventName,
    submittedAt: project.submittedAt ?? new Date().toISOString(),
    tagline: project.tagline ?? "방금 제출한 프로젝트",
    description:
      project.description ?? "참가자 지갑으로 저장된 제출 기록입니다.",
  };
}

function normalizeEventDeadline(
  event: ParticipantEventSummary,
): ParticipantEventSummary {
  return {
    ...event,
    submissionDeadline:
      event.submissionDeadline ?? event.endDate ?? event.startDate,
  };
}

function getEventKey(event: ParticipantEventSummary): string {
  return [event.name, event.startDate ?? "", event.endDate ?? ""]
    .map((value) => value.toLowerCase())
    .join(":");
}

function renderInput(
  label: string,
  name: string,
  value: string,
  required = false,
): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" value="${escapeHtml(value)}"${required ? " required" : ""} />
    </label>
  `;
}

function renderTextarea(
  label: string,
  name: string,
  value: string,
  required = false,
): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea name="${escapeHtml(name)}"${required ? " required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderProgress(title: string): string {
  return `<p class="eyebrow">진행 중</p><h2>${escapeHtml(title)}</h2><span class="loading-bar"></span>`;
}

function renderError(title: string, description: string): string {
  return `<p class="eyebrow">오류</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>`;
}

function renderEmptyProjectState(): string {
  return `<div class="empty-state"><h2>제출한 프로젝트 없음</h2><p>행사를 선택하고 프로젝트를 제출하면 여기에 표시됩니다.</p></div>`;
}

function renderProjectLink(url: string | null): string {
  if (!url) return "링크 없음";
  return `<a class="text-link" href="${escapeHtml(url)}">열기</a>`;
}

function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
): string {
  if (!startDate || !endDate) return "일정 미정";
  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTimeLabel(value: string | undefined): string {
  if (!value) return "마감 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
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
