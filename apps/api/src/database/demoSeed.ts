import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type DemoSeedResult = {
  eventId: string;
  projectId: string;
  awardId: string;
  claimedMemberId: string;
  invitedMemberId: string;
  claimInviteToken: string;
  organizerWallet: string;
  claimedWallet: string;
};

const demo = {
  eventId: "event-1",
  projectId: "project-1",
  awardId: "award-1",
  claimedMemberId: "member-1",
  invitedMemberId: "member-2",
  claimInviteId: "invite-1",
  claimInviteToken: "demo-claim-token",
  organizerWallet: "0xfcad0b19bb29d4674531d6f115237e16afad377c",
  claimedWallet: "0x3333333333333333333333333333333333333333",
  invitedWallet: null,
  now: "2026-08-01T18:00:00.000Z",
} as const;

export function seedDemoData(database: DatabaseSync): DemoSeedResult {
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("BEGIN");

  try {
    upsertEvent(database);
    upsertProject(database);
    upsertAward(database);
    upsertMembers(database);
    upsertClaimInvite(database);
    upsertTransactions(database);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return {
    eventId: demo.eventId,
    projectId: demo.projectId,
    awardId: demo.awardId,
    claimedMemberId: demo.claimedMemberId,
    invitedMemberId: demo.invitedMemberId,
    claimInviteToken: demo.claimInviteToken,
    organizerWallet: demo.organizerWallet,
    claimedWallet: demo.claimedWallet,
  };
}

function upsertEvent(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO events (
        id,
        organizer_wallet,
        name,
        description,
        start_date,
        end_date,
        location,
        image_url,
        official_url,
        social_url,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        organizer_wallet = excluded.organizer_wallet,
        name = excluded.name,
        description = excluded.description,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        location = excluded.location,
        image_url = excluded.image_url,
        official_url = excluded.official_url,
        social_url = excluded.social_url,
        status = excluded.status,
        updated_at = excluded.updated_at`,
    )
    .run(
      demo.eventId,
      demo.organizerWallet,
      "De-Buthon 2026",
      "A Web3 builder competition for DeFi, identity, and public goods projects.",
      "2026-08-01T09:00:00.000Z",
      "2026-08-01T18:00:00.000Z",
      "Seoul, Korea",
      null,
      "https://awardblock.example/events/de-buthon-2026",
      "https://x.com/awardblock",
      "Published",
      demo.now,
      demo.now,
    );
}

function upsertProject(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO projects (
        id,
        event_id,
        name,
        tagline,
        description,
        problem,
        solution,
        image_url,
        github_url,
        demo_url,
        presentation_url,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        event_id = excluded.event_id,
        name = excluded.name,
        tagline = excluded.tagline,
        description = excluded.description,
        problem = excluded.problem,
        solution = excluded.solution,
        image_url = excluded.image_url,
        github_url = excluded.github_url,
        demo_url = excluded.demo_url,
        presentation_url = excluded.presentation_url,
        updated_at = excluded.updated_at`,
    )
    .run(
      demo.projectId,
      demo.eventId,
      "Uniport",
      "Unified passport for university builders",
      "Uniport helps students prove profiles, projects, and builder activity across campuses.",
      "University builders need portable proof of participation and project history.",
      "Uniport links wallet identity, project credentials, and award records into one verified profile.",
      null,
      "https://github.com/example/uniport",
      "https://uniport.example",
      null,
      demo.now,
      demo.now,
    );
}

function upsertAward(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO awards (
        id,
        event_id,
        project_id,
        organizer_wallet,
        title,
        rank,
        reason,
        judging_summary,
        reward_token_address,
        reward_token_symbol,
        reward_token_decimals,
        total_reward,
        claim_start,
        claim_end,
        metadata_uri,
        metadata_hash,
        contract_award_id,
        status,
        create_tx_hash,
        fund_tx_hash,
        finalize_tx_hash,
        superseded_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        event_id = excluded.event_id,
        project_id = excluded.project_id,
        organizer_wallet = excluded.organizer_wallet,
        title = excluded.title,
        rank = excluded.rank,
        reason = excluded.reason,
        judging_summary = excluded.judging_summary,
        reward_token_address = excluded.reward_token_address,
        reward_token_symbol = excluded.reward_token_symbol,
        reward_token_decimals = excluded.reward_token_decimals,
        total_reward = excluded.total_reward,
        claim_start = excluded.claim_start,
        claim_end = excluded.claim_end,
        metadata_uri = excluded.metadata_uri,
        metadata_hash = excluded.metadata_hash,
        contract_award_id = excluded.contract_award_id,
        status = excluded.status,
        create_tx_hash = excluded.create_tx_hash,
        fund_tx_hash = excluded.fund_tx_hash,
        finalize_tx_hash = excluded.finalize_tx_hash,
        superseded_by = excluded.superseded_by,
        updated_at = excluded.updated_at`,
    )
    .run(
      demo.awardId,
      demo.eventId,
      demo.projectId,
      demo.organizerWallet,
      "Grand Prize",
      null,
      "Uniport delivered the strongest end-to-end builder identity and credential flow.",
      "Clear problem framing, practical Web3 UX, and a demo-ready product loop.",
      "0x2222222222222222222222222222222222222222",
      "mUSDC",
      6,
      "1000000",
      "2026-08-02T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
      "ipfs://awardblock/de-buthon-2026/uniport-grand-prize",
      "0xabc123",
      "contract-award-1",
      "Claiming",
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      null,
      demo.now,
      demo.now,
    );
}

function upsertMembers(database: DatabaseSync): void {
  upsertMember(database, {
    id: demo.claimedMemberId,
    displayName: "Uniport Team",
    email: "team@uniport.example",
    walletAddress: demo.claimedWallet,
    allocation: "500000",
    inviteStatus: "Claimed",
    walletConnectedAt: "2026-08-03T00:00:00.000Z",
    claimedAt: "2026-08-04T00:00:00.000Z",
    claimTxHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });
  upsertMember(database, {
    id: demo.invitedMemberId,
    displayName: "Grace Park",
    email: "grace@example.com",
    walletAddress: demo.invitedWallet,
    allocation: "500000",
    inviteStatus: "Invited",
    walletConnectedAt: null,
    claimedAt: null,
    claimTxHash: null,
  });
}

function upsertMember(
  database: DatabaseSync,
  member: {
    id: string;
    displayName: string;
    email: string;
    walletAddress: string | null;
    allocation: string;
    inviteStatus: string;
    walletConnectedAt: string | null;
    claimedAt: string | null;
    claimTxHash: string | null;
  },
): void {
  database
    .prepare(
      `INSERT INTO award_members (
        id,
        award_id,
        display_name,
        email,
        wallet_address,
        allocation,
        invite_status,
        wallet_connected_at,
        claimed_at,
        claim_tx_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        award_id = excluded.award_id,
        display_name = excluded.display_name,
        email = excluded.email,
        wallet_address = excluded.wallet_address,
        allocation = excluded.allocation,
        invite_status = excluded.invite_status,
        wallet_connected_at = excluded.wallet_connected_at,
        claimed_at = excluded.claimed_at,
        claim_tx_hash = excluded.claim_tx_hash,
        updated_at = excluded.updated_at`,
    )
    .run(
      member.id,
      demo.awardId,
      member.displayName,
      member.email,
      member.walletAddress,
      member.allocation,
      member.inviteStatus,
      member.walletConnectedAt,
      member.claimedAt,
      member.claimTxHash,
      demo.now,
      demo.now,
    );
}

function upsertClaimInvite(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO claim_invites (
        id,
        award_member_id,
        token_hash,
        expires_at,
        used_at,
        created_at
      ) VALUES (?, ?, ?, ?, NULL, ?)
      ON CONFLICT(id) DO UPDATE SET
        award_member_id = excluded.award_member_id,
        token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        used_at = excluded.used_at,
        created_at = excluded.created_at`,
    )
    .run(
      demo.claimInviteId,
      demo.invitedMemberId,
      hashInviteToken(demo.claimInviteToken),
      "2027-08-15T00:00:00.000Z",
      demo.now,
    );
}

function upsertTransactions(database: DatabaseSync): void {
  upsertTransaction(database, {
    id: "transaction-1",
    transactionType: "AwardCreated",
    walletAddress: demo.organizerWallet,
    txHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    blockNumber: 123450,
    createdAt: "2026-08-02T00:00:00.000Z",
  });
  upsertTransaction(database, {
    id: "transaction-2",
    transactionType: "AwardFunded",
    walletAddress: demo.organizerWallet,
    txHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    blockNumber: 123456,
    createdAt: "2026-08-02T01:00:00.000Z",
  });
  upsertTransaction(database, {
    id: "transaction-3",
    transactionType: "AwardFinalized",
    walletAddress: demo.organizerWallet,
    txHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    blockNumber: 123470,
    createdAt: "2026-08-03T00:00:00.000Z",
  });
  upsertTransaction(database, {
    id: "transaction-4",
    transactionType: "AwardClaimed",
    walletAddress: demo.claimedWallet,
    txHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    blockNumber: 123500,
    createdAt: "2026-08-04T00:00:00.000Z",
  });
}

function upsertTransaction(
  database: DatabaseSync,
  transaction: {
    id: string;
    transactionType: string;
    walletAddress: string;
    txHash: string;
    blockNumber: number;
    createdAt: string;
  },
): void {
  database
    .prepare(
      `INSERT INTO transaction_records (
        id,
        award_id,
        transaction_type,
        wallet_address,
        tx_hash,
        block_number,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        award_id = excluded.award_id,
        transaction_type = excluded.transaction_type,
        wallet_address = excluded.wallet_address,
        tx_hash = excluded.tx_hash,
        block_number = excluded.block_number,
        created_at = excluded.created_at`,
    )
    .run(
      transaction.id,
      demo.awardId,
      transaction.transactionType,
      transaction.walletAddress,
      transaction.txHash,
      transaction.blockNumber,
      transaction.createdAt,
    );
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
