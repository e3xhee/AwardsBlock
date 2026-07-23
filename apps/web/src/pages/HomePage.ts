import { apiGet } from "../api/client";
import { renderAwardBlockCard } from "../components/AwardBlockCard";
import type { AwardBlockSummary } from "../types/award";
import { formatTokenAmount, shortenAddress } from "../utils/format";

export type AwardBlockListResponse = {
  awardBlocks: AwardBlock[];
};

export type AwardBlock = {
  id: string;
  organizerWallet: string;
  event: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  project: {
    id: string;
    name: string;
    tagline: string | null;
  };
  award: {
    id: string;
    title: string;
    rank: string | null;
    status: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    totalReward: string;
    metadataHash: string | null;
    contractAwardId: string | null;
  };
  claimStats: {
    recipientCount: number;
    claimedCount: number;
  };
  createdAt: string;
};

const mockAwardBlockSummaries: AwardBlockSummary[] = [
  {
    id: "mock-award-uniport-grand-prize",
    eventName: "De-Buthon 2026",
    eventDateLabel: "2026년 8월 01일",
    awardTitle: "Grand Prize",
    projectName: "Uniport",
    projectTagline: "대학생 빌더를 위한 검증 가능한 프로젝트 패스포트",
    organizer: "0xfcad...377c",
    rewardLabel: "1,000 mUSDC",
    recipientSummary: "수상자 3명",
    claimProgress: "1/3 클레임 완료",
    statusLabel: "검증 완료",
    verified: true,
    href: "/awards/mock-award-uniport-grand-prize",
  },
  {
    id: "mock-award-chainfolio-product",
    eventName: "Campus Proof Demo Day",
    eventDateLabel: "2026년 8월 15일",
    awardTitle: "Best Product - Chainfolio",
    projectName: "Chainfolio",
    projectTagline: "캠퍼스 활동과 해커톤 산출물을 증명하는 포트폴리오",
    organizer: "0xfcad...377c",
    rewardLabel: "750 mUSDC",
    recipientSummary: "수상자 2명",
    claimProgress: "0/2 클레임 완료",
    statusLabel: "검증 완료",
    verified: true,
    href: "/awards/mock-award-chainfolio-product",
  },
  {
    id: "mock-award-impact-pass",
    eventName: "Public Goods Mini Hack",
    eventDateLabel: "2026년 8월 23일",
    awardTitle: "Impact Award - Impact Pass",
    projectName: "Impact Pass",
    projectTagline: "지역 공공재 기여를 기록하는 온체인 배지",
    organizer: "0xfcad...377c",
    rewardLabel: "500 mUSDC",
    recipientSummary: "수상자 4명",
    claimProgress: "2/4 클레임 완료",
    statusLabel: "검증 대기",
    verified: false,
    href: "/awards/mock-award-impact-pass",
  },
];

export function renderHomePage(): string {
  return `
    <main class="page-shell home-page">
      <header class="site-header">
        <a class="site-logo" href="/" aria-label="AwardBlock 홈">
          <span class="site-logo__mark">AB</span>
          <span>AwardBlock</span>
        </a>
        <a class="button site-header__login" href="/login">로그인</a>
      </header>
      <section class="hero-section">
        <p class="eyebrow">검증 가능한 수상 아카이브</p>
        <h1>AwardBlock</h1>
        <p class="hero-copy">공개된 행사 수상 결과, 프로젝트 맥락, 리워드 클레임 진행을 한 화면에서 확인하세요.</p>
      </section>
      <section class="section-stack">
        <div class="section-header">
          <div>
            <p class="eyebrow">실시간 데이터</p>
            <h2>최신 수상 블록</h2>
          </div>
          <span class="status-badge">공개</span>
        </div>
        <div id="award-block-list" class="award-block-list" aria-live="polite">
          ${renderHomeLoading()}
        </div>
      </section>
    </main>
  `;
}

export async function mountHomePage(root: ParentNode): Promise<void> {
  const list = root.querySelector<HTMLElement>("#award-block-list");

  if (!list) return;

  list.innerHTML = renderHomeLoading();

  try {
    const response = await apiGet<AwardBlockListResponse>("/award-blocks");
    list.innerHTML = renderAwardBlockList(
      mergeAwardBlocksWithMockData(response.awardBlocks),
    );
  } catch {
    list.innerHTML = renderAwardBlockList(getMockAwardBlockSummaries());
  }
}

export function mergeAwardBlocksWithMockData(
  awardBlocks: AwardBlock[],
): AwardBlockSummary[] {
  const realSummaries = mapAwardBlocksToSummaries(awardBlocks);
  const realIds = new Set(realSummaries.map((award) => award.id));
  const mockSummaries = getMockAwardBlockSummaries().filter(
    (award) => !realIds.has(award.id),
  );

  return [...realSummaries, ...mockSummaries];
}

export function getMockAwardBlockSummaries(): AwardBlockSummary[] {
  return mockAwardBlockSummaries.map((award) => ({ ...award }));
}

export function mapAwardBlocksToSummaries(
  awardBlocks: AwardBlock[],
): AwardBlockSummary[] {
  return awardBlocks.map((awardBlock) => {
    const recipientCount = awardBlock.claimStats.recipientCount;
    const verified =
      awardBlock.award.metadataHash !== null &&
      awardBlock.award.contractAwardId !== null;

    return {
      id: awardBlock.id,
      eventName: awardBlock.event.name,
      eventDateLabel: formatDateLabel(awardBlock.event.startDate),
      awardTitle: awardBlock.award.rank
        ? `${awardBlock.award.rank} - ${awardBlock.award.title}`
        : awardBlock.award.title,
      projectName: awardBlock.project.name,
      projectTagline:
        awardBlock.project.tagline ?? "프로젝트 소개가 아직 없습니다.",
      organizer: shortenAddress(awardBlock.organizerWallet),
      rewardLabel: `${formatReward(
        awardBlock.award.totalReward,
        awardBlock.award.rewardTokenDecimals,
      )} ${awardBlock.award.rewardTokenSymbol}`,
      recipientSummary: `수상자 ${recipientCount}명`,
      claimProgress: `${awardBlock.claimStats.claimedCount}/${recipientCount} 클레임 완료`,
      statusLabel: verified ? "검증 완료" : "검증 대기",
      verified,
      href: `/awards/${awardBlock.id}`,
    };
  });
}

function renderAwardBlockList(awards: AwardBlockSummary[]): string {
  if (awards.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">수상 블록 없음</p>
        <h2>아직 공개된 수상 기록이 없습니다</h2>
      </div>
    `;
  }

  return awards.map(renderAwardBlockCard).join("");
}

function renderHomeLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
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
    month: "long",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
