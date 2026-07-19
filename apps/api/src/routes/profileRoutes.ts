import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Response } from "express";
import { isAddress } from "viem";

type WalletAwardHistoryRow = {
  member_id: string;
  member_display_name: string;
  member_allocation: string;
  member_invite_status: string;
  member_wallet_connected_at: string | null;
  member_claimed_at: string | null;
  member_claim_tx_hash: string | null;
  award_id: string;
  award_title: string;
  award_rank: string | null;
  award_reward_token_symbol: string;
  award_reward_token_decimals: number;
  award_total_reward: string;
  project_id: string;
  project_name: string;
  event_id: string;
  event_name: string;
};

type ClaimTransactionRow = {
  id: string;
  transaction_type: string;
  tx_hash: string;
  block_number: number | null;
  created_at: string;
};

export function createProfileRouter(database: DatabaseSync) {
  const router = Router();

  router.get("/profiles/:walletAddress", (request, response) => {
    const walletAddress = normalizeWalletAddress(request.params.walletAddress);

    if (!walletAddress) {
      sendError(response, 400, "INVALID_WALLET_ADDRESS", "Wallet address is invalid");
      return;
    }

    const awards = findWalletAwardHistory(database, walletAddress);
    const projectIds = new Set(awards.map((award) => award.project_id));

    response.json({
      profile: {
        walletAddress,
        stats: {
          awardCount: awards.length,
          claimedAwardCount: awards.filter((award) => award.member_invite_status === "Claimed")
            .length,
          projectCount: projectIds.size
        },
        awards: awards.map((award) => ({
          member: {
            id: award.member_id,
            displayName: award.member_display_name,
            allocation: award.member_allocation,
            inviteStatus: award.member_invite_status,
            walletConnectedAt: award.member_wallet_connected_at,
            claimedAt: award.member_claimed_at,
            claimTxHash: award.member_claim_tx_hash
          },
          award: {
            id: award.award_id,
            title: award.award_title,
            rank: award.award_rank,
            rewardTokenSymbol: award.award_reward_token_symbol,
            rewardTokenDecimals: award.award_reward_token_decimals,
            totalReward: award.award_total_reward
          },
          project: {
            id: award.project_id,
            name: award.project_name
          },
          event: {
            id: award.event_id,
            name: award.event_name
          },
          claimTransactions: findClaimTransactions(database, award.award_id, walletAddress).map(
            toClaimTransactionResponse
          )
        }))
      }
    });
  });

  return router;
}

function normalizeWalletAddress(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const walletAddress = value.trim();

  if (!isAddress(walletAddress)) {
    return null;
  }

  return walletAddress.toLowerCase();
}

function findWalletAwardHistory(
  database: DatabaseSync,
  walletAddress: string
): WalletAwardHistoryRow[] {
  return database
    .prepare(
      `SELECT
         award_members.id AS member_id,
         award_members.display_name AS member_display_name,
         award_members.allocation AS member_allocation,
         award_members.invite_status AS member_invite_status,
         award_members.wallet_connected_at AS member_wallet_connected_at,
         award_members.claimed_at AS member_claimed_at,
         award_members.claim_tx_hash AS member_claim_tx_hash,
         awards.id AS award_id,
         awards.title AS award_title,
         awards.rank AS award_rank,
         awards.reward_token_symbol AS award_reward_token_symbol,
         awards.reward_token_decimals AS award_reward_token_decimals,
         awards.total_reward AS award_total_reward,
         projects.id AS project_id,
         projects.name AS project_name,
         events.id AS event_id,
         events.name AS event_name
       FROM award_members
       INNER JOIN awards ON awards.id = award_members.award_id
       INNER JOIN projects ON projects.id = awards.project_id
       INNER JOIN events ON events.id = awards.event_id
       WHERE award_members.wallet_address = ?
       ORDER BY COALESCE(award_members.claimed_at, award_members.wallet_connected_at, award_members.created_at) DESC`
    )
    .all(walletAddress) as WalletAwardHistoryRow[];
}

function findClaimTransactions(
  database: DatabaseSync,
  awardId: string,
  walletAddress: string
): ClaimTransactionRow[] {
  return database
    .prepare(
      `SELECT
         id,
         transaction_type,
         tx_hash,
         block_number,
         created_at
       FROM transaction_records
       WHERE award_id = ?
         AND wallet_address = ?
         AND transaction_type = ?
       ORDER BY created_at DESC`
    )
    .all(awardId, walletAddress, "AwardClaimed") as ClaimTransactionRow[];
}

function toClaimTransactionResponse(row: ClaimTransactionRow) {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    createdAt: row.created_at
  };
}

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({
    error: {
      code,
      message
    }
  });
}
