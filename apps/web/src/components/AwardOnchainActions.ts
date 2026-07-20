import { apiPost } from "../api/client";
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
  post: apiPost
};

export function renderAwardOnchainActions(award: OnchainAward): string {
  const actions = getAvailableOnchainActions(award);

  return `
    <section class="detail-section onchain-actions" data-onchain-actions
      data-award-id="${escapeHtml(award.id)}"
      data-contract-award-id="${escapeHtml(award.contractAwardId ?? "")}"
      data-reward-token-address="${escapeHtml(award.rewardTokenAddress)}"
      data-total-reward="${escapeHtml(award.totalReward)}">
      <h2>On-chain Actions</h2>
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
        status.textContent = "Wallet session and registry address required";
        panel.classList.add("onchain-actions--error");
        return;
      }

      panel.classList.remove("onchain-actions--error");
      status.textContent = "Waiting for wallet confirmation";
      button.disabled = true;

      try {
        const result = await executeAwardOnchainAction({
          action,
          award,
          from,
          registryAddress: chainConfig.registryAddress,
          provider
        });
        status.textContent = `Submitted ${shortenAddress(result.txHash)}`;
      } catch {
        status.textContent = "Transaction failed";
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
    return "Contract award ID required before sending transactions.";
  }

  if (actions.length === 0) {
    return "No organizer transaction available for this award status.";
  }

  return "Connect an organizer wallet, then send the next contract transaction.";
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
      ? "Approve token"
      : action === "fund"
        ? "Fund award"
        : action === "finalize"
          ? "Finalize award"
          : "Claim reward";

  return `<button class="button" type="button" data-onchain-action="${action}">${label}</button>`;
}

function readAwardFromPanel(panel: HTMLElement): OnchainAward {
  return {
    id: panel.dataset.awardId ?? "",
    contractAwardId: panel.dataset.contractAwardId || null,
    rewardTokenAddress: panel.dataset.rewardTokenAddress ?? "",
    totalReward: panel.dataset.totalReward ?? "0",
    status: ""
  };
}

function getTransactionRecordType(action: AwardOnchainAction): string | null {
  if (action === "fund") return "AwardFunded";
  if (action === "finalize") return "AwardFinalized";
  if (action === "claim") return "AwardClaimed";
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
