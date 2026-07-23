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

type ProjectDetailFallback = {
  project: ProjectDetail;
  event: ProjectEvent;
  awards: ProjectAward[];
};

const mockProjectDetailFallbacks: Record<string, ProjectDetailFallback> = {
  "mock-my-project-uniport": {
    project: {
      id: "mock-my-project-uniport",
      eventId: "mock-seoul-builder-sprint",
      name: "Uniport",
      tagline: "대학생 빌더를 위한 검증 가능한 프로젝트 패스포트",
      description:
        "Uniport는 참가자의 지갑, 프로젝트 제출 이력, 수상 기록을 하나의 공개 프로필로 연결합니다.",
      problem:
        "대학생 빌더는 행사마다 흩어진 프로젝트 성과와 수상 이력을 행사 밖에서 증명하기 어렵습니다.",
      solution:
        "프로젝트 제출, 심사 결과, 수상 기록을 지갑 기반 프로필에 연결해 누구나 확인 가능한 포트폴리오로 만듭니다.",
      imageUrl: null,
      githubUrl: "https://github.com/example/uniport",
      demoUrl: "https://uniport.example",
      presentationUrl: "https://uniport.example/deck",
      createdAt: "2026-08-07T12:30:00.000Z",
      updatedAt: "2026-08-07T12:30:00.000Z",
    },
    event: {
      id: "mock-seoul-builder-sprint",
      organizerWallet: "0x953500000000000000000000000000000000f6eb",
      name: "Seoul Builder Sprint",
      description:
        "지갑 온보딩과 커뮤니티 앱을 빠르게 검증하는 48시간 빌더 스프린트입니다.",
      startDate: "2026-08-08T10:00:00.000Z",
      endDate: "2026-08-09T18:00:00.000Z",
      location: "Seoul, Korea",
      imageUrl: null,
      officialUrl: "https://awardblock.example/events/seoul-builder-sprint",
      socialUrl: null,
      status: "Published",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    awards: [
      {
        id: "mock-award-uniport-grand-prize",
        eventId: "mock-seoul-builder-sprint",
        projectId: "mock-my-project-uniport",
        organizerWallet: "0x953500000000000000000000000000000000f6eb",
        title: "Grand Prize",
        rank: "1st",
        reason:
          "지갑 기반 프로젝트 제출과 공개 수상 기록의 연결이 가장 명확했습니다.",
        judgingSummary:
          "참가자, 등록자, 수상자 플로우가 하나의 프로필 경험으로 이어집니다.",
        rewardTokenAddress: "0x2222222222222222222222222222222222222222",
        rewardTokenSymbol: "mUSDC",
        rewardTokenDecimals: 6,
        totalReward: "3000000",
        claimStart: "2026-08-16T00:00:00.000Z",
        claimEnd: "2026-09-16T00:00:00.000Z",
        metadataUri: "ipfs://awardblock/de-buthon-2026/uniport-grand-prize",
        metadataHash: "0xawardblock2026uniportmetadata",
        contractAwardId: "1",
        status: "Claiming",
        createTxHash:
          "0x1010101010101010101010101010101010101010101010101010101010101010",
        fundTxHash:
          "0x3030303030303030303030303030303030303030303030303030303030303030",
        finalizeTxHash:
          "0x4040404040404040404040404040404040404040404040404040404040404040",
        supersededBy: null,
        createdAt: "2026-08-15T09:00:00.000Z",
        updatedAt: "2026-08-17T05:30:00.000Z",
      },
    ],
  },
  "mock-my-project-chainfolio": {
    project: {
      id: "mock-my-project-chainfolio",
      eventId: "mock-campus-proof-demo-day",
      name: "Chainfolio",
      tagline: "캠퍼스 활동을 증명하는 포트폴리오",
      description:
        "Chainfolio는 학생 빌더의 프로젝트, 팀 활동, 제출물을 지갑 기반 증명으로 정리합니다.",
      problem:
        "캠퍼스 활동과 해커톤 결과물은 검토자가 신뢰할 수 있는 맥락으로 정리되기 어렵습니다.",
      solution:
        "활동 증빙, 제출 링크, 수상 기록을 하나의 카드로 묶어 검토 가능한 포트폴리오를 제공합니다.",
      imageUrl: null,
      githubUrl: "https://github.com/example/chainfolio",
      demoUrl: "https://chainfolio.example",
      presentationUrl: "https://chainfolio.example/deck",
      createdAt: "2026-08-12T09:00:00.000Z",
      updatedAt: "2026-08-12T09:00:00.000Z",
    },
    event: {
      id: "mock-campus-proof-demo-day",
      organizerWallet: "0x953500000000000000000000000000000000f6eb",
      name: "Campus Proof Demo Day",
      description:
        "대학생 빌더가 학습, 프로젝트, 기여 이력을 검증 가능한 포트폴리오로 제출하는 데모데이입니다.",
      startDate: "2026-08-15T11:00:00.000Z",
      endDate: "2026-08-15T19:00:00.000Z",
      location: "Daejeon, Korea",
      imageUrl: null,
      officialUrl: "https://awardblock.example/events/campus-proof-demo-day",
      socialUrl: null,
      status: "Published",
      createdAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    },
    awards: [
      {
        id: "mock-award-chainfolio-product",
        eventId: "mock-campus-proof-demo-day",
        projectId: "mock-my-project-chainfolio",
        organizerWallet: "0x953500000000000000000000000000000000f6eb",
        title: "Best Product - Chainfolio",
        rank: null,
        reason:
          "참가자 제출물의 맥락과 결과물을 가장 쉽게 검토할 수 있는 제품 흐름을 제시했습니다.",
        judgingSummary:
          "팀 활동, 프로젝트 산출물, 검증 링크를 하나의 카드로 묶는 방식이 실사용에 적합했습니다.",
        rewardTokenAddress: "0x2222222222222222222222222222222222222222",
        rewardTokenSymbol: "mUSDC",
        rewardTokenDecimals: 6,
        totalReward: "750000000",
        claimStart: "2026-08-16T00:00:00.000Z",
        claimEnd: "2026-09-16T00:00:00.000Z",
        metadataUri:
          "ipfs://awardblock/campus-proof-demo-day/chainfolio-product",
        metadataHash: "0xawardblock2026chainfoliometadata",
        contractAwardId: "2",
        status: "Funded",
        createTxHash:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        fundTxHash:
          "0x3333333333333333333333333333333333333333333333333333333333333333",
        finalizeTxHash:
          "0x4444444444444444444444444444444444444444444444444444444444444444",
        supersededBy: null,
        createdAt: "2026-08-15T11:00:00.000Z",
        updatedAt: "2026-08-15T12:00:00.000Z",
      },
    ],
  },
};

export function getMockProjectDetailFallback(
  projectId: string | null,
): ProjectDetailFallback | null {
  if (!projectId) return null;

  return mockProjectDetailFallbacks[projectId] ?? null;
}

export function renderProjectDetailPage(
  projectId: string | null = null,
): string {
  return `
    <main class="page-shell project-detail-page">
      <section class="project-detail-hero">
        <div>
          <p class="eyebrow">프로젝트</p>
          <h1>${projectId ? "프로젝트 상세" : "프로젝트를 사용할 수 없습니다"}</h1>
        </div>
        <span class="status-badge">공개</span>
      </section>
      <section id="project-detail-content" class="project-detail-content" aria-live="polite">
        ${projectId ? renderProjectDetailLoading() : renderProjectDetailMissingId()}
      </section>
    </main>
  `;
}

export async function mountProjectDetailPage(
  root: ParentNode,
  projectId: string,
): Promise<void> {
  const content = root.querySelector<HTMLElement>("#project-detail-content");

  if (!content) return;

  content.innerHTML = renderProjectDetailLoading();

  try {
    const { project } = await apiGet<ProjectDetailResponse>(
      `/projects/${encodeURIComponent(projectId)}`,
    );
    const [eventResponse, awardsResponse] = await Promise.all([
      apiGet<ProjectEventResponse>(
        `/events/${encodeURIComponent(project.eventId)}`,
      ),
      apiGet<ProjectAwardListResponse>(
        `/projects/${encodeURIComponent(project.id)}/awards`,
      ),
    ]);

    content.innerHTML = renderProjectDetailContent(
      mapProjectDetailToViewModel(
        project,
        eventResponse.event,
        awardsResponse.awards,
      ),
    );
  } catch {
    const fallback = getMockProjectDetailFallback(projectId);

    if (fallback) {
      content.innerHTML = renderProjectDetailContent(
        mapProjectDetailToViewModel(
          fallback.project,
          fallback.event,
          fallback.awards,
        ),
      );
      return;
    }

    content.innerHTML = renderProjectDetailError();
  }
}

export function mapProjectDetailToViewModel(
  project: ProjectDetail,
  event: ProjectEvent,
  awards: ProjectAward[],
): ProjectDetailViewModel {
  return {
    id: project.id,
    name: project.name,
    tagline: project.tagline,
    description: project.description,
    problemLabel: project.problem ?? "기록된 문제 정의가 없습니다",
    solutionLabel: project.solution ?? "기록된 해결책이 없습니다",
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
      status: formatAwardStatusLabel(award.status),
      rewardLabel: `${formatReward(
        award.totalReward,
        award.rewardTokenDecimals,
      )} ${award.rewardTokenSymbol}`,
      claimWindowLabel: `${formatDateLabel(award.claimStart)} - ${formatDateLabel(
        award.claimEnd,
      )}`,
      verificationLabel:
        award.metadataHash && award.contractAwardId ? "검증 완료" : "검토 필요",
      reasonLabel: award.reason ?? "기록된 선정 사유가 없습니다",
    })),
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
      <a class="text-link" href="${escapeHtml(project.eventHref)}">이벤트 보기</a>
    </section>
    <div class="detail-grid">
      ${renderDetailMetric("주최자", project.organizerLabel)}
      ${renderDetailMetric("어워드", String(project.awards.length))}
      ${renderDetailMetric("프로젝트", project.name)}
      ${renderDetailMetric("이벤트", project.eventName)}
    </div>
    <section class="detail-section">
      <h2>프로젝트 정보</h2>
      <p>${escapeHtml(project.description)}</p>
      <dl class="detail-metadata">
        <div><dt>문제</dt><dd>${escapeHtml(project.problemLabel)}</dd></div>
        <div><dt>해결책</dt><dd>${escapeHtml(project.solutionLabel)}</dd></div>
      </dl>
    </section>
    <section class="detail-section">
      <h2>프로젝트 링크</h2>
      <div class="project-link-list">
        ${renderExternalLink("GitHub", project.githubUrl)}
        ${renderExternalLink("데모", project.demoUrl)}
        ${renderExternalLink("발표 자료", project.presentationUrl)}
      </div>
    </section>
    <section class="detail-section">
      <h2>어워드</h2>
      ${renderProjectAwards(project.awards)}
    </section>
  `;
}

function renderProjectAwards(awards: ProjectDetailViewModel["awards"]): string {
  if (awards.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">어워드 없음</p>
        <h2>아직 기록된 어워드 결과가 없습니다</h2>
      </div>
    `;
  }

  return `
    <div class="project-award-list">
      ${awards.map(renderProjectAward).join("")}
    </div>
  `;
}

function renderProjectAward(
  award: ProjectDetailViewModel["awards"][number],
): string {
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
        <div><dt>리워드</dt><dd>${escapeHtml(award.rewardLabel)}</dd></div>
        <div><dt>클레임 기간</dt><dd>${escapeHtml(award.claimWindowLabel)}</dd></div>
        <div><dt>검증</dt><dd>${escapeHtml(award.verificationLabel)}</dd></div>
      </dl>
      <a class="text-link" href="${escapeHtml(award.href)}">어워드 보기</a>
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
      <p class="eyebrow">프로젝트 없음</p>
      <h2>프로젝트 ID가 필요합니다</h2>
    </div>
  `;
}

function renderProjectDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">프로젝트 오류</p>
      <h2>프로젝트 상세를 불러오지 못했습니다</h2>
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
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatAwardStatusLabel(value: string): string {
  if (value === "Draft") return "초안";
  if (value === "ReadyToFund") return "예치 대기";
  if (value === "Funded") return "예치 완료";
  if (value === "Claiming") return "클레임 진행 중";
  if (value === "Closed") return "종료";

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
