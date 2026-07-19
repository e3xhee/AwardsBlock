import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";

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
