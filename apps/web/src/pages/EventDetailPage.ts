import { apiGet } from "../api/client";
import { shortenAddress } from "../utils/format";

export type EventDetailResponse = {
  event: EventDetail;
};

export type EventProjectListResponse = {
  projects: EventProject[];
};

export type EventDetail = {
  id: string;
  organizerWallet: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string | null;
  imageUrl: string | null;
  officialUrl: string | null;
  socialUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type EventProject = {
  id: string;
  eventId: string;
  name: string;
  tagline: string;
  description: string;
  problem: string | null;
  solution: string | null;
  imageUrl: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  presentationUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventDetailViewModel = {
  id: string;
  name: string;
  description: string;
  status: string;
  organizerLabel: string;
  dateRangeLabel: string;
  locationLabel: string;
  officialUrl: string | null;
  socialUrl: string | null;
  projects: Array<{
    id: string;
    name: string;
    tagline: string;
    description: string;
    href: string;
    githubUrl: string | null;
    demoUrl: string | null;
  }>;
};

export function renderEventDetailPage(eventId: string | null = null): string {
  return `
    <main class="page-shell event-detail-page">
      <section class="event-detail-hero">
        <div>
          <p class="eyebrow">이벤트</p>
          <h1>${eventId ? "이벤트 상세" : "이벤트를 사용할 수 없습니다"}</h1>
        </div>
        <span class="status-badge">공개</span>
      </section>
      <section id="event-detail-content" class="event-detail-content" aria-live="polite">
        ${eventId ? renderEventDetailLoading() : renderEventDetailMissingId()}
      </section>
    </main>
  `;
}

export async function mountEventDetailPage(root: ParentNode, eventId: string): Promise<void> {
  const content = root.querySelector<HTMLElement>("#event-detail-content");

  if (!content) return;

  content.innerHTML = renderEventDetailLoading();

  try {
    const [eventResponse, projectsResponse] = await Promise.all([
      apiGet<EventDetailResponse>(`/events/${encodeURIComponent(eventId)}`),
      apiGet<EventProjectListResponse>(
        `/events/${encodeURIComponent(eventId)}/projects`
      )
    ]);

    content.innerHTML = renderEventDetailContent(
      mapEventDetailToViewModel(eventResponse.event, projectsResponse.projects)
    );
  } catch {
    content.innerHTML = renderEventDetailError();
  }
}

export function mapEventDetailToViewModel(
  event: EventDetail,
  projects: EventProject[]
): EventDetailViewModel {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: formatEventStatusLabel(event.status),
    organizerLabel: shortenAddress(event.organizerWallet),
    dateRangeLabel: `${formatDateLabel(event.startDate)} - ${formatDateLabel(event.endDate)}`,
    locationLabel: event.location ?? "장소 기록 없음",
    officialUrl: event.officialUrl,
    socialUrl: event.socialUrl,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      tagline: project.tagline,
      description: project.description,
      href: `/projects/${encodeURIComponent(project.id)}`,
      githubUrl: project.githubUrl,
      demoUrl: project.demoUrl
    }))
  };
}

function renderEventDetailContent(event: EventDetailViewModel): string {
  return `
    <section class="event-detail-summary">
      <div>
        <p class="eyebrow">${escapeHtml(event.locationLabel)}</p>
        <h2>${escapeHtml(event.name)}</h2>
        <p>${escapeHtml(event.description)}</p>
      </div>
      <span class="status-badge">${escapeHtml(event.status)}</span>
    </section>
    <div class="detail-grid">
      ${renderDetailMetric("주최자", event.organizerLabel)}
      ${renderDetailMetric("일정", event.dateRangeLabel)}
      ${renderDetailMetric("프로젝트", String(event.projects.length))}
      ${renderDetailMetric("장소", event.locationLabel)}
    </div>
    <section class="detail-section">
      <h2>이벤트 링크</h2>
      <div class="event-link-list">
        ${renderExternalLink("공식 링크", event.officialUrl)}
        ${renderExternalLink("소셜", event.socialUrl)}
      </div>
    </section>
    <section class="detail-section">
      <h2>프로젝트</h2>
      ${renderEventProjects(event.projects)}
    </section>
  `;
}

function renderEventProjects(projects: EventDetailViewModel["projects"]): string {
  if (projects.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">프로젝트 없음</p>
        <h2>아직 등록된 프로젝트가 없습니다</h2>
      </div>
    `;
  }

  return `
    <div class="event-project-list">
      ${projects.map(renderEventProject).join("")}
    </div>
  `;
}

function renderEventProject(project: EventDetailViewModel["projects"][number]): string {
  return `
    <article class="event-project-row">
      <div>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.tagline)}</p>
      </div>
      <p>${escapeHtml(project.description)}</p>
      <div class="event-project-actions">
        <a class="text-link" href="${escapeHtml(project.href)}">프로젝트 보기</a>
        ${renderExternalLink("GitHub", project.githubUrl)}
        ${renderExternalLink("데모", project.demoUrl)}
      </div>
    </article>
  `;
}

function renderDetailMetric(label: string, value: string): string {
  return `
    <div class="profile-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderExternalLink(label: string, href: string | null): string {
  if (!href) {
    return `<span class="muted-label">${escapeHtml(label)} 기록 없음</span>`;
  }

  return `<a class="text-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function renderEventDetailLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderEventDetailMissingId(): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">이벤트 없음</p>
      <h2>이벤트 ID가 필요합니다</h2>
    </div>
  `;
}

function renderEventDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">이벤트 오류</p>
      <h2>이벤트 상세를 불러오지 못했습니다</h2>
    </div>
  `;
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatEventStatusLabel(value: string): string {
  if (value === "Draft") return "초안";
  if (value === "Published") return "공개됨";
  if (value === "Archived") return "보관됨";

  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
