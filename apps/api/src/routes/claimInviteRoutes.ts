import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { createRequireSession, getAuthenticatedSession } from "../middleware/authMiddleware.js";
import { nowIso } from "../utils/time.js";

const defaultInviteTtlMilliseconds = 14 * 24 * 60 * 60 * 1000;

const dateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
  .refine((value) => Date.parse(value) > Date.now(), "expiresAt must be in the future");

const createClaimInviteSchema = z
  .object({
    expiresAt: dateStringSchema.optional()
  })
  .strict();

type AwardMemberOwnerRow = {
  id: string;
  award_id: string;
  display_name: string;
  allocation: string;
  invite_status: string;
  organizer_wallet: string;
};

type ClaimInviteRow = {
  id: string;
  award_member_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type ClaimInviteLookupRow = ClaimInviteRow & {
  member_id: string;
  member_award_id: string;
  member_display_name: string;
  member_allocation: string;
  member_invite_status: string;
};

const claimInviteColumns = `
  id,
  award_member_id,
  token_hash,
  expires_at,
  used_at,
  created_at
`;

export function createClaimInviteRouter(database: DatabaseSync) {
  const router = Router();
  const requireSession = createRequireSession(database);

  router.post("/award-members/:memberId/claim-invites", requireSession, (request, response) => {
    const memberOwner = findAwardMemberOwner(database, request.params.memberId);

    if (!memberOwner) {
      sendAwardMemberNotFound(response);
      return;
    }

    if (!canMutateMember(request, memberOwner)) {
      sendClaimInviteForbidden(response);
      return;
    }

    const parsedInvite = createClaimInviteSchema.safeParse(request.body ?? {});

    if (!parsedInvite.success) {
      sendError(response, 400, "INVALID_CLAIM_INVITE_INPUT", "Claim invite input is invalid", {
        issues: parsedInvite.error.flatten()
      });
      return;
    }

    const token = createInviteToken();
    const expiresAt =
      parsedInvite.data.expiresAt ??
      new Date(Date.now() + defaultInviteTtlMilliseconds).toISOString();
    const invite = insertClaimInvite(database, memberOwner.id, token, expiresAt);

    database
      .prepare("UPDATE award_members SET invite_status = ?, updated_at = ? WHERE id = ?")
      .run("Invited", nowIso(), memberOwner.id);

    response.status(201).json({ invite: toClaimInviteResponse(invite, token) });
  });

  router.get("/award-members/:memberId/claim-invites", requireSession, (request, response) => {
    const memberOwner = findAwardMemberOwner(database, request.params.memberId);

    if (!memberOwner) {
      sendAwardMemberNotFound(response);
      return;
    }

    if (!canMutateMember(request, memberOwner)) {
      sendClaimInviteForbidden(response);
      return;
    }

    const invites = database
      .prepare(
        `SELECT ${claimInviteColumns}
         FROM claim_invites
         WHERE award_member_id = ?
         ORDER BY created_at DESC`
      )
      .all(memberOwner.id) as ClaimInviteRow[];

    response.json({ invites: invites.map((invite) => toClaimInviteResponse(invite)) });
  });

  router.get("/claim-invites/:token", (request, response) => {
    const invite = findValidClaimInviteByToken(database, request.params.token);

    if (!invite) {
      sendClaimInviteNotFound(response);
      return;
    }

    response.json({ invite: toClaimInviteLookupResponse(invite) });
  });

  router.delete("/claim-invites/:id", requireSession, (request, response) => {
    const invite = findClaimInvite(database, request.params.id);

    if (!invite) {
      sendClaimInviteNotFound(response);
      return;
    }

    const memberOwner = findAwardMemberOwner(database, invite.award_member_id);

    if (!memberOwner) {
      sendAwardMemberNotFound(response);
      return;
    }

    if (!canMutateMember(request, memberOwner)) {
      sendClaimInviteForbidden(response);
      return;
    }

    database.prepare("DELETE FROM claim_invites WHERE id = ?").run(invite.id);
    response.status(204).send();
  });

  return router;
}

function insertClaimInvite(
  database: DatabaseSync,
  awardMemberId: string,
  token: string,
  expiresAt: string
): ClaimInviteRow {
  const id = cryptoRandomId();
  const now = nowIso();
  const tokenHash = hashInviteToken(token);

  database
    .prepare(
      `INSERT INTO claim_invites (
        id,
        award_member_id,
        token_hash,
        expires_at,
        used_at,
        created_at
      ) VALUES (?, ?, ?, ?, NULL, ?)`
    )
    .run(id, awardMemberId, tokenHash, expiresAt, now);

  const created = findClaimInvite(database, id);

  if (!created) {
    throw new Error("Failed to load created claim invite");
  }

  return created;
}

function findAwardMemberOwner(
  database: DatabaseSync,
  awardMemberId: string
): AwardMemberOwnerRow | undefined {
  return database
    .prepare(
      `SELECT
         award_members.id,
         award_members.award_id,
         award_members.display_name,
         award_members.allocation,
         award_members.invite_status,
         awards.organizer_wallet
       FROM award_members
       INNER JOIN awards ON awards.id = award_members.award_id
       WHERE award_members.id = ?`
    )
    .get(awardMemberId) as AwardMemberOwnerRow | undefined;
}

function findClaimInvite(database: DatabaseSync, inviteId: string): ClaimInviteRow | undefined {
  return database
    .prepare(`SELECT ${claimInviteColumns} FROM claim_invites WHERE id = ?`)
    .get(inviteId) as ClaimInviteRow | undefined;
}

function findValidClaimInviteByToken(
  database: DatabaseSync,
  token: string
): ClaimInviteLookupRow | undefined {
  const row = database
    .prepare(
      `SELECT
         claim_invites.id,
         claim_invites.award_member_id,
         claim_invites.token_hash,
         claim_invites.expires_at,
         claim_invites.used_at,
         claim_invites.created_at,
         award_members.id AS member_id,
         award_members.award_id AS member_award_id,
         award_members.display_name AS member_display_name,
         award_members.allocation AS member_allocation,
         award_members.invite_status AS member_invite_status
       FROM claim_invites
       INNER JOIN award_members ON award_members.id = claim_invites.award_member_id
       WHERE claim_invites.token_hash = ?`
    )
    .get(hashInviteToken(token)) as ClaimInviteLookupRow | undefined;

  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) {
    return undefined;
  }

  return row;
}

function canMutateMember(request: Request, memberOwner: AwardMemberOwnerRow): boolean {
  return memberOwner.organizer_wallet === getAuthenticatedSession(request).walletAddress;
}

function createInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

function cryptoRandomId(): string {
  return randomBytes(16).toString("hex");
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toClaimInviteResponse(row: ClaimInviteRow, token?: string) {
  return {
    id: row.id,
    awardMemberId: row.award_member_id,
    ...(token === undefined ? {} : { token }),
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at
  };
}

function toClaimInviteLookupResponse(row: ClaimInviteLookupRow) {
  return {
    id: row.id,
    awardMemberId: row.award_member_id,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
    member: {
      id: row.member_id,
      awardId: row.member_award_id,
      displayName: row.member_display_name,
      allocation: row.member_allocation,
      inviteStatus: row.member_invite_status
    }
  };
}

function sendAwardMemberNotFound(response: Response): void {
  sendError(response, 404, "AWARD_MEMBER_NOT_FOUND", "Award member was not found");
}

function sendClaimInviteNotFound(response: Response): void {
  sendError(response, 404, "CLAIM_INVITE_NOT_FOUND", "Claim invite was not found");
}

function sendClaimInviteForbidden(response: Response): void {
  sendError(
    response,
    403,
    "CLAIM_INVITE_FORBIDDEN",
    "Claim invite can only be changed by its award organizer"
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
