import { apiGet } from "../api/client";
import { formatTokenAmount, shortenAddress } from "../utils/format";

export type ProjectDetailResponse = {
  project: ProjectDetail;
};

export type ProjectEventResponse = {
  event: ProjectEvent;
};

export type ProjectAwardListResponse = {
  awards: ProjectAward[];
};

export type ProjectDetail = {
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

export type ProjectEvent = {
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

export type ProjectAward = {
  id: string;
  eventId: string;
  projectId: string;
  organizerWallet: string;
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
  contractAwardId: string | null;
  status: string;
  createTxHash: string | null;
  fundTxHash: string | null;
  finalizeTxHash: string | null;
  supersededBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectDetailViewModel = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  problemLabel: string;
  solutionLabel: string;
  eventName: string;
  eventHref: string;
  organizerLabel: string;
  githubUrl: string | null;
  demoUrl: string | null;
  presentationUrl: string | null;
  awards: Array<{
    id: string;
    title: string;
    href: string;
    status: string;
    rewardLabel: string;
    claimWindowLabel: string;
    verificationLabel: string;
    reasonLabel: string;
  }>;
};

export function renderProjectDetailPage(projectId: string | null = null): string {
  return `
    <main class="page-shell project-detail-page">
      <section class="project-detail-hero">
        <div>
          <p class="eyebrow">Project</p>
          <h1>${projectId ? "Project Detail" : "Project unavailable"}</h1>
        </div>
        <span class="status-badge">Public</span>
      </section>
      <section id="project-detail-content" class="project-detail-content" aria-live="polite">
        ${projectId ? renderProjectDetailLoading() : renderProjectDetailMissingId()}
      </section>
    </main>
  `;
}

export async function mountProjectDetailPage(root: ParentNode, projectId: string): Promise<void> {
  const content = root.querySelector<HTMLElement>("#project-detail-content");

  if (!content) return;

  content.innerHTML = renderProjectDetailLoading();

  try {
    const { project } = await apiGet<ProjectDetailResponse>(
      `/projects/${encodeURIComponent(projectId)}`
    );
    const [eventResponse, awardsResponse] = await Promise.all([
      apiGet<ProjectEventResponse>(`/events/${encodeURIComponent(project.eventId)}`),
      apiGet<ProjectAwardListResponse>(
        `/projects/${encodeURIComponent(project.id)}/awards`
      )
    ]);

    content.innerHTML = renderProjectDetailContent(
      mapProjectDetailToViewModel(project, eventResponse.event, awardsResponse.awards)
    );
  } catch {
    content.innerHTML = renderProjectDetailError();
  }
}

export function mapProjectDetailToViewModel(
  project: ProjectDetail,
  event: ProjectEvent,
  awards: ProjectAward[]
): ProjectDetailViewModel {
  return {
    id: project.id,
    name: project.name,
    tagline: project.tagline,
    description: project.description,
    problemLabel: project.problem ?? "No problem statement recorded",
    solutionLabel: project.solution ?? "No solution statement recorded",
    eventName: event.name,
    eventHref: `/events/${encodeURIComponent(event.id)}`,
    organizerLabel: shortenAddress(event.organizerWallet),
    githubUrl: project.githubUrl,
    demoUrl: project.demoUrl,
    presentationUrl: project.presentationUrl,
    awards: awards.map((award) => ({
      id: award.id,
      title: award.rank ? `${award.rank} - ${award.title}` : award.title,
      href: `/awards/${encodeURIComponent(award.id)}`,
      status: award.status,
      rewardLabel: `${formatReward(
        award.totalReward,
        award.rewardTokenDecimals
      )} ${award.rewardTokenSymbol}`,
      claimWindowLabel: `${formatDateLabel(award.claimStart)} - ${formatDateLabel(
        award.claimEnd
      )}`,
      verificationLabel:
        award.metadataHash && award.contractAwardId ? "Verified" : "Needs review",
      reasonLabel: award.reason ?? "No reason recorded"
    }))
  };
}

function renderProjectDetailContent(project: ProjectDetailViewModel): string {
  return `
    <section class="project-detail-summary">
      <div>
        <p class="eyebrow">${escapeHtml(project.eventName)}</p>
        <h2>${escapeHtml(project.name)}</h2>
        <p>${escapeHtml(project.tagline)}</p>
      </div>
      <a class="text-link" href="${escapeHtml(project.eventHref)}">View event</a>
    </section>
    <div class="detail-grid">
      ${renderDetailMetric("Organizer", project.organizerLabel)}
      ${renderDetailMetric("Awards", String(project.awards.length))}
      ${renderDetailMetric("Project", project.name)}
      ${renderDetailMetric("Event", project.eventName)}
    </div>
    <section class="detail-section">
      <h2>Project Context</h2>
      <p>${escapeHtml(project.description)}</p>
      <dl class="detail-metadata">
        <div><dt>Problem</dt><dd>${escapeHtml(project.problemLabel)}</dd></div>
        <div><dt>Solution</dt><dd>${escapeHtml(project.solutionLabel)}</dd></div>
      </dl>
    </section>
    <section class="detail-section">
      <h2>Project Links</h2>
      <div class="project-link-list">
        ${renderExternalLink("GitHub", project.githubUrl)}
        ${renderExternalLink("Demo", project.demoUrl)}
        ${renderExternalLink("Presentation", project.presentationUrl)}
      </div>
    </section>
    <section class="detail-section">
      <h2>Awards</h2>
      ${renderProjectAwards(project.awards)}
    </section>
  `;
}

function renderProjectAwards(awards: ProjectDetailViewModel["awards"]): string {
  if (awards.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">No awards</p>
        <h2>No award results recorded yet</h2>
      </div>
    `;
  }

  return `
    <div class="project-award-list">
      ${awards.map(renderProjectAward).join("")}
    </div>
  `;
}

function renderProjectAward(award: ProjectDetailViewModel["awards"][number]): string {
  return `
    <article class="project-award-row">
      <div class="project-award-row__header">
        <div>
          <h3>${escapeHtml(award.title)}</h3>
          <p>${escapeHtml(award.reasonLabel)}</p>
        </div>
        <span class="status-badge">${escapeHtml(award.status)}</span>
      </div>
      <dl class="project-award-row__meta">
        <div><dt>Reward</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>Claim window</dt><dd>${escapeHtml(award.claimWindowLabel)}</dd></div>
        <div><dt>Verification</dt><dd>${escapeHtml(award.verificationLabel)}</dd></div>
      </dl>
      <a class="text-link" href="${escapeHtml(award.href)}">View award</a>
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

function renderProjectDetailLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderProjectDetailMissingId(): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">Missing project</p>
      <h2>Project ID is required</h2>
    </div>
  `;
}

function renderProjectDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">Project error</p>
      <h2>Unable to load project detail</h2>
    </div>
  `;
}

function formatReward(value: string, decimals: number): string {
  try {
    return formatTokenAmount(BigInt(value), decimals);
  } catch {
    return value;
  }
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
