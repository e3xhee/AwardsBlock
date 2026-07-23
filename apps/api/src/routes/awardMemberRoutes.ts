import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Request, Response } from "express";
import { isAddress } from "viem";
import { z } from "zod";
import { createRequireSession, getAuthenticatedSession } from "../middleware/authMiddleware.js";
import { nowIso } from "../utils/time.js";

const inviteStatuses = ["Pending", "Invited", "WalletConnected", "Claimed"] as const;
const inviteStatusSchema = z.enum(inviteStatuses);
type InviteStatus = (typeof inviteStatuses)[number];

const positiveIntegerStringSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "Must be a positive integer string");

const nullableTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional()
);

const nullableEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email().nullable().optional()
);

const nullableWalletAddressSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .refine((value) => isAddress(value), "Invalid wallet address")
    .transform((value) => value.toLowerCase())
    .nullable()
    .optional()
);

const nullableDateStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .nullable()
    .optional()
);

const createAwardMemberSchema = z
  .object({
    displayName: z.string().trim().min(1),
    email: nullableEmailSchema,
    walletAddress: nullableWalletAddressSchema,
    allocation: positiveIntegerStringSchema,
    inviteStatus: inviteStatusSchema.default("Pending"),
    walletConnectedAt: nullableDateStringSchema,
    claimedAt: nullableDateStringSchema,
    claimTxHash: nullableTextSchema
  })
  .strict();

const updateAwardMemberSchema = createAwardMemberSchema.partial().strict();
const claimAwardMemberSchema = z
  .object({
    claimTxHash: z
      .string()
      .trim()
      .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid claim transaction hash")
      .transform((value) => value.toLowerCase())
  })
  .strict();

type CreateAwardMemberInput = z.infer<typeof createAwardMemberSchema> & {
  awardId: string;
};
type UpdateAwardMemberInput = z.infer<typeof updateAwardMemberSchema>;
type ClaimAwardMemberInput = z.infer<typeof claimAwardMemberSchema>;

type AwardOwnerRow = {
  id: string;
  organizer_wallet: string;
};

type AwardMemberRow = {
  id: string;
  award_id: string;
  display_name: string;
  email: string | null;
  wallet_address: string | null;
  allocation: string;
  invite_status: InviteStatus;
  wallet_connected_at: string | null;
  claimed_at: string | null;
  claim_tx_hash: string | null;
  created_at: string;
  updated_at: string;
};

const awardMemberColumns = `
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
`;

export function createAwardMemberRouter(database: DatabaseSync) {
  const router = Router();
  const requireSession = createRequireSession(database);

  router.get("/awards/:awardId/members", (request, response) => {
    const awardOwner = findAwardOwner(database, request.params.awardId);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    const members = database
      .prepare(
        `SELECT ${awardMemberColumns}
         FROM award_members
         WHERE award_id = ?
         ORDER BY created_at DESC`
      )
      .all(request.params.awardId) as AwardMemberRow[];

    response.json({ members: members.map(toAwardMemberResponse) });
  });

  router.post("/awards/:awardId/members", requireSession, (request, response) => {
    const awardOwner = findAwardOwner(database, request.params.awardId);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, awardOwner)) {
      sendAwardMemberForbidden(response);
      return;
    }

    const parsedMember = createAwardMemberSchema.safeParse(request.body);

    if (!parsedMember.success) {
      sendError(response, 400, "INVALID_AWARD_MEMBER_INPUT", "Award member input is invalid", {
        issues: parsedMember.error.flatten()
      });
      return;
    }

    const member = insertAwardMember(database, {
      ...parsedMember.data,
      awardId: awardOwner.id
    });

    response.status(201).json({ member: toAwardMemberResponse(member) });
  });

  router.get("/award-members/:id", (request, response) => {
    const member = findAwardMember(database, request.params.id);

    if (!member) {
      sendAwardMemberNotFound(response);
      return;
    }

    response.json({ member: toAwardMemberResponse(member) });
  });

  router.post("/award-members/:id/claim", requireSession, (request, response) => {
    const member = findAwardMember(database, request.params.id);

    if (!member) {
      sendAwardMemberNotFound(response);
      return;
    }

    const parsedClaim = claimAwardMemberSchema.safeParse(request.body);

    if (!parsedClaim.success) {
      sendError(
        response,
        400,
        "INVALID_AWARD_MEMBER_CLAIM_INPUT",
        "Award member claim input is invalid",
        {
          issues: parsedClaim.error.flatten()
        }
      );
      return;
    }

    if (isAwardMemberClaimed(member)) {
      sendAwardMemberAlreadyClaimed(response);
      return;
    }

    if (!hasClaimableAwardMemberWallet(member)) {
      sendAwardMemberWalletNotConnected(response);
      return;
    }

    if (!canClaimAwardMember(request, member)) {
      sendAwardMemberClaimForbidden(response);
      return;
    }

    const claimed = claimAwardMember(database, member, parsedClaim.data);
    response.json({ member: toAwardMemberResponse(claimed) });
  });

  router.patch("/award-members/:id", requireSession, (request, response) => {
    const member = findAwardMember(database, request.params.id);

    if (!member) {
      sendAwardMemberNotFound(response);
      return;
    }

    const awardOwner = findAwardOwner(database, member.award_id);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, awardOwner)) {
      sendAwardMemberForbidden(response);
      return;
    }

    const parsedPatch = updateAwardMemberSchema.safeParse(request.body);

    if (!parsedPatch.success) {
      sendError(response, 400, "INVALID_AWARD_MEMBER_INPUT", "Award member input is invalid", {
        issues: parsedPatch.error.flatten()
      });
      return;
    }

    const updated = updateAwardMember(database, member, parsedPatch.data);
    response.json({ member: toAwardMemberResponse(updated) });
  });

  router.delete("/award-members/:id", requireSession, (request, response) => {
    const member = findAwardMember(database, request.params.id);

    if (!member) {
      sendAwardMemberNotFound(response);
      return;
    }

    const awardOwner = findAwardOwner(database, member.award_id);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, awardOwner)) {
      sendAwardMemberForbidden(response);
      return;
    }

    database.prepare("DELETE FROM award_members WHERE id = ?").run(member.id);
    response.status(204).send();
  });

  return router;
}

function insertAwardMember(database: DatabaseSync, member: CreateAwardMemberInput): AwardMemberRow {
  const id = randomUUID();
  const now = nowIso();

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      member.awardId,
      member.displayName,
      member.email ?? null,
      member.walletAddress ?? null,
      member.allocation,
      member.inviteStatus,
      member.walletConnectedAt ?? null,
      member.claimedAt ?? null,
      member.claimTxHash ?? null,
      now,
      now
    );

  const created = findAwardMember(database, id);

  if (!created) {
    throw new Error("Failed to load created award member");
  }

  return created;
}

function claimAwardMember(
  database: DatabaseSync,
  member: AwardMemberRow,
  claim: ClaimAwardMemberInput
): AwardMemberRow {
  const claimedAt = nowIso();

  database
    .prepare(
      `UPDATE award_members
       SET invite_status = ?,
           claimed_at = ?,
           claim_tx_hash = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run("Claimed", claimedAt, claim.claimTxHash, claimedAt, member.id);

  const claimed = findAwardMember(database, member.id);

  if (!claimed) {
    throw new Error("Failed to load claimed award member");
  }

  return claimed;
}

function updateAwardMember(
  database: DatabaseSync,
  existing: AwardMemberRow,
  patch: UpdateAwardMemberInput
): AwardMemberRow {
  const displayName = patch.displayName ?? existing.display_name;
  const email = hasPatchProperty(patch, "email") ? patch.email ?? null : existing.email;
  const walletAddress = hasPatchProperty(patch, "walletAddress")
    ? patch.walletAddress ?? null
    : existing.wallet_address;
  const allocation = patch.allocation ?? existing.allocation;
  const inviteStatus = patch.inviteStatus ?? existing.invite_status;
  const walletConnectedAt = hasPatchProperty(patch, "walletConnectedAt")
    ? patch.walletConnectedAt ?? null
    : existing.wallet_connected_at;
  const claimedAt = hasPatchProperty(patch, "claimedAt")
    ? patch.claimedAt ?? null
    : existing.claimed_at;
  const claimTxHash = hasPatchProperty(patch, "claimTxHash")
    ? patch.claimTxHash ?? null
    : existing.claim_tx_hash;

  database
    .prepare(
      `UPDATE award_members
       SET display_name = ?,
           email = ?,
           wallet_address = ?,
           allocation = ?,
           invite_status = ?,
           wallet_connected_at = ?,
           claimed_at = ?,
           claim_tx_hash = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      displayName,
      email,
      walletAddress,
      allocation,
      inviteStatus,
      walletConnectedAt,
      claimedAt,
      claimTxHash,
      nowIso(),
      existing.id
    );

  const updated = findAwardMember(database, existing.id);

  if (!updated) {
    throw new Error("Failed to load updated award member");
  }

  return updated;
}

function canMutateAward(request: Request, awardOwner: AwardOwnerRow): boolean {
  return awardOwner.organizer_wallet === getAuthenticatedSession(request).walletAddress;
}

function canClaimAwardMember(request: Request, member: AwardMemberRow): boolean {
  return member.wallet_address === getAuthenticatedSession(request).walletAddress;
}

function isAwardMemberClaimed(member: AwardMemberRow): boolean {
  return member.invite_status === "Claimed" || member.claimed_at !== null || member.claim_tx_hash !== null;
}

function hasClaimableAwardMemberWallet(member: AwardMemberRow): boolean {
  return member.wallet_address !== null;
}

function findAwardOwner(database: DatabaseSync, awardId: string): AwardOwnerRow | undefined {
  return database
    .prepare("SELECT id, organizer_wallet FROM awards WHERE id = ?")
    .get(awardId) as AwardOwnerRow | undefined;
}

function findAwardMember(database: DatabaseSync, memberId: string): AwardMemberRow | undefined {
  return database
    .prepare(`SELECT ${awardMemberColumns} FROM award_members WHERE id = ?`)
    .get(memberId) as AwardMemberRow | undefined;
}

function hasPatchProperty(patch: UpdateAwardMemberInput, key: keyof UpdateAwardMemberInput): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function toAwardMemberResponse(row: AwardMemberRow) {
  return {
    id: row.id,
    awardId: row.award_id,
    displayName: row.display_name,
    email: row.email,
    walletAddress: row.wallet_address,
    allocation: row.allocation,
    inviteStatus: row.invite_status,
    walletConnectedAt: row.wallet_connected_at,
    claimedAt: row.claimed_at,
    claimTxHash: row.claim_tx_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sendAwardNotFound(response: Response): void {
  sendError(response, 404, "AWARD_NOT_FOUND", "Award was not found");
}

function sendAwardMemberNotFound(response: Response): void {
  sendError(response, 404, "AWARD_MEMBER_NOT_FOUND", "Award member was not found");
}

function sendAwardMemberForbidden(response: Response): void {
  sendError(
    response,
    403,
    "AWARD_MEMBER_FORBIDDEN",
    "Award member can only be changed by its award organizer"
  );
}

function sendAwardMemberClaimForbidden(response: Response): void {
  sendError(
    response,
    403,
    "AWARD_MEMBER_CLAIM_FORBIDDEN",
    "Award member can only be claimed by its connected wallet"
  );
}

function sendAwardMemberAlreadyClaimed(response: Response): void {
  sendError(response, 409, "AWARD_MEMBER_ALREADY_CLAIMED", "Award member was already claimed");
}

function sendAwardMemberWalletNotConnected(response: Response): void {
  sendError(
    response,
    409,
    "AWARD_MEMBER_WALLET_NOT_CONNECTED",
    "Award member wallet must be connected before claim"
  );
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
