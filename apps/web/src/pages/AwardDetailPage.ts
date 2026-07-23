import { apiGet } from "../api/client";
import {
  mountAwardOnchainActions,
  renderAwardOnchainActions,
  type OnchainAward,
} from "../components/AwardOnchainActions";
import { chainConfig } from "../blockchain/config";
import { buildTransactionExplorerUrl } from "../utils/explorer";
import { formatTokenAmount, shortenAddress } from "../utils/format";

export type AwardBlockDetailResponse = {
  awardBlock: AwardBlockDetail;
};

export type AwardBlockDetail = {
  id: string;
  organizerWallet: string;
  event: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string | null;
    officialUrl: string | null;
  };
  project: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    githubUrl: string | null;
    demoUrl: string | null;
  };
  award: {
    id: string;
    title: string;
    rank: string | null;
    reason: string | null;
    judgingSummary: string | null;
    status: string;
    rewardTokenSymbol: string;
    rewardTokenAddress: string;
    rewardTokenDecimals: number;
    totalReward: string;
    claimStart: string;
    claimEnd: string;
    metadataUri: string | null;
    metadataHash: string | null;
    contractAwardId: string | null;
    createTxHash: string | null;
    fundTxHash: string | null;
    finalizeTxHash: string | null;
  };
  members: AwardBlockMember[];
  transactions: AwardBlockTransaction[];
  claimStats: {
    recipientCount: number;
    claimedCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

type AwardBlockMember = {
  id: string;
  displayName: string;
  walletAddress: string | null;
  allocation: string;
  inviteStatus: string;
  walletConnectedAt: string | null;
  claimedAt: string | null;
  claimTxHash: string | null;
};

type AwardBlockTransaction = {
  id: string;
  transactionType: string;
  walletAddress: string;
  txHash: string;
  blockNumber: number | null;
  createdAt: string;
};

type AwardBlockDetailViewModel = {
  id: string;
  eventName: string;
  projectName: string;
  projectTagline: string;
  projectDescription: string;
  awardTitle: string;
  awardReason: string;
  judgingSummary: string;
  status: string;
  organizerLabel: string;
  rewardLabel: string;
  claimProgress: string;
  claimWindowLabel: string;
  verificationLabel: string;
  metadataHashLabel: string;
  contractAwardIdLabel: string;
  onchainAward: OnchainAward;
  members: Array<{
    id: string;
    displayName: string;
    walletLabel: string;
    allocationLabel: string;
    status: string;
    claimedAtLabel: string;
    claimTxLabel: string;
  }>;
  transactions: Array<{
    id: string;
    typeLabel: string;
    walletLabel: string;
    txHashLabel: string;
    txUrl: string | null;
    blockLabel: string;
    createdAtLabel: string;
  }>;
};

const mockUniportAwardBlockDetail: AwardBlockDetail = {
  id: "award-1",
  organizerWallet: "0x953500000000000000000000000000000000f6eb",
  event: {
    id: "event-de-buthon-2026",
    name: "De-Buthon 2026",
    description:
      "Web3 빌더가 프로젝트를 제출하고 검증 가능한 수상 기록을 남기는 해커톤입니다.",
    startDate: "2026-08-01T09:00:00.000Z",
    endDate: "2026-08-15T18:00:00.000Z",
    location: "Seoul, Korea",
    officialUrl: "https://awardblock.example/events/de-buthon-2026",
  },
  project: {
    id: "project-uniport",
    name: "Uniport",
    tagline: "대학생을 위한 Web3 포트폴리오 패스포트",
    description:
      "Uniport는 참가자의 온체인 활동, 프로젝트 제출 이력, 수상 기록을 하나의 검증 가능한 포트폴리오로 연결하는 서비스입니다.",
    githubUrl: "https://github.com/example/uniport",
    demoUrl: "https://uniport.example",
  },
  award: {
    id: "award-1",
    title: "Grand Prize",
    rank: "1st",
    reason:
      "사용자 역할을 분리한 제출 플로우와 수상 기록의 검증 가능성을 가장 명확하게 보여주었습니다.",
    judgingSummary:
      "프로젝트 제출, 심사, 수상 기록 발행까지 이어지는 전체 여정이 완성도 있게 연결되었습니다.",
    status: "Claiming",
    rewardTokenSymbol: "mUSDC",
    rewardTokenAddress: "0x2222222222222222222222222222222222222222",
    rewardTokenDecimals: 6,
    totalReward: "3000000",
    claimStart: "2026-08-16T00:00:00.000Z",
    claimEnd: "2026-09-16T00:00:00.000Z",
    metadataUri: "ipfs://awardblock/de-buthon-2026/uniport-grand-prize",
    metadataHash: "0xawardblock2026uniportmetadata",
    contractAwardId: "1",
    createTxHash:
      "0x1010101010101010101010101010101010101010101010101010101010101010",
    fundTxHash:
      "0x3030303030303030303030303030303030303030303030303030303030303030",
    finalizeTxHash:
      "0x4040404040404040404040404040404040404040404040404040404040404040",
  },
  members: [
    {
      id: "member-uniport-team",
      displayName: "Uniport Team",
      walletAddress: "0x3333333333333333333333333333333333333333",
      allocation: "1500000",
      inviteStatus: "Claimed",
      walletConnectedAt: "2026-08-16T03:00:00.000Z",
      claimedAt: "2026-08-17T05:30:00.000Z",
      claimTxHash:
        "0x5050505050505050505050505050505050505050505050505050505050505050",
    },
    {
      id: "member-minji-kim",
      displayName: "Minji Kim",
      walletAddress: "0x4444444444444444444444444444444444444444",
      allocation: "900000",
      inviteStatus: "WalletConnected",
      walletConnectedAt: "2026-08-16T04:20:00.000Z",
      claimedAt: null,
      claimTxHash: null,
    },
    {
      id: "member-jae-lee",
      displayName: "Jae Lee",
      walletAddress: null,
      allocation: "600000",
      inviteStatus: "Pending",
      walletConnectedAt: null,
      claimedAt: null,
      claimTxHash: null,
    },
  ],
  transactions: [
    {
      id: "tx-award-created",
      transactionType: "AwardCreated",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x1010101010101010101010101010101010101010101010101010101010101010",
      blockNumber: 701001,
      createdAt: "2026-08-15T09:10:00.000Z",
    },
    {
      id: "tx-recipients-set",
      transactionType: "RecipientsSet",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x2020202020202020202020202020202020202020202020202020202020202020",
      blockNumber: 701015,
      createdAt: "2026-08-15T09:25:00.000Z",
    },
    {
      id: "tx-award-funded",
      transactionType: "AwardFunded",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x3030303030303030303030303030303030303030303030303030303030303030",
      blockNumber: 701022,
      createdAt: "2026-08-15T09:40:00.000Z",
    },
    {
      id: "tx-award-finalized",
      transactionType: "AwardFinalized",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x4040404040404040404040404040404040404040404040404040404040404040",
      blockNumber: 701030,
      createdAt: "2026-08-15T10:00:00.000Z",
    },
    {
      id: "tx-award-claimed",
      transactionType: "AwardClaimed",
      walletAddress: "0x3333333333333333333333333333333333333333",
      txHash:
        "0x5050505050505050505050505050505050505050505050505050505050505050",
      blockNumber: 701140,
      createdAt: "2026-08-17T05:30:00.000Z",
    },
  ],
  claimStats: {
    recipientCount: 3,
    claimedCount: 1,
  },
  createdAt: "2026-08-15T09:00:00.000Z",
  updatedAt: "2026-08-17T05:30:00.000Z",
};

const mockChainfolioAwardBlockDetail: AwardBlockDetail = {
  ...mockUniportAwardBlockDetail,
  id: "mock-award-chainfolio-product",
  event: {
    ...mockUniportAwardBlockDetail.event,
    id: "event-campus-proof-demo-day",
    name: "Campus Proof Demo Day",
    description:
      "캠퍼스 빌더가 협업 프로젝트와 제출물을 검증 가능한 포트폴리오로 전환하는 데모데이입니다.",
    startDate: "2026-08-15T09:00:00.000Z",
    endDate: "2026-08-15T18:00:00.000Z",
    location: "Busan, Korea",
    officialUrl: "https://awardblock.example/events/campus-proof-demo-day",
  },
  project: {
    id: "project-chainfolio",
    name: "Chainfolio",
    tagline: "캠퍼스 활동과 해커톤 제출물을 증명하는 포트폴리오",
    description:
      "Chainfolio는 학생 빌더의 프로젝트, 팀 활동, 수상 이력을 온체인 증명과 연결해 신뢰 가능한 이력서로 보여주는 서비스입니다.",
    githubUrl: "https://github.com/example/chainfolio",
    demoUrl: "https://chainfolio.example",
  },
  award: {
    ...mockUniportAwardBlockDetail.award,
    id: "mock-award-chainfolio-product",
    title: "Best Product - Chainfolio",
    rank: null,
    reason:
      "참가자 제출물의 맥락과 결과물을 가장 쉽게 검토할 수 있는 제품 흐름을 제시했습니다.",
    judgingSummary:
      "팀 활동, 프로젝트 산출물, 검증 링크를 하나의 카드로 묶는 방식이 실사용에 적합했습니다.",
    status: "Finalized",
    totalReward: "750000000",
    metadataUri: "ipfs://awardblock/campus-proof-demo-day/chainfolio-product",
    metadataHash: "0xawardblock2026chainfoliometadata",
    contractAwardId: "2",
    createTxHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    fundTxHash:
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    finalizeTxHash:
      "0x4444444444444444444444444444444444444444444444444444444444444444",
  },
  members: [
    {
      id: "member-chainfolio-team",
      displayName: "Chainfolio Team",
      walletAddress: "0x5555555555555555555555555555555555555555",
      allocation: "450000000",
      inviteStatus: "WalletConnected",
      walletConnectedAt: "2026-08-16T02:10:00.000Z",
      claimedAt: null,
      claimTxHash: null,
    },
    {
      id: "member-sora-choi",
      displayName: "Sora Choi",
      walletAddress: "0x6666666666666666666666666666666666666666",
      allocation: "300000000",
      inviteStatus: "Invited",
      walletConnectedAt: null,
      claimedAt: null,
      claimTxHash: null,
    },
  ],
  transactions: [
    {
      id: "tx-chainfolio-created",
      transactionType: "AwardCreated",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      blockNumber: 702001,
      createdAt: "2026-08-15T11:00:00.000Z",
    },
    {
      id: "tx-chainfolio-recipients",
      transactionType: "RecipientsSet",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      blockNumber: 702010,
      createdAt: "2026-08-15T11:15:00.000Z",
    },
    {
      id: "tx-chainfolio-funded",
      transactionType: "AwardFunded",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      blockNumber: 702020,
      createdAt: "2026-08-15T11:35:00.000Z",
    },
    {
      id: "tx-chainfolio-finalized",
      transactionType: "AwardFinalized",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x4444444444444444444444444444444444444444444444444444444444444444",
      blockNumber: 702030,
      createdAt: "2026-08-15T12:00:00.000Z",
    },
  ],
  claimStats: {
    recipientCount: 2,
    claimedCount: 0,
  },
  createdAt: "2026-08-15T11:00:00.000Z",
  updatedAt: "2026-08-15T12:00:00.000Z",
};

const mockImpactPassAwardBlockDetail: AwardBlockDetail = {
  ...mockUniportAwardBlockDetail,
  id: "mock-award-impact-pass",
  event: {
    ...mockUniportAwardBlockDetail.event,
    id: "event-public-goods-mini-hack",
    name: "Public Goods Mini Hack",
    description:
      "지역 공공재와 커뮤니티 기여를 기록하는 작은 실험을 빠르게 제출하는 미니 해커톤입니다.",
    startDate: "2026-08-23T10:00:00.000Z",
    endDate: "2026-08-24T18:00:00.000Z",
    location: "Online",
    officialUrl: "https://awardblock.example/events/public-goods-mini-hack",
  },
  project: {
    id: "project-impact-pass",
    name: "Impact Pass",
    tagline: "지역 공공재 기여를 기록하는 체크인 배지",
    description:
      "Impact Pass는 기여자가 수행한 지역 공공재 활동을 제출하고, 운영자가 검토한 뒤 배지와 수상 기록으로 남기는 도구입니다.",
    githubUrl: "https://github.com/example/impact-pass",
    demoUrl: "https://impact-pass.example",
  },
  award: {
    ...mockUniportAwardBlockDetail.award,
    id: "mock-award-impact-pass",
    title: "Impact Award - Impact Pass",
    rank: null,
    reason:
      "작은 커뮤니티 기여를 누구나 확인 가능한 기록으로 남기는 방향성이 행사 목적과 잘 맞았습니다.",
    judgingSummary:
      "참가자의 활동 증빙과 운영자의 선정 과정을 간단한 플로우로 정리했습니다.",
    status: "Funded",
    totalReward: "500000000",
    metadataUri: null,
    metadataHash: null,
    contractAwardId: null,
    createTxHash:
      "0x6161616161616161616161616161616161616161616161616161616161616161",
    fundTxHash:
      "0x6363636363636363636363636363636363636363636363636363636363636363",
    finalizeTxHash: null,
  },
  members: [
    {
      id: "member-impact-team",
      displayName: "Impact Pass Team",
      walletAddress: "0x7777777777777777777777777777777777777777",
      allocation: "200000000",
      inviteStatus: "Claimed",
      walletConnectedAt: "2026-08-25T01:00:00.000Z",
      claimedAt: "2026-08-25T03:00:00.000Z",
      claimTxHash:
        "0x6464646464646464646464646464646464646464646464646464646464646464",
    },
    {
      id: "member-yuna-han",
      displayName: "Yuna Han",
      walletAddress: "0x8888888888888888888888888888888888888888",
      allocation: "150000000",
      inviteStatus: "Claimed",
      walletConnectedAt: "2026-08-25T01:10:00.000Z",
      claimedAt: "2026-08-25T03:15:00.000Z",
      claimTxHash:
        "0x6565656565656565656565656565656565656565656565656565656565656565",
    },
    {
      id: "member-dohyun-park",
      displayName: "Dohyun Park",
      walletAddress: "0x9999999999999999999999999999999999999999",
      allocation: "100000000",
      inviteStatus: "WalletConnected",
      walletConnectedAt: "2026-08-25T01:20:00.000Z",
      claimedAt: null,
      claimTxHash: null,
    },
    {
      id: "member-noah-kang",
      displayName: "Noah Kang",
      walletAddress: null,
      allocation: "50000000",
      inviteStatus: "Pending",
      walletConnectedAt: null,
      claimedAt: null,
      claimTxHash: null,
    },
  ],
  transactions: [
    {
      id: "tx-impact-created",
      transactionType: "AwardCreated",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x6161616161616161616161616161616161616161616161616161616161616161",
      blockNumber: 703001,
      createdAt: "2026-08-24T10:00:00.000Z",
    },
    {
      id: "tx-impact-recipients",
      transactionType: "RecipientsSet",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x6262626262626262626262626262626262626262626262626262626262626262",
      blockNumber: 703011,
      createdAt: "2026-08-24T10:20:00.000Z",
    },
    {
      id: "tx-impact-funded",
      transactionType: "AwardFunded",
      walletAddress: "0x953500000000000000000000000000000000f6eb",
      txHash:
        "0x6363636363636363636363636363636363636363636363636363636363636363",
      blockNumber: 703020,
      createdAt: "2026-08-24T10:40:00.000Z",
    },
    {
      id: "tx-impact-claimed-1",
      transactionType: "AwardClaimed",
      walletAddress: "0x7777777777777777777777777777777777777777",
      txHash:
        "0x6464646464646464646464646464646464646464646464646464646464646464",
      blockNumber: 703120,
      createdAt: "2026-08-25T03:00:00.000Z",
    },
    {
      id: "tx-impact-claimed-2",
      transactionType: "AwardClaimed",
      walletAddress: "0x8888888888888888888888888888888888888888",
      txHash:
        "0x6565656565656565656565656565656565656565656565656565656565656565",
      blockNumber: 703125,
      createdAt: "2026-08-25T03:15:00.000Z",
    },
  ],
  claimStats: {
    recipientCount: 4,
    claimedCount: 2,
  },
  createdAt: "2026-08-24T10:00:00.000Z",
  updatedAt: "2026-08-25T03:15:00.000Z",
};
const mockAwardBlockDetails: Record<string, AwardBlockDetail> = {
  "award-1": mockUniportAwardBlockDetail,
  "mock-award-uniport-grand-prize": mockUniportAwardBlockDetail,
  "mock-award-chainfolio-product": mockChainfolioAwardBlockDetail,
  "mock-award-impact-pass": mockImpactPassAwardBlockDetail,
};

export function getMockAwardBlockDetail(
  awardId: string | null,
): AwardBlockDetail | null {
  if (!awardId) return null;

  return mockAwardBlockDetails[awardId] ?? null;
}
export function renderAwardDetailPage(awardId: string | null = null): string {
  return `
    <main class="page-shell award-detail-page">
      <section class="award-detail-hero">
        <div>
          <p class="eyebrow">어워드 블록</p>
          <h1>${awardId ? "어워드 블록" : "어워드를 사용할 수 없습니다"}</h1>
        </div>
        <span class="status-badge">공개</span>
      </section>
      <section id="award-detail-content" class="award-detail-content" aria-live="polite">
        ${awardId ? renderAwardDetailLoading() : renderAwardDetailMissingId()}
      </section>
    </main>
  `;
}

export async function mountAwardDetailPage(
  root: ParentNode,
  awardId: string,
): Promise<void> {
  const content = root.querySelector<HTMLElement>("#award-detail-content");

  if (!content) return;

  content.innerHTML = renderAwardDetailLoading();

  try {
    const response = await apiGet<AwardBlockDetailResponse>(
      `/award-blocks/${encodeURIComponent(awardId)}`,
    );
    content.innerHTML = renderAwardDetailContent(
      mapAwardBlockDetailToViewModel(response.awardBlock),
    );
    mountAwardOnchainActions(content);
  } catch {
    const mockAwardBlock = getMockAwardBlockDetail(awardId);

    if (mockAwardBlock) {
      content.innerHTML = renderAwardDetailContent(
        mapAwardBlockDetailToViewModel(mockAwardBlock),
      );
      mountAwardOnchainActions(content);
      return;
    }

    content.innerHTML = renderAwardDetailError();
  }
}

export function mapAwardBlockDetailToViewModel(
  awardBlock: AwardBlockDetail,
  blockExplorerUrl: string = chainConfig.blockExplorerUrl,
): AwardBlockDetailViewModel {
  return {
    id: awardBlock.id,
    eventName: awardBlock.event.name,
    projectName: awardBlock.project.name,
    projectTagline: awardBlock.project.tagline,
    projectDescription: awardBlock.project.description,
    awardTitle: awardBlock.award.rank
      ? `${awardBlock.award.rank} - ${awardBlock.award.title}`
      : awardBlock.award.title,
    awardReason: awardBlock.award.reason ?? "기록된 선정 사유가 없습니다",
    judgingSummary:
      awardBlock.award.judgingSummary ?? "기록된 심사 요약이 없습니다",
    status: formatAwardStatusLabel(awardBlock.award.status),
    organizerLabel: shortenAddress(awardBlock.organizerWallet),
    rewardLabel: `${formatReward(
      awardBlock.award.totalReward,
      awardBlock.award.rewardTokenDecimals,
    )} ${awardBlock.award.rewardTokenSymbol}`,
    claimProgress: `${awardBlock.claimStats.claimedCount}/${awardBlock.claimStats.recipientCount} 클레임 완료`,
    claimWindowLabel: `${formatDateLabel(awardBlock.award.claimStart)} - ${formatDateLabel(
      awardBlock.award.claimEnd,
    )}`,
    verificationLabel:
      awardBlock.award.metadataHash && awardBlock.award.contractAwardId
        ? "검증 완료"
        : "검토 필요",
    metadataHashLabel: awardBlock.award.metadataHash ?? "기록 없음",
    contractAwardIdLabel: awardBlock.award.contractAwardId ?? "기록 없음",
    onchainAward: {
      id: awardBlock.award.id,
      contractAwardId: awardBlock.award.contractAwardId,
      rewardTokenAddress: awardBlock.award.rewardTokenAddress,
      totalReward: awardBlock.award.totalReward,
      status: awardBlock.award.status,
    },
    members: awardBlock.members.map((member) => ({
      id: member.id,
      displayName: member.displayName,
      walletLabel: member.walletAddress
        ? shortenAddress(member.walletAddress)
        : "미연결",
      allocationLabel: `${formatReward(
        member.allocation,
        awardBlock.award.rewardTokenDecimals,
      )} ${awardBlock.award.rewardTokenSymbol}`,
      status: formatInviteStatusLabel(member.inviteStatus),
      claimedAtLabel: formatNullableDateLabel(member.claimedAt),
      claimTxLabel: member.claimTxHash
        ? shortenAddress(member.claimTxHash)
        : "기록 없음",
    })),
    transactions: sortAwardTransactions(awardBlock.transactions).map(
      (transaction) => ({
        id: transaction.id,
        typeLabel: formatTransactionTypeLabel(transaction.transactionType),
        walletLabel: shortenAddress(transaction.walletAddress),
        txHashLabel: shortenAddress(transaction.txHash),
        txUrl: buildTransactionExplorerUrl(
          blockExplorerUrl,
          transaction.txHash,
        ),
        blockLabel:
          transaction.blockNumber === null
            ? "블록 대기 중"
            : `#${transaction.blockNumber}`,
        createdAtLabel: formatDateLabel(transaction.createdAt),
      }),
    ),
  };
}

export function renderAwardDetailContent(
  awardBlock: AwardBlockDetailViewModel,
): string {
  return `
    <section class="award-detail-summary">
      <div>
        <p class="eyebrow">${escapeHtml(awardBlock.eventName)}</p>
        <h2>${escapeHtml(awardBlock.awardTitle)}</h2>
        <p>${escapeHtml(awardBlock.projectName)} - ${escapeHtml(awardBlock.projectTagline)}</p>
      </div>
      <span class="status-badge">${escapeHtml(awardBlock.status)}</span>
    </section>
    <div class="detail-grid">
      ${renderDetailMetric("주최자", awardBlock.organizerLabel)}
      ${renderDetailMetric("리워드", awardBlock.rewardLabel)}
      ${renderDetailMetric("클레임", awardBlock.claimProgress)}
      ${renderDetailMetric("검증", awardBlock.verificationLabel)}
    </div>
    <section class="detail-section">
      <h2>프로젝트 정보</h2>
      <p>${escapeHtml(awardBlock.projectDescription)}</p>
      <p>${escapeHtml(awardBlock.awardReason)}</p>
      <p>${escapeHtml(awardBlock.judgingSummary)}</p>
    </section>
    <section class="detail-section">
      <h2>검증 정보</h2>
      <dl class="detail-metadata">
        <div><dt>클레임 기간</dt><dd>${escapeHtml(awardBlock.claimWindowLabel)}</dd></div>
        <div><dt>메타데이터 해시</dt><dd>${escapeHtml(awardBlock.metadataHashLabel)}</dd></div>
        <div><dt>컨트랙트 어워드 ID</dt><dd>${escapeHtml(awardBlock.contractAwardIdLabel)}</dd></div>
      </dl>
    </section>
    ${renderAwardOnchainActions(awardBlock.onchainAward)}
    <section class="detail-section">
      <h2>수신자</h2>
      ${renderMembers(awardBlock.members)}
    </section>
    <section class="detail-section">
      <h2>트랜잭션</h2>
      ${renderTransactions(awardBlock.transactions)}
    </section>
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

function renderMembers(members: AwardBlockDetailViewModel["members"]): string {
  if (members.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">수신자 없음</p>
        <h2>아직 어워드 멤버가 없습니다</h2>
      </div>
    `;
  }

  return `
    <div class="award-member-list">
      ${members.map(renderMember).join("")}
    </div>
  `;
}

function renderMember(
  member: AwardBlockDetailViewModel["members"][number],
): string {
  return `
    <article class="award-member-row">
      <div>
        <strong>${escapeHtml(member.displayName)}</strong>
        <span>${escapeHtml(member.walletLabel)}</span>
      </div>
      <dl>
        <div><dt>배정 수량</dt><dd>${escapeHtml(member.allocationLabel)}</dd></div>
        <div><dt>상태</dt><dd>${escapeHtml(member.status)}</dd></div>
        <div><dt>클레임일</dt><dd>${escapeHtml(member.claimedAtLabel)}</dd></div>
        <div><dt>클레임 트랜잭션</dt><dd>${escapeHtml(member.claimTxLabel)}</dd></div>
      </dl>
    </article>
  `;
}

function renderTransactions(
  transactions: AwardBlockDetailViewModel["transactions"],
): string {
  if (transactions.length === 0) {
    return `
      <div class="empty-state">
        <p class="eyebrow">트랜잭션 없음</p>
        <h2>기록된 온체인 활동이 없습니다</h2>
      </div>
    `;
  }

  return `
    <ul class="claim-transaction-list" aria-label="어워드 트랜잭션">
      ${transactions
        .map(
          (transaction) => `
            <li>
              ${renderTransactionHash(transaction)}
              <strong>${escapeHtml(transaction.typeLabel)}</strong>
              <small>${escapeHtml(transaction.blockLabel)} - ${escapeHtml(
                transaction.createdAtLabel,
              )}</small>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderTransactionHash(
  transaction: AwardBlockDetailViewModel["transactions"][number],
): string {
  if (!transaction.txUrl) {
    return `<span>${escapeHtml(transaction.txHashLabel)}</span>`;
  }

  return `<a class="text-link" href="${escapeHtml(transaction.txUrl)}" target="_blank" rel="noreferrer">${escapeHtml(transaction.txHashLabel)}</a>`;
}

function renderAwardDetailLoading(): string {
  return `
    <div class="profile-loading">
      <span class="loading-bar"></span>
      <span class="loading-bar loading-bar--short"></span>
    </div>
  `;
}

function renderAwardDetailMissingId(): string {
  return `
    <div class="empty-state">
      <p class="eyebrow">어워드 없음</p>
      <h2>어워드 ID가 필요합니다</h2>
    </div>
  `;
}

function renderAwardDetailError(): string {
  return `
    <div class="empty-state empty-state--error">
      <p class="eyebrow">어워드 오류</p>
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

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatNullableDateLabel(value: string | null): string {
  return value ? formatDateLabel(value) : "미클레임";
}

function formatAwardStatusLabel(value: string): string {
  if (value === "Draft") return "초안";
  if (value === "ReadyToFund") return "예치 대기";
  if (value === "Funded") return "예치 완료";
  if (value === "Claiming") return "클레임 진행 중";
  if (value === "Closed") return "종료";

  return value;
}

function formatInviteStatusLabel(value: string): string {
  if (value === "Invited") return "초대됨";
  if (value === "Pending") return "대기 중";
  if (value === "WalletConnected") return "지갑 연결됨";
  if (value === "Claimed") return "클레임 완료";
  if (value === "Revoked") return "취소됨";

  return value;
}

function formatTransactionTypeLabel(value: string): string {
  if (value === "AwardRegistered") return "어워드 등록";
  if (value === "AwardCreated") return "어워드 생성";
  if (value === "RecipientsSet") return "수신자 설정";
  if (value === "AwardFunded") return "리워드 예치";
  if (value === "AwardFinalized") return "어워드 확정";
  if (value === "AwardClaimed") return "리워드 클레임";

  return value;
}

function sortAwardTransactions(
  transactions: AwardBlockTransaction[],
): AwardBlockTransaction[] {
  return [...transactions].sort((left, right) => {
    const phaseDifference =
      getTransactionPhaseOrder(left.transactionType) -
      getTransactionPhaseOrder(right.transactionType);

    if (phaseDifference !== 0) {
      return phaseDifference;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

function getTransactionPhaseOrder(transactionType: string): number {
  if (
    transactionType === "AwardRegistered" ||
    transactionType === "AwardCreated"
  )
    return 10;
  if (transactionType === "RecipientsSet") return 20;
  if (transactionType === "AwardFunded") return 30;
  if (transactionType === "AwardFinalized") return 40;
  if (transactionType === "AwardClaimed") return 50;

  return 999;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
