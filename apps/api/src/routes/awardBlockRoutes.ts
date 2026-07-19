import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Response } from "express";

type AwardBlockRow = {
  award_id: string;
  organizer_wallet: string;
  award_title: string;
  award_rank: string | null;
  award_status: string;
  reward_token_symbol: string;
  reward_token_decimals: number;
  total_reward: string;
  metadata_hash: string | null;
  contract_award_id: string | null;
  award_created_at: string;
  event_id: string;
  event_name: string;
  event_start_date: string;
  event_end_date: string;
  project_id: string;
  project_name: string;
  project_tagline: string | null;
  recipient_count: number;
  claimed_count: number;
};

type AwardBlockDetailRow = {
  award_id: string;
  organizer_wallet: string;
  award_title: string;
  award_rank: string | null;
  award_reason: string | null;
  award_judging_summary: string | null;
  award_status: string;
  reward_token_symbol: string;
  reward_token_decimals: number;
  total_reward: string;
  claim_start: string;
  claim_end: string;
  metadata_uri: string | null;
  metadata_hash: string | null;
  contract_award_id: string | null;
  create_tx_hash: string | null;
  fund_tx_hash: string | null;
  finalize_tx_hash: string | null;
  award_created_at: string;
  award_updated_at: string;
  event_id: string;
  event_name: string;
  event_description: string;
  event_start_date: string;
  event_end_date: string;
  event_location: string | null;
  event_official_url: string | null;
  project_id: string;
  project_name: string;
  project_tagline: string;
  project_description: string;
  project_github_url: string | null;
  project_demo_url: string | null;
};

type AwardBlockMemberRow = {
  id: string;
  display_name: string;
  wallet_address: string | null;
  allocation: string;
  invite_status: string;
  wallet_connected_at: string | null;
  claimed_at: string | null;
  claim_tx_hash: string | null;
};

type AwardBlockTransactionRow = {
  id: string;
  transaction_type: string;
  wallet_address: string;
  tx_hash: string;
  block_number: number | null;
  created_at: string;
};

export function createAwardBlockRouter(database: DatabaseSync) {
  const router = Router();

  router.get("/award-blocks", (_request, response) => {
    const awardBlocks = database
      .prepare(
        `SELECT
           awards.id AS award_id,
           awards.organizer_wallet,
           awards.title AS award_title,
           awards.rank AS award_rank,
           awards.status AS award_status,
           awards.reward_token_symbol,
           awards.reward_token_decimals,
           awards.total_reward,
           awards.metadata_hash,
           awards.contract_award_id,
           awards.created_at AS award_created_at,
           events.id AS event_id,
           events.name AS event_name,
           events.start_date AS event_start_date,
           events.end_date AS event_end_date,
           projects.id AS project_id,
           projects.name AS project_name,
           projects.tagline AS project_tagline,
           COUNT(award_members.id) AS recipient_count,
           SUM(CASE WHEN award_members.invite_status = 'Claimed' THEN 1 ELSE 0 END) AS claimed_count
         FROM awards
         INNER JOIN events ON events.id = awards.event_id
         INNER JOIN projects ON projects.id = awards.project_id
         LEFT JOIN award_members ON award_members.award_id = awards.id
         GROUP BY awards.id
         ORDER BY awards.created_at DESC`
      )
      .all() as AwardBlockRow[];

    response.json({ awardBlocks: awardBlocks.map(toAwardBlockResponse) });
  });

  router.get("/award-blocks/:id", (request, response) => {
    const awardBlock = findAwardBlockDetail(database, request.params.id);

    if (!awardBlock) {
      sendAwardBlockNotFound(response);
      return;
    }

    const members = findAwardBlockMembers(database, awardBlock.award_id);
    const transactions = findAwardBlockTransactions(database, awardBlock.award_id);

    response.json({
      awardBlock: toAwardBlockDetailResponse(awardBlock, members, transactions)
    });
  });

  return router;
}

function toAwardBlockResponse(row: AwardBlockRow) {
  return {
    id: row.award_id,
    organizerWallet: row.organizer_wallet,
    event: {
      id: row.event_id,
      name: row.event_name,
      startDate: row.event_start_date,
      endDate: row.event_end_date
    },
    project: {
      id: row.project_id,
      name: row.project_name,
      tagline: row.project_tagline
    },
    award: {
      id: row.award_id,
      title: row.award_title,
      rank: row.award_rank,
      status: row.award_status,
      rewardTokenSymbol: row.reward_token_symbol,
      rewardTokenDecimals: row.reward_token_decimals,
      totalReward: row.total_reward,
      metadataHash: row.metadata_hash,
      contractAwardId: row.contract_award_id
    },
    claimStats: {
      recipientCount: row.recipient_count,
      claimedCount: row.claimed_count
    },
    createdAt: row.award_created_at
  };
}

function findAwardBlockDetail(
  database: DatabaseSync,
  awardId: string
): AwardBlockDetailRow | undefined {
  return database
    .prepare(
      `SELECT
         awards.id AS award_id,
         awards.organizer_wallet,
         awards.title AS award_title,
         awards.rank AS award_rank,
         awards.reason AS award_reason,
         awards.judging_summary AS award_judging_summary,
         awards.status AS award_status,
         awards.reward_token_symbol,
         awards.reward_token_decimals,
         awards.total_reward,
         awards.claim_start,
         awards.claim_end,
         awards.metadata_uri,
         awards.metadata_hash,
         awards.contract_award_id,
         awards.create_tx_hash,
         awards.fund_tx_hash,
         awards.finalize_tx_hash,
         awards.created_at AS award_created_at,
         awards.updated_at AS award_updated_at,
         events.id AS event_id,
         events.name AS event_name,
         events.description AS event_description,
         events.start_date AS event_start_date,
         events.end_date AS event_end_date,
         events.location AS event_location,
         events.official_url AS event_official_url,
         projects.id AS project_id,
         projects.name AS project_name,
         projects.tagline AS project_tagline,
         projects.description AS project_description,
         projects.github_url AS project_github_url,
         projects.demo_url AS project_demo_url
       FROM awards
       INNER JOIN events ON events.id = awards.event_id
       INNER JOIN projects ON projects.id = awards.project_id
       WHERE awards.id = ?`
    )
    .get(awardId) as AwardBlockDetailRow | undefined;
}

function findAwardBlockMembers(
  database: DatabaseSync,
  awardId: string
): AwardBlockMemberRow[] {
  return database
    .prepare(
      `SELECT
         id,
         display_name,
         wallet_address,
         allocation,
         invite_status,
         wallet_connected_at,
         claimed_at,
         claim_tx_hash
       FROM award_members
       WHERE award_id = ?
       ORDER BY created_at DESC`
    )
    .all(awardId) as AwardBlockMemberRow[];
}

function findAwardBlockTransactions(
  database: DatabaseSync,
  awardId: string
): AwardBlockTransactionRow[] {
  return database
    .prepare(
      `SELECT
         id,
         transaction_type,
         wallet_address,
         tx_hash,
         block_number,
         created_at
       FROM transaction_records
       WHERE award_id = ?
       ORDER BY created_at DESC`
    )
    .all(awardId) as AwardBlockTransactionRow[];
}

function toAwardBlockDetailResponse(
  row: AwardBlockDetailRow,
  members: AwardBlockMemberRow[],
  transactions: AwardBlockTransactionRow[]
) {
  return {
    id: row.award_id,
    organizerWallet: row.organizer_wallet,
    event: {
      id: row.event_id,
      name: row.event_name,
      description: row.event_description,
      startDate: row.event_start_date,
      endDate: row.event_end_date,
      location: row.event_location,
      officialUrl: row.event_official_url
    },
    project: {
      id: row.project_id,
      name: row.project_name,
      tagline: row.project_tagline,
      description: row.project_description,
      githubUrl: row.project_github_url,
      demoUrl: row.project_demo_url
    },
    award: {
      id: row.award_id,
      title: row.award_title,
      rank: row.award_rank,
      reason: row.award_reason,
      judgingSummary: row.award_judging_summary,
      status: row.award_status,
      rewardTokenSymbol: row.reward_token_symbol,
      rewardTokenDecimals: row.reward_token_decimals,
      totalReward: row.total_reward,
      claimStart: row.claim_start,
      claimEnd: row.claim_end,
      metadataUri: row.metadata_uri,
      metadataHash: row.metadata_hash,
      contractAwardId: row.contract_award_id,
      createTxHash: row.create_tx_hash,
      fundTxHash: row.fund_tx_hash,
      finalizeTxHash: row.finalize_tx_hash
    },
    members: members.map(toAwardBlockMemberResponse),
    transactions: transactions.map(toAwardBlockTransactionResponse),
    claimStats: {
      recipientCount: members.length,
      claimedCount: members.filter((member) => member.invite_status === "Claimed").length
    },
    createdAt: row.award_created_at,
    updatedAt: row.award_updated_at
  };
}

function toAwardBlockMemberResponse(row: AwardBlockMemberRow) {
  return {
    id: row.id,
    displayName: row.display_name,
    walletAddress: row.wallet_address,
    allocation: row.allocation,
    inviteStatus: row.invite_status,
    walletConnectedAt: row.wallet_connected_at,
    claimedAt: row.claimed_at,
    claimTxHash: row.claim_tx_hash
  };
}

function toAwardBlockTransactionResponse(row: AwardBlockTransactionRow) {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    walletAddress: row.wallet_address,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    createdAt: row.created_at
  };
}

function sendAwardBlockNotFound(response: Response): void {
  response.status(404).json({
    error: {
      code: "AWARD_BLOCK_NOT_FOUND",
      message: "Award block was not found"
    }
  });
}
