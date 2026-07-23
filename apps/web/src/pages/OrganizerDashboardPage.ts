import { apiGet, apiPost } from "../api/client";
import { loadWalletSession, type WalletSession } from "../auth/walletAuth";
import {
  mountWalletConnectButton,
  renderWalletConnectButton,
} from "../components/WalletConnectButton";

type EventListResponse = {
  events: OrganizerDashboardEvent[];
};

type EventProjectListResponse = {
  projects: OrganizerDashboardProject[];
};

type CreatedEventResponse = {
  event: OrganizerDashboardEvent;
};

type CreatedAwardResponse = {
  award: {
    id: string;
    title: string;
  };
};

type CreatedMemberResponse = {
  member: {
    id: string;
    displayName: string;
  };
};

type EventPayload = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string | null;
  officialUrl: string | null;
  status: string;
};

type AwardPayload = {
  title: string;
  rank: string | null;
  reason: string | null;
  judgingSummary: string | null;
  rewardTokenAddress: string;
  rewardTokenSymbol: string;
  rewardTokenDecimals: number;
  totalReward: string;
  claimStart: string;
  claimEnd: string;
  metadataUri: string | null;
  metadataHash: string | null;
  status: string;
};

type MemberPayload = {
  displayName: string;
  email: string | null;
  walletAddress: string;
  allocation: string;
  inviteStatus: string;
};

export type OrganizerDashboardEvent = {
  id: string;
  organizerWallet: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string | null;
  status: string;
};

export type OrganizerDashboardProject = {
  id: string;
  eventId: string;
  submitterWallet: string;
  name: string;
  tagline: string;
  description: string;
  githubUrl: string | null;
  demoUrl: string | null;
};

const defaultEvent = {
  name: "De-Buthon 2026",
  description:
    "Web3 빌더가 프로젝트를 제출하고 검증 가능한 수상 기록을 남기는 해커톤입니다.",
  startDate: "2026-08-01T09:00:00.000Z",
  endDate: "2026-08-01T18:00:00.000Z",
  location: "Seoul, Korea",
  officialUrl: "https://awardblock.example/events/de-buthon-2026",
};

const defaultWinner = {
  title: "Grand Prize",
  reason: "제출 프로젝트의 문제 정의, 완성도, Web3 활용성이 가장 뛰어납니다.",
  judgingSummary: "등록자가 제출 프로젝트를 검토한 뒤 선택한 우승 기록입니다.",
  rewardTokenAddress: "0x2222222222222222222222222222222222222222",
  rewardTokenSymbol: "mUSDC",
  rewardTokenDecimals: 6,
  totalReward: "1000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
};

export function renderOrganizerDashboardPage(): string {
  return `
    <main class="page-shell organizer-page organizer-dashboard-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">등록자 콘솔</p>
          <h1>행사를 등록하고 제출 프로젝트를 검토하세요</h1>
          <p>등록자는 이 화면에서 행사를 만들고, 등록한 행사별 참가자 제출 프로젝트를 확인한 뒤 우승자를 선택합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">등록자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>

      <section class="organizer-dashboard-grid">
        <form id="organizer-event-form" class="organizer-form">
          <fieldset>
            <legend>행사 등록</legend>
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

        <section class="detail-section organizer-events-panel" aria-label="등록한 행사">
          <div class="section-header">
            <div>
              <p class="eyebrow">내 행사</p>
              <h2>등록한 행사</h2>
            </div>
            <span class="status-badge">선택 가능</span>
          </div>
          <div id="organizer-event-list" class="organizer-event-list" aria-live="polite">
            ${renderOrganizerEventListLoading()}
          </div>
        </section>
      </section>

      <section class="detail-section organizer-project-review-panel" aria-label="제출 프로젝트">
        <div class="section-header">
          <div>
            <p class="eyebrow">프로젝트 검토</p>
            <h2>제출 프로젝트</h2>
          </div>
          <span class="status-badge">우승자 선택</span>
        </div>
        <div id="organizer-project-review" class="organizer-project-review" aria-live="polite">
          ${renderProjectReviewEmpty()}
        </div>
      </section>
    </main>
  `;
}

export function mountOrganizerDashboardPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#organizer-event-form");
  const eventList = root.querySelector<HTMLElement>("#organizer-event-list");
  const projectReview = root.querySelector<HTMLElement>(
    "#organizer-project-review",
  );

  if (!form || !eventList || !projectReview) return;

  void loadWalletSession().then((session) => {
    void loadOrganizerEvents(
      eventList,
      projectReview,
      session?.walletAddress ?? null,
    );
  });

  root.addEventListener("awardblock:wallet-session", (event) => {
    const session = (event as CustomEvent<WalletSession>).detail;
    void loadOrganizerEvents(eventList, projectReview, session.walletAddress);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector<HTMLButtonElement>(
      "button[type='submit']",
    );
    setButtonPending(submitButton, "등록 중");

    try {
      const created = await createOrganizerEvent(readEventPayload(form));
      form.reset();
      await loadOrganizerEvents(
        eventList,
        projectReview,
        created.event.organizerWallet,
      );
      await loadEventProjects(created.event, projectReview);
    } catch {
      projectReview.innerHTML = renderError(
        "행사 등록에 실패했습니다",
        "등록자 지갑 연결 상태와 입력값을 확인하세요.",
      );
    } finally {
      restoreButton(submitButton, "행사 등록");
    }
  });
}

export function filterOrganizerEvents(
  events: OrganizerDashboardEvent[],
  organizerWallet: string | null,
): OrganizerDashboardEvent[] {
  if (!organizerWallet) return [];
  const normalized = organizerWallet.toLowerCase();
  return events.filter(
    (event) => event.organizerWallet.toLowerCase() === normalized,
  );
}

export function mapProjectToWinnerPayloads(
  project: OrganizerDashboardProject,
): {
  award: AwardPayload;
  member: MemberPayload;
} {
  return {
    award: {
      title: defaultWinner.title,
      rank: null,
      reason: `${project.name}은(는) ${defaultWinner.reason}`,
      judgingSummary: defaultWinner.judgingSummary,
      rewardTokenAddress: defaultWinner.rewardTokenAddress,
      rewardTokenSymbol: defaultWinner.rewardTokenSymbol,
      rewardTokenDecimals: defaultWinner.rewardTokenDecimals,
      totalReward: defaultWinner.totalReward,
      claimStart: defaultWinner.claimStart,
      claimEnd: defaultWinner.claimEnd,
      metadataUri: `ipfs://awardblock/${project.eventId}/${project.id}/grand-prize`,
      metadataHash: null,
      status: "AwaitingRecipients",
    },
    member: {
      displayName: `${project.name} Team`,
      email: null,
      walletAddress: project.submitterWallet,
      allocation: defaultWinner.totalReward,
      inviteStatus: "Pending",
    },
  };
}

async function loadOrganizerEvents(
  eventList: HTMLElement,
  projectReview: HTMLElement,
  organizerWallet: string | null,
): Promise<void> {
  if (!organizerWallet) {
    eventList.innerHTML = renderEmptyState(
      "지갑 연결 필요",
      "등록자 지갑으로 로그인하면 등록한 행사가 표시됩니다.",
    );
    projectReview.innerHTML = renderProjectReviewEmpty();
    return;
  }

  eventList.innerHTML = renderOrganizerEventListLoading();

  try {
    const response = await apiGet<EventListResponse>("/events");
    const events = filterOrganizerEvents(response.events, organizerWallet);
    eventList.innerHTML = renderOrganizerEventList(events);
    bindOrganizerEventButtons(eventList, projectReview, events);
  } catch {
    eventList.innerHTML = renderError(
      "행사를 불러오지 못했습니다",
      "잠시 후 다시 시도하세요.",
    );
  }
}

function bindOrganizerEventButtons(
  eventList: HTMLElement,
  projectReview: HTMLElement,
  events: OrganizerDashboardEvent[],
): void {
  eventList
    .querySelectorAll<HTMLButtonElement>("[data-organizer-event-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const event = events.find(
          (candidate) => candidate.id === button.dataset.organizerEventId,
        );
        if (!event) return;
        eventList
          .querySelectorAll(".organizer-event-row--selected")
          .forEach((row) => {
            row.classList.remove("organizer-event-row--selected");
          });
        button
          .closest(".organizer-event-row")
          ?.classList.add("organizer-event-row--selected");
        void loadEventProjects(event, projectReview);
      });
    });
}

async function loadEventProjects(
  event: OrganizerDashboardEvent,
  projectReview: HTMLElement,
): Promise<void> {
  projectReview.innerHTML = renderProjectsLoading(event.name);

  try {
    const response = await apiGet<EventProjectListResponse>(
      `/events/${encodeURIComponent(event.id)}/projects`,
    );
    projectReview.innerHTML = renderEventProjects(event, response.projects);
    bindWinnerButtons(projectReview, response.projects);
  } catch {
    projectReview.innerHTML = renderError(
      "프로젝트를 불러오지 못했습니다",
      "행사 선택을 다시 시도하세요.",
    );
  }
}

function bindWinnerButtons(
  review: HTMLElement,
  projects: OrganizerDashboardProject[],
): void {
  review
    .querySelectorAll<HTMLButtonElement>("[data-winner-project-id]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const project = projects.find(
          (candidate) => candidate.id === button.dataset.winnerProjectId,
        );
        if (!project) return;

        setButtonPending(button, "우승자 생성 중");

        try {
          const { award, member } = mapProjectToWinnerPayloads(project);
          const createdAward = await apiPost<
            CreatedAwardResponse,
            AwardPayload
          >(`/projects/${encodeURIComponent(project.id)}/awards`, award);
          await apiPost<CreatedMemberResponse, MemberPayload>(
            `/awards/${encodeURIComponent(createdAward.award.id)}/members`,
            member,
          );
          button.insertAdjacentHTML(
            "afterend",
            `<a class="text-link" href="/awards/${encodeURIComponent(createdAward.award.id)}">수상 기록 보기</a>`,
          );
          button.textContent = "우승자 선택 완료";
        } catch {
          restoreButton(button, "우승자 선택");
          button.insertAdjacentHTML(
            "afterend",
            `<p class="muted-label">우승자 선택에 실패했습니다.</p>`,
          );
        }
      });
    });
}

async function createOrganizerEvent(
  payload: EventPayload,
): Promise<CreatedEventResponse> {
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
    status: "Published",
  };
}

function renderOrganizerEventList(events: OrganizerDashboardEvent[]): string {
  if (events.length === 0) {
    return renderEmptyState(
      "등록한 행사 없음",
      "위 행사 등록 폼으로 첫 행사를 만들어주세요.",
    );
  }

  return events.map(renderOrganizerEventRow).join("");
}

function renderOrganizerEventRow(event: OrganizerDashboardEvent): string {
  return `
    <article class="organizer-event-row">
      <div>
        <p class="eyebrow">${escapeHtml(event.status)}</p>
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(event.description)}</p>
      </div>
      <dl class="organizer-result-list">
        <div><dt>기간</dt><dd>${escapeHtml(formatDateRange(event.startDate, event.endDate))}</dd></div>
        <div><dt>장소</dt><dd>${escapeHtml(event.location ?? "장소 없음")}</dd></div>
      </dl>
      <button class="button" type="button" data-organizer-event-id="${escapeHtml(event.id)}">제출 프로젝트 보기</button>
    </article>
  `;
}

function renderEventProjects(
  event: OrganizerDashboardEvent,
  projects: OrganizerDashboardProject[],
): string {
  if (projects.length === 0) {
    return renderEmptyState(
      "제출 프로젝트 없음",
      `${event.name}에 아직 참가자가 제출한 프로젝트가 없습니다.`,
    );
  }

  return `
    <div class="organizer-project-list">
      ${projects.map(renderEventProject).join("")}
    </div>
  `;
}

function renderEventProject(project: OrganizerDashboardProject): string {
  return `
    <article class="organizer-project-row">
      <div>
        <p class="eyebrow">참가자 제출</p>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.tagline)}</p>
      </div>
      <p>${escapeHtml(project.description)}</p>
      <dl class="organizer-result-list">
        <div><dt>제출자 지갑</dt><dd>${escapeHtml(project.submitterWallet)}</dd></div>
        <div><dt>GitHub</dt><dd>${renderProjectLink(project.githubUrl)}</dd></div>
        <div><dt>데모</dt><dd>${renderProjectLink(project.demoUrl)}</dd></div>
      </dl>
      <button class="button" type="button" data-winner-project-id="${escapeHtml(project.id)}">우승자 선택</button>
    </article>
  `;
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

function renderOrganizerEventListLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderProjectReviewEmpty(): string {
  return renderEmptyState(
    "행사를 선택하세요",
    "등록한 행사를 선택하면 참가자들이 제출한 프로젝트가 표시됩니다.",
  );
}

function renderProjectsLoading(eventName: string): string {
  return `
    <div class="profile-loading">
      <p class="eyebrow">${escapeHtml(eventName)}</p>
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderEmptyState(title: string, description: string): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">등록자 콘솔</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function renderError(title: string, description: string): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">오류</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function renderProjectLink(url: string | null): string {
  if (!url) return "링크 없음";
  return `<a class="text-link" href="${escapeHtml(url)}">열기</a>`;
}

function readRequired(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readNullable(formData: FormData, key: string): string | null {
  const value = readRequired(formData, key);
  return value === "" ? null : value;
}

function setButtonPending(
  button: HTMLButtonElement | null | undefined,
  label: string,
): void {
  if (!button) return;
  button.disabled = true;
  button.textContent = label;
}

function restoreButton(
  button: HTMLButtonElement | null | undefined,
  label: string,
): void {
  if (!button) return;
  button.disabled = false;
  button.textContent = label;
}

function formatDateRange(startDate: string, endDate: string): string {
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
