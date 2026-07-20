import { apiPatch, apiPost } from "../api/client";
import {
  buildApproveRewardTokenRequest,
  buildClaimAwardRequest,
  buildFinalizeAwardRequest,
  buildFundAwardRequest,
  sendContractWrite,
  type ContractWriteProvider
} from "../blockchain/awardRegistry";
import { chainConfig } from "../blockchain/config";
import { getBrowserEthereumProvider } from "../auth/walletAuth";
import { walletState } from "../state/appState";
import { shortenAddress } from "../utils/format";

export type OnchainAward = {
  id: string;
  contractAwardId: string | null;
  rewardTokenAddress: string;
  totalReward: string;
  status: string;
};

export type AwardOnchainAction = "approve" | "fund" | "finalize" | "claim";

export type AwardOnchainActionApi = {
  post<TResponse, TBody = unknown>(path: string, body?: TBody): Promise<TResponse>;
  patch<TResponse, TBody = unknown>(path: string, body?: TBody): Promise<TResponse>;
};

type ExecuteAwardOnchainActionInput = {
  action: AwardOnchainAction;
  award: OnchainAward;
  from: string;
  registryAddress: string;
  provider: ContractWriteProvider;
  api?: AwardOnchainActionApi;
};

type TransactionRecordResponse = {
  transaction: {
    id: string;
  };
};

const defaultApi: AwardOnchainActionApi = {
  post: apiPost,
  patch: apiPatch
};

export function renderAwardOnchainActions(award: OnchainAward): string {
  const actions = getAvailableOnchainActions(award);

  return `
    <section class="detail-section onchain-actions" data-onchain-actions
      data-award-id="${escapeHtml(award.id)}"
      data-contract-award-id="${escapeHtml(award.contractAwardId ?? "")}"
      data-reward-token-address="${escapeHtml(award.rewardTokenAddress)}"
      data-total-reward="${escapeHtml(award.totalReward)}"
      data-award-status="${escapeHtml(award.status)}">
      <h2>온체인 작업</h2>
      <p data-onchain-status>${escapeHtml(getOnchainStatusLabel(award, actions))}</p>
      ${renderActionButtons(actions)}
    </section>
  `;
}

export function mountAwardOnchainActions(root: ParentNode): void {
  const panel = root.querySelector<HTMLElement>("[data-onchain-actions]");
  const status = panel?.querySelector<HTMLElement>("[data-onchain-status]");

  if (!panel || !status) return;

  const award = readAwardFromPanel(panel);

  panel.querySelectorAll<HTMLButtonElement>("[data-onchain-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.onchainAction as AwardOnchainAction | undefined;
      const provider = getBrowserEthereumProvider();
      const from = walletState.address;

      if (!action || !provider || !from || chainConfig.registryAddress === "") {
        status.textContent = "지갑 세션과 registry 컨트랙트 주소가 필요합니다";
        panel.classList.add("onchain-actions--error");
        return;
      }

      panel.classList.remove("onchain-actions--error");
      status.textContent = "지갑 확인 대기 중";
      button.disabled = true;

      try {
        const result = await executeAwardOnchainAction({
          action,
          award,
          from,
          registryAddress: chainConfig.registryAddress,
          provider
        });
        status.textContent = `제출됨 ${shortenAddress(result.txHash)}`;
        panel.outerHTML = renderAwardOnchainActions({
          ...award,
          status: getNextAwardStatus(action, award.status)
        });
        mountAwardOnchainActions(root);
      } catch {
        status.textContent = "트랜잭션 실패";
        panel.classList.add("onchain-actions--error");
      } finally {
        button.disabled = false;
      }
    });
  });
}

export async function executeAwardOnchainAction({
  action,
  award,
  from,
  registryAddress,
  provider,
  api = defaultApi
}: ExecuteAwardOnchainActionInput): Promise<{ txHash: string }> {
  if (!award.contractAwardId) {
    throw new Error("CONTRACT_AWARD_ID_REQUIRED");
  }

  const request =
    action === "approve"
      ? buildApproveRewardTokenRequest({
          from,
          tokenAddress: award.rewardTokenAddress,
          spenderAddress: registryAddress,
          amount: award.totalReward
        })
      : action === "fund"
        ? buildFundAwardRequest({
            from,
            registryAddress,
            awardId: award.contractAwardId,
            amount: award.totalReward
          })
        : action === "finalize"
          ? buildFinalizeAwardRequest({
              from,
              registryAddress,
              awardId: award.contractAwardId
            })
          : buildClaimAwardRequest({
              from,
              registryAddress,
              awardId: award.contractAwardId
            });

  const txHash = await sendContractWrite(provider, request);
  const transactionType = getTransactionRecordType(action);

  if (transactionType) {
    await api.post<
      TransactionRecordResponse,
      {
        transactionType: string;
        walletAddress: string;
        txHash: string;
      }
    >(`/awards/${encodeURIComponent(award.id)}/transactions`, {
      transactionType,
      walletAddress: from,
      txHash
    });
  }

  const awardPatch = getAwardPatch(action, txHash);

  if (awardPatch) {
    await api.patch(`/awards/${encodeURIComponent(award.id)}`, awardPatch);
  }

  return { txHash };
}

function getAvailableOnchainActions(award: OnchainAward): AwardOnchainAction[] {
  if (!award.contractAwardId) {
    return [];
  }

  if (award.status === "ReadyToFund") {
    return ["approve", "fund"];
  }

  if (award.status === "Funded") {
    return ["finalize"];
  }

  return [];
}

function getOnchainStatusLabel(award: OnchainAward, actions: AwardOnchainAction[]): string {
  if (!award.contractAwardId) {
    return "트랜잭션 전송 전에 Contract Award ID가 필요합니다.";
  }

  if (actions.length === 0) {
    return "현재 상태에서 필요한 주최자 온체인 작업이 없습니다.";
  }

  if (award.status === "ReadyToFund") {
    return "토큰 승인 후 어워드 펀딩을 진행하세요.";
  }

  return "펀딩이 완료됐습니다. 어워드를 확정해 클레임 단계로 넘기세요.";
}

function renderActionButtons(actions: AwardOnchainAction[]): string {
  if (actions.length === 0) {
    return "";
  }

  return `
    <div class="onchain-actions__buttons">
      ${actions.map(renderActionButton).join("")}
    </div>
  `;
}

function renderActionButton(action: AwardOnchainAction): string {
  const label =
    action === "approve"
      ? "토큰 승인"
      : action === "fund"
        ? "어워드 펀딩"
        : action === "finalize"
          ? "어워드 확정"
          : "리워드 클레임";

  return `<button class="button" type="button" data-onchain-action="${action}">${label}</button>`;
}

function readAwardFromPanel(panel: HTMLElement): OnchainAward {
  return {
    id: panel.dataset.awardId ?? "",
    contractAwardId: panel.dataset.contractAwardId || null,
    rewardTokenAddress: panel.dataset.rewardTokenAddress ?? "",
    totalReward: panel.dataset.totalReward ?? "0",
    status: panel.dataset.awardStatus ?? ""
  };
}

function getTransactionRecordType(action: AwardOnchainAction): string | null {
  if (action === "fund") return "AwardFunded";
  if (action === "finalize") return "AwardFinalized";
  if (action === "claim") return "AwardClaimed";
  return null;
}

function getAwardPatch(action: AwardOnchainAction, txHash: string): Record<string, string> | null {
  if (action === "fund") {
    return {
      fundTxHash: txHash,
      status: "Funded"
    };
  }

  if (action === "finalize") {
    return {
      finalizeTxHash: txHash,
      status: "Claiming"
    };
  }

  return null;
}

function getNextAwardStatus(action: AwardOnchainAction, fallbackStatus: string): string {
  if (action === "fund") return "Funded";
  if (action === "finalize") return "Claiming";
  return fallbackStatus;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
