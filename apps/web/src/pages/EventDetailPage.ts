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
          <p class="eyebrow">Event</p>
          <h1>${eventId ? "Event Detail" : "Event unavailable"}</h1>
        </div>
        <span class="status-badge">Public</span>
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
    status: event.status,
    organizerLabel: shortenAddress(event.organizerWallet),
    dateRangeLabel: `${formatDateLabel(event.startDate)} - ${formatDateLabel(event.endDate)}`,
    locationLabel: event.location ?? "No location recorded",
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
      ${renderDetailMetric("Organizer", event.organizerLabel)}
      ${renderDetailMetric("Schedule", event.dateRangeLabel)}
      ${renderDetailMetric("Projects", String(event.projects.length))}
      ${renderDetailMetric("Location", event.locationLabel)}
    </div>
    <section class="detail-section">
      <h2>Event Links</h2>
      <div class="event-link-list">
        ${renderExternalLink("Official", event.officialUrl)}
        ${renderExternalLink("Social", event.socialUrl)}
      </div>
    </section>
    <section class="detail-section">
      <h2>Projects</h2>
      ${renderEventProjects(event.projects)}
    </section>
  `;
}

function renderEventProjects(projects: EventDetailViewModel["projects"]): string {
  if (projects.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">No projects</p>
        <h2>No projects registered yet</h2>
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
        <a class="text-link" href="${escapeHtml(project.href)}">View project</a>
        ${renderExternalLink("GitHub", project.githubUrl)}
        ${renderExternalLink("Demo", project.demoUrl)}
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
    return `<span class="muted-label">${escapeHtml(label)} not recorded</span>`;
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
      <p class="eyebrow">Missing event</p>
      <h2>Event ID is required</h2>
    </div>
  `;
}

function renderEventDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">Event error</p>
      <h2>Unable to load event detail</h2>
    </div>
  `;
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC"
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
