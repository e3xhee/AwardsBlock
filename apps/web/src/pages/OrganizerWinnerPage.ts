import { apiGet, apiPost } from "../api/client";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

type EventSummary = {
  id: string;
  name: string;
  status: string;
};

type EventListResponse = {
  events: EventSummary[];
};

type EventProject = {
  id: string;
  name: string;
  tagline: string;
};

type EventProjectListResponse = {
  projects: EventProject[];
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

const defaultWinner = {
  title: "Grand Prize",
  rank: "",
  reason: "Uniport는 문제 정의, Web3 UX, 데모 완성도에서 가장 강한 결과를 보여줬습니다.",
  judgingSummary: "실사용 가능한 흐름과 검증 가능한 수상 기록 구조가 명확합니다.",
  rewardTokenAddress: "0x2222222222222222222222222222222222222222",
  rewardTokenSymbol: "mUSDC",
  rewardTokenDecimals: "6",
  totalReward: "1000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
  metadataUri: "ipfs://awardblock/de-buthon-2026/uniport-grand-prize",
  metadataHash: "0xabc123",
  recipientName: "Uniport Team",
  recipientEmail: "team@uniport.example",
  recipientWalletAddress: "0x3333333333333333333333333333333333333333",
  recipientAllocation: "1000000"
};

export function renderOrganizerWinnerPage(): string {
  return `
    <main class="page-shell organizer-winner-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">등록자 로그인</p>
          <h1>우승자 선택</h1>
          <p>등록자는 참가자가 제출한 프로젝트 중 수상 프로젝트를 선택하고 수상 기록을 생성합니다.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">등록자</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="organizer-layout">
        <form id="organizer-winner-form" class="organizer-form">
          <fieldset>
            <legend>수상 대상</legend>
            <label>
              <span>행사</span>
              <select name="eventId" id="winner-event-select" required>
                <option value="">행사를 불러오는 중입니다</option>
              </select>
            </label>
            <label>
              <span>프로젝트</span>
              <select name="projectId" id="winner-project-select" required>
                <option value="">먼저 행사를 선택하세요</option>
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>수상 기록</legend>
            <div class="organizer-field-grid">
              ${renderInput("수상명", "title", defaultWinner.title, true)}
              ${renderInput("순위", "rank", defaultWinner.rank)}
            </div>
            ${renderTextarea("선정 사유", "reason", defaultWinner.reason)}
            ${renderTextarea("심사 요약", "judgingSummary", defaultWinner.judgingSummary)}
            <div class="organizer-field-grid">
              ${renderInput("리워드 토큰 주소", "rewardTokenAddress", defaultWinner.rewardTokenAddress, true)}
              ${renderInput("심볼", "rewardTokenSymbol", defaultWinner.rewardTokenSymbol, true)}
              ${renderInput("소수점", "rewardTokenDecimals", defaultWinner.rewardTokenDecimals, true)}
            </div>
            ${renderInput("총 리워드(base unit)", "totalReward", defaultWinner.totalReward, true)}
            <div class="organizer-field-grid">
              ${renderInput("클레임 시작", "claimStart", defaultWinner.claimStart, true)}
              ${renderInput("클레임 종료", "claimEnd", defaultWinner.claimEnd, true)}
            </div>
            <div class="organizer-field-grid">
              ${renderInput("Metadata URI", "metadataUri", defaultWinner.metadataUri)}
              ${renderInput("Metadata hash", "metadataHash", defaultWinner.metadataHash)}
            </div>
          </fieldset>
          <fieldset>
            <legend>수령자</legend>
            <div class="organizer-field-grid">
              ${renderInput("수령자 이름", "recipientName", defaultWinner.recipientName, true)}
              ${renderInput("수령자 이메일", "recipientEmail", defaultWinner.recipientEmail)}
            </div>
            ${renderInput("수령자 지갑", "recipientWalletAddress", defaultWinner.recipientWalletAddress, true)}
            ${renderInput("배정 수량(base unit)", "recipientAllocation", defaultWinner.recipientAllocation, true)}
          </fieldset>
          <button class="button" type="submit">우승자 선택</button>
        </form>
        <aside id="organizer-winner-result" class="organizer-result" aria-live="polite">
          <p class="eyebrow">대기 중</p>
          <h2>수상 프로젝트를 선택하세요</h2>
          <p>생성된 수상 기록은 이후 온체인 등록과 리워드 펀딩 단계로 이어집니다.</p>
        </aside>
      </section>
    </main>
  `;
}

export function mountOrganizerWinnerPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#organizer-winner-form");
  const eventSelect = root.querySelector<HTMLSelectElement>("#winner-event-select");
  const projectSelect = root.querySelector<HTMLSelectElement>("#winner-project-select");
  const result = root.querySelector<HTMLElement>("#organizer-winner-result");

  if (!form || !eventSelect || !projectSelect || !result) return;

  void loadEvents(eventSelect, projectSelect);
  eventSelect.addEventListener("change", () => {
    void loadProjects(eventSelect.value, projectSelect);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const projectId = String(formData.get("projectId") ?? "");
    result.innerHTML = renderProgress("수상 기록을 생성하는 중입니다");

    try {
      const award = await createWinnerAward(projectId, readAwardPayload(formData));
      const member = await createWinnerMember(award.award.id, readMemberPayload(formData));
      result.innerHTML = `
        <p class="eyebrow">우승자 선택 완료</p>
        <h2>${escapeHtml(award.award.title)}</h2>
        <dl class="organizer-result-list">
          <div><dt>어워드 ID</dt><dd>${escapeHtml(award.award.id)}</dd></div>
          <div><dt>수령자</dt><dd>${escapeHtml(member.member.displayName)}</dd></div>
        </dl>
        <a class="text-link" href="/awards/${encodeURIComponent(award.award.id)}">수상 기록 보기</a>
      `;
    } catch {
      result.innerHTML = renderError("우승자 선택에 실패했습니다", "등록자 지갑이 행사 등록자와 같은지 확인하세요.");
    }
  });
}

export async function createWinnerAward(
  projectId: string,
  payload: AwardPayload
): Promise<CreatedAwardResponse> {
  return apiPost<CreatedAwardResponse, AwardPayload>(
    `/projects/${encodeURIComponent(projectId)}/awards`,
    payload
  );
}

export async function createWinnerMember(
  awardId: string,
  payload: MemberPayload
): Promise<CreatedMemberResponse> {
  return apiPost<CreatedMemberResponse, MemberPayload>(
    `/awards/${encodeURIComponent(awardId)}/members`,
    payload
  );
}

async function loadEvents(
  eventSelect: HTMLSelectElement,
  projectSelect: HTMLSelectElement
): Promise<void> {
  try {
    const response = await apiGet<EventListResponse>("/events");
    const events = response.events.filter((event) => event.status !== "Archived");
    eventSelect.innerHTML = events.length
      ? events
          .map((event) => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}</option>`)
          .join("")
      : `<option value="">등록된 행사가 없습니다</option>`;

    if (events[0]) {
      await loadProjects(events[0].id, projectSelect);
    }
  } catch {
    eventSelect.innerHTML = `<option value="">행사를 불러오지 못했습니다</option>`;
  }
}

async function loadProjects(eventId: string, select: HTMLSelectElement): Promise<void> {
  if (!eventId) {
    select.innerHTML = `<option value="">먼저 행사를 선택하세요</option>`;
    return;
  }

  select.innerHTML = `<option value="">프로젝트를 불러오는 중입니다</option>`;

  try {
    const response = await apiGet<EventProjectListResponse>(
      `/events/${encodeURIComponent(eventId)}/projects`
    );
    select.innerHTML = response.projects.length
      ? response.projects
          .map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`)
          .join("")
      : `<option value="">제출된 프로젝트가 없습니다</option>`;
  } catch {
    select.innerHTML = `<option value="">프로젝트를 불러오지 못했습니다</option>`;
  }
}

function readAwardPayload(formData: FormData): AwardPayload {
  return {
    title: readRequired(formData, "title"),
    rank: readNullable(formData, "rank"),
    reason: readNullable(formData, "reason"),
    judgingSummary: readNullable(formData, "judgingSummary"),
    rewardTokenAddress: readRequired(formData, "rewardTokenAddress"),
    rewardTokenSymbol: readRequired(formData, "rewardTokenSymbol"),
    rewardTokenDecimals: Number(readRequired(formData, "rewardTokenDecimals")),
    totalReward: readRequired(formData, "totalReward"),
    claimStart: readRequired(formData, "claimStart"),
    claimEnd: readRequired(formData, "claimEnd"),
    metadataUri: readNullable(formData, "metadataUri"),
    metadataHash: readNullable(formData, "metadataHash"),
    status: "AwaitingRecipients"
  };
}

function readMemberPayload(formData: FormData): MemberPayload {
  return {
    displayName: readRequired(formData, "recipientName"),
    email: readNullable(formData, "recipientEmail"),
    walletAddress: readRequired(formData, "recipientWalletAddress"),
    allocation: readRequired(formData, "recipientAllocation"),
    inviteStatus: "Pending"
  };
}

function renderInput(label: string, name: string, value: string, required = false): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" value="${escapeHtml(value)}"${required ? " required" : ""} />
    </label>
  `;
}

function renderTextarea(label: string, name: string, value: string, required = false): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea name="${escapeHtml(name)}"${required ? " required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderProgress(title: string): string {
  return `<p class="eyebrow">진행 중</p><h2>${escapeHtml(title)}</h2><span class="loading-bar"></span>`;
}

function renderError(title: string, description: string): string {
  return `<p class="eyebrow">오류</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>`;
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