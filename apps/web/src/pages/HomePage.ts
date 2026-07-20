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

export function renderHomePage(): string {
  return `
    <main class="page-shell">
      <section class="hero-section">
        <p class="eyebrow">검증 가능한 어워드 아카이브</p>
        <h1>AwardBlock</h1>
        <p class="hero-copy">공개 어워드 결과, 프로젝트 맥락, ERC-20 클레임 진행률, 검증 메타데이터를 한곳에서 확인하세요.</p>
      </section>
      <section class="section-stack">
        <div class="section-header">
          <div>
            <p class="eyebrow">실시간 데이터</p>
            <h2>최신 어워드 블록</h2>
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
    list.innerHTML = renderAwardBlockList(mapAwardBlocksToSummaries(response.awardBlocks));
  } catch {
    list.innerHTML = renderHomeError();
  }
}

export function mapAwardBlocksToSummaries(awardBlocks: AwardBlock[]): AwardBlockSummary[] {
  return awardBlocks.map((awardBlock) => ({
    id: awardBlock.id,
    eventName: awardBlock.event.name,
    awardTitle: awardBlock.award.rank
      ? `${awardBlock.award.rank} - ${awardBlock.award.title}`
      : awardBlock.award.title,
    projectName: awardBlock.project.name,
    organizer: shortenAddress(awardBlock.organizerWallet),
    rewardLabel: `${formatReward(
      awardBlock.award.totalReward,
      awardBlock.award.rewardTokenDecimals
    )} ${awardBlock.award.rewardTokenSymbol}`,
    claimProgress: `${awardBlock.claimStats.claimedCount}/${awardBlock.claimStats.recipientCount} 클레임 완료`,
    verified: awardBlock.award.metadataHash !== null && awardBlock.award.contractAwardId !== null,
    href: `/awards/${awardBlock.id}`
  }));
}

function renderAwardBlockList(awards: AwardBlockSummary[]): string {
  if (awards.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">어워드 블록 없음</p>
        <h2>아직 공개 어워드가 없습니다</h2>
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

function renderHomeError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">로드 실패</p>
      <h2>어워드 블록을 불러오지 못했습니다</h2>
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
