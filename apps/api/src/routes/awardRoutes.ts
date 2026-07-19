import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Request, Response } from "express";
import { isAddress } from "viem";
import { z } from "zod";
import { createRequireSession, getAuthenticatedSession } from "../middleware/authMiddleware.js";
import { nowIso } from "../utils/time.js";

const awardStatuses = [
  "Draft",
  "AwaitingRecipients",
  "ReadyToFund",
  "Funded",
  "Finalized",
  "Claiming",
  "Completed",
  "Superseded",
  "Closed"
] as const;
const awardStatusSchema = z.enum(awardStatuses);
type AwardStatus = (typeof awardStatuses)[number];

const nullableTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional()
);

const dateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

const tokenAddressSchema = z
  .string()
  .trim()
  .refine((value) => isAddress(value), "Invalid token address")
  .transform((value) => value.toLowerCase());

const positiveIntegerStringSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "Must be a positive integer string");

const awardFieldsSchema = z
  .object({
    title: z.string().trim().min(1),
    rank: nullableTextSchema,
    reason: nullableTextSchema,
    judgingSummary: nullableTextSchema,
    rewardTokenAddress: tokenAddressSchema,
    rewardTokenSymbol: z.string().trim().min(1),
    rewardTokenDecimals: z.number().int().min(0).max(255),
    totalReward: positiveIntegerStringSchema,
    claimStart: dateStringSchema,
    claimEnd: dateStringSchema,
    metadataUri: nullableTextSchema,
    metadataHash: nullableTextSchema,
    contractAwardId: nullableTextSchema,
    status: awardStatusSchema.default("Draft"),
    createTxHash: nullableTextSchema,
    fundTxHash: nullableTextSchema,
    finalizeTxHash: nullableTextSchema,
    supersededBy: nullableTextSchema
  })
  .strict();

const createAwardSchema = awardFieldsSchema.superRefine((award, context) => {
  if (!hasValidDateRange(award.claimStart, award.claimEnd)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["claimEnd"],
      message: "claimEnd must be after claimStart"
    });
  }
});

const updateAwardSchema = awardFieldsSchema.partial().strict();

type CreateAwardInput = z.infer<typeof createAwardSchema> & {
  eventId: string;
  projectId: string;
  organizerWallet: string;
};
type UpdateAwardInput = z.infer<typeof updateAwardSchema>;

type ProjectOwnerRow = {
  id: string;
  event_id: string;
  organizer_wallet: string;
};

type AwardRow = {
  id: string;
  event_id: string;
  project_id: string;
  organizer_wallet: string;
  title: string;
  rank: string | null;
  reason: string | null;
  judging_summary: string | null;
  reward_token_address: string;
  reward_token_symbol: string;
  reward_token_decimals: number;
  total_reward: string;
  claim_start: string;
  claim_end: string;
  metadata_uri: string | null;
  metadata_hash: string | null;
  contract_award_id: string | null;
  status: AwardStatus;
  create_tx_hash: string | null;
  fund_tx_hash: string | null;
  finalize_tx_hash: string | null;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
};

const awardColumns = `
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
`;

export function createAwardRouter(database: DatabaseSync) {
  const router = Router();
  const requireSession = createRequireSession(database);

  router.get("/projects/:projectId/awards", (request, response) => {
    const projectOwner = findProjectOwner(database, request.params.projectId);

    if (!projectOwner) {
      sendProjectNotFound(response);
      return;
    }

    const awards = database
      .prepare(`SELECT ${awardColumns} FROM awards WHERE project_id = ? ORDER BY created_at DESC`)
      .all(request.params.projectId) as AwardRow[];

    response.json({ awards: awards.map(toAwardResponse) });
  });

  router.post("/projects/:projectId/awards", requireSession, (request, response) => {
    const projectOwner = findProjectOwner(database, request.params.projectId);

    if (!projectOwner) {
      sendProjectNotFound(response);
      return;
    }

    const session = getAuthenticatedSession(request);

    if (projectOwner.organizer_wallet !== session.walletAddress) {
      sendAwardForbidden(response);
      return;
    }

    const parsedAward = createAwardSchema.safeParse(request.body);

    if (!parsedAward.success) {
      sendError(response, 400, "INVALID_AWARD_INPUT", "Award input is invalid", {
        issues: parsedAward.error.flatten()
      });
      return;
    }

    const award = insertAward(database, {
      ...parsedAward.data,
      eventId: projectOwner.event_id,
      projectId: projectOwner.id,
      organizerWallet: session.walletAddress
    });

    response.status(201).json({ award: toAwardResponse(award) });
  });

  router.get("/awards/:id", (request, response) => {
    const award = findAward(database, request.params.id);

    if (!award) {
      sendAwardNotFound(response);
      return;
    }

    response.json({ award: toAwardResponse(award) });
  });

  router.patch("/awards/:id", requireSession, (request, response) => {
    const award = findAward(database, request.params.id);

    if (!award) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, award)) {
      sendAwardForbidden(response);
      return;
    }

    const parsedPatch = updateAwardSchema.safeParse(request.body);

    if (!parsedPatch.success) {
      sendError(response, 400, "INVALID_AWARD_INPUT", "Award input is invalid", {
        issues: parsedPatch.error.flatten()
      });
      return;
    }

    const updated = updateAward(database, award, parsedPatch.data);

    if (!updated) {
      sendError(response, 400, "INVALID_AWARD_INPUT", "Award input is invalid", {
        issues: { fieldErrors: { claimEnd: ["claimEnd must be after claimStart"] } }
      });
      return;
    }

    response.json({ award: toAwardResponse(updated) });
  });

  router.delete("/awards/:id", requireSession, (request, response) => {
    const award = findAward(database, request.params.id);

    if (!award) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, award)) {
      sendAwardForbidden(response);
      return;
    }

    database.prepare("DELETE FROM awards WHERE id = ?").run(award.id);
    response.status(204).send();
  });

  return router;
}

function insertAward(database: DatabaseSync, award: CreateAwardInput): AwardRow {
  const id = randomUUID();
  const now = nowIso();

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      award.eventId,
      award.projectId,
      award.organizerWallet,
      award.title,
      award.rank ?? null,
      award.reason ?? null,
      award.judgingSummary ?? null,
      award.rewardTokenAddress,
      award.rewardTokenSymbol,
      award.rewardTokenDecimals,
      award.totalReward,
      award.claimStart,
      award.claimEnd,
      award.metadataUri ?? null,
      award.metadataHash ?? null,
      award.contractAwardId ?? null,
      award.status,
      award.createTxHash ?? null,
      award.fundTxHash ?? null,
      award.finalizeTxHash ?? null,
      award.supersededBy ?? null,
      now,
      now
    );

  const created = findAward(database, id);

  if (!created) {
    throw new Error("Failed to load created award");
  }

  return created;
}

function updateAward(
  database: DatabaseSync,
  existing: AwardRow,
  patch: UpdateAwardInput
): AwardRow | null {
  const title = patch.title ?? existing.title;
  const rank = hasPatchProperty(patch, "rank") ? patch.rank ?? null : existing.rank;
  const reason = hasPatchProperty(patch, "reason") ? patch.reason ?? null : existing.reason;
  const judgingSummary = hasPatchProperty(patch, "judgingSummary")
    ? patch.judgingSummary ?? null
    : existing.judging_summary;
  const rewardTokenAddress = patch.rewardTokenAddress ?? existing.reward_token_address;
  const rewardTokenSymbol = patch.rewardTokenSymbol ?? existing.reward_token_symbol;
  const rewardTokenDecimals = patch.rewardTokenDecimals ?? existing.reward_token_decimals;
  const totalReward = patch.totalReward ?? existing.total_reward;
  const claimStart = patch.claimStart ?? existing.claim_start;
  const claimEnd = patch.claimEnd ?? existing.claim_end;
  const metadataUri = hasPatchProperty(patch, "metadataUri")
    ? patch.metadataUri ?? null
    : existing.metadata_uri;
  const metadataHash = hasPatchProperty(patch, "metadataHash")
    ? patch.metadataHash ?? null
    : existing.metadata_hash;
  const contractAwardId = hasPatchProperty(patch, "contractAwardId")
    ? patch.contractAwardId ?? null
    : existing.contract_award_id;
  const status = patch.status ?? existing.status;
  const createTxHash = hasPatchProperty(patch, "createTxHash")
    ? patch.createTxHash ?? null
    : existing.create_tx_hash;
  const fundTxHash = hasPatchProperty(patch, "fundTxHash")
    ? patch.fundTxHash ?? null
    : existing.fund_tx_hash;
  const finalizeTxHash = hasPatchProperty(patch, "finalizeTxHash")
    ? patch.finalizeTxHash ?? null
    : existing.finalize_tx_hash;
  const supersededBy = hasPatchProperty(patch, "supersededBy")
    ? patch.supersededBy ?? null
    : existing.superseded_by;

  if (!hasValidDateRange(claimStart, claimEnd)) {
    return null;
  }

  database
    .prepare(
      `UPDATE awards
       SET title = ?,
           rank = ?,
           reason = ?,
           judging_summary = ?,
           reward_token_address = ?,
           reward_token_symbol = ?,
           reward_token_decimals = ?,
           total_reward = ?,
           claim_start = ?,
           claim_end = ?,
           metadata_uri = ?,
           metadata_hash = ?,
           contract_award_id = ?,
           status = ?,
           create_tx_hash = ?,
           fund_tx_hash = ?,
           finalize_tx_hash = ?,
           superseded_by = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      title,
      rank,
      reason,
      judgingSummary,
      rewardTokenAddress,
      rewardTokenSymbol,
      rewardTokenDecimals,
      totalReward,
      claimStart,
      claimEnd,
      metadataUri,
      metadataHash,
      contractAwardId,
      status,
      createTxHash,
      fundTxHash,
      finalizeTxHash,
      supersededBy,
      nowIso(),
      existing.id
    );

  const updated = findAward(database, existing.id);

  if (!updated) {
    throw new Error("Failed to load updated award");
  }

  return updated;
}

function canMutateAward(request: Request, award: AwardRow): boolean {
  return award.organizer_wallet === getAuthenticatedSession(request).walletAddress;
}

function findProjectOwner(database: DatabaseSync, projectId: string): ProjectOwnerRow | undefined {
  return database
    .prepare(
      `SELECT projects.id, projects.event_id, events.organizer_wallet
       FROM projects
       INNER JOIN events ON events.id = projects.event_id
       WHERE projects.id = ?`
    )
    .get(projectId) as ProjectOwnerRow | undefined;
}

function findAward(database: DatabaseSync, awardId: string): AwardRow | undefined {
  return database
    .prepare(`SELECT ${awardColumns} FROM awards WHERE id = ?`)
    .get(awardId) as AwardRow | undefined;
}

function hasPatchProperty(patch: UpdateAwardInput, key: keyof UpdateAwardInput): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function hasValidDateRange(startDate: string, endDate: string): boolean {
  return Date.parse(startDate) < Date.parse(endDate);
}

function toAwardResponse(row: AwardRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    projectId: row.project_id,
    organizerWallet: row.organizer_wallet,
    title: row.title,
    rank: row.rank,
    reason: row.reason,
    judgingSummary: row.judging_summary,
    rewardTokenAddress: row.reward_token_address,
    rewardTokenSymbol: row.reward_token_symbol,
    rewardTokenDecimals: row.reward_token_decimals,
    totalReward: row.total_reward,
    claimStart: row.claim_start,
    claimEnd: row.claim_end,
    metadataUri: row.metadata_uri,
    metadataHash: row.metadata_hash,
    contractAwardId: row.contract_award_id,
    status: row.status,
    createTxHash: row.create_tx_hash,
    fundTxHash: row.fund_tx_hash,
    finalizeTxHash: row.finalize_tx_hash,
    supersededBy: row.superseded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sendProjectNotFound(response: Response): void {
  sendError(response, 404, "PROJECT_NOT_FOUND", "Project was not found");
}

function sendAwardNotFound(response: Response): void {
  sendError(response, 404, "AWARD_NOT_FOUND", "Award was not found");
}

function sendAwardForbidden(response: Response): void {
  sendError(response, 403, "AWARD_FORBIDDEN", "Award can only be changed by its event organizer");
}

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  response.status(status).json({
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details })
    }
  });
}
