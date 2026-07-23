import {
  getMockAwardBlockSummaries,
  mapAwardBlocksToSummaries,
  mergeAwardBlocksWithMockData,
  renderHomePage,
  type AwardBlockListResponse,
} from "./HomePage";
import { renderAwardBlockCard } from "../components/AwardBlockCard";

const response: AwardBlockListResponse = {
  awardBlocks: [
    {
      id: "award-1",
      organizerWallet: "0x0123456789abcdef0123456789abcdef01234567",
      event: {
        id: "event-1",
        name: "Seoul Demo Day",
        startDate: "2026-08-01T09:00:00.000Z",
        endDate: "2026-08-01T18:00:00.000Z",
      },
      project: {
        id: "project-1",
        name: "ProofBoard",
        tagline: "Verifiable award submissions",
      },
      award: {
        id: "award-1",
        title: "Best Product",
        rank: "1st",
        status: "Claiming",
        rewardTokenSymbol: "mUSDC",
        rewardTokenDecimals: 6,
        totalReward: "1000000",
        metadataHash: "0xabc123",
        contractAwardId: "contract-award-1",
      },
      claimStats: {
        recipientCount: 2,
        claimedCount: 1,
      },
      createdAt: "2026-08-01T18:00:00.000Z",
    },
  ],
};

const summaries = mapAwardBlocksToSummaries(response.awardBlocks);

if (summaries[0]?.eventName !== "Seoul Demo Day") {
  throw new Error("Expected event name from award block");
}

if (summaries[0]?.rewardLabel !== "1 mUSDC") {
  throw new Error("Expected formatted reward label");
}

if (summaries[0]?.awardTitle !== "1st - Best Product") {
  throw new Error("Expected ranked award title");
}

if (summaries[0]?.claimProgress !== "1/2 클레임 완료") {
  throw new Error("Expected Korean claim progress label");
}

if (summaries[0]?.recipientSummary !== "수상자 2명") {
  throw new Error("Expected recipient summary label");
}

if (summaries[0]?.eventDateLabel !== "2026년 8월 01일") {
  throw new Error("Expected event date label on award card");
}

if (summaries[0]?.projectTagline !== "Verifiable award submissions") {
  throw new Error("Expected project tagline on award card");
}

if (summaries[0]?.organizer !== "0x0123...4567") {
  throw new Error("Expected shortened organizer wallet");
}

if (
  summaries[0]?.verified !== true ||
  summaries[0]?.statusLabel !== "검증 완료"
) {
  throw new Error("Expected verified Korean status label");
}

const mockSummaries = getMockAwardBlockSummaries();

if (mockSummaries.length < 3) {
  throw new Error("Expected at least three rich mock award blocks on home");
}

if (
  !mockSummaries.every(
    (award) =>
      award.projectTagline && award.recipientSummary && award.eventDateLabel,
  )
) {
  throw new Error(
    "Expected mock award cards to include project, recipient, and event date details",
  );
}

const mergedEmpty = mergeAwardBlocksWithMockData([]);

if (mergedEmpty.length < 3 || !mergedEmpty[0]?.href.startsWith("/awards/")) {
  throw new Error(
    "Expected empty API data to fall back to clickable mock award cards",
  );
}

const mergedReal = mergeAwardBlocksWithMockData(response.awardBlocks);

if (mergedReal[0]?.id !== "award-1" || mergedReal.length <= summaries.length) {
  throw new Error(
    "Expected real award blocks to remain first and be enriched with mock cards",
  );
}

const homeHtml = renderHomePage();

if (!homeHtml.includes("검증 가능한 수상 아카이브")) {
  throw new Error("Expected Korean home hero copy");
}

if (!homeHtml.includes("site-header")) {
  throw new Error("Expected home page to render a top header");
}

if (
  !homeHtml.includes('class="site-logo"') ||
  !homeHtml.includes("AwardBlock")
) {
  throw new Error("Expected top-left AwardBlock logo");
}

if (!homeHtml.includes('href="/login"') || !homeHtml.includes("로그인")) {
  throw new Error("Expected top-right login button linking to role login");
}

if (!homeHtml.includes("award-block-list")) {
  throw new Error("Expected first page to keep showing award blocks");
}

const cardHtml = renderAwardBlockCard(summaries[0]!);

if (
  !cardHtml.includes('href="/awards/award-1"') ||
  !cardHtml.includes("award-card__details")
) {
  throw new Error("Expected full award card to link to award detail");
}

if (!cardHtml.includes("검증 완료")) {
  throw new Error("Expected Korean verification label");
}

if (
  !cardHtml.includes("Verifiable award submissions") ||
  !cardHtml.includes("수상자 2명")
) {
  throw new Error("Expected rich project and recipient information on card");
}
