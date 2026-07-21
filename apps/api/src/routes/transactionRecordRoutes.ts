import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Request, Response } from "express";
import { isAddress } from "viem";
import { z } from "zod";
import { createRequireSession, getAuthenticatedSession } from "../middleware/authMiddleware.js";
import { nowIso } from "../utils/time.js";

const transactionTypes = [
  "AwardRegistered",
  "AwardFunded",
  "AwardFinalized",
  "AwardClaimed"
] as const;

const transactionTypeSchema = z.enum(transactionTypes);

const walletAddressSchema = z
  .string()
  .trim()
  .refine((value) => isAddress(value), "Invalid wallet address")
  .transform((value) => value.toLowerCase());

const transactionHashSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash")
  .transform((value) => value.toLowerCase());

const createTransactionRecordSchema = z
  .object({
    transactionType: transactionTypeSchema,
    walletAddress: walletAddressSchema,
    txHash: transactionHashSchema,
    blockNumber: z.number().int().nonnegative().nullable().optional()
  })
  .strict();

type TransactionType = (typeof transactionTypes)[number];
type CreateTransactionRecordInput = z.infer<typeof createTransactionRecordSchema> & {
  awardId: string;
};

type AwardOwnerRow = {
  id: string;
  organizer_wallet: string;
};

type TransactionRecordRow = {
  id: string;
  award_id: string;
  transaction_type: TransactionType;
  wallet_address: string;
  tx_hash: string;
  block_number: number | null;
  created_at: string;
};

const transactionRecordColumns = `
  id,
  award_id,
  transaction_type,
  wallet_address,
  tx_hash,
  block_number,
  created_at
`;

export function createTransactionRecordRouter(database: DatabaseSync) {
  const router = Router();
  const requireSession = createRequireSession(database);

  router.get("/awards/:awardId/transactions", (request, response) => {
    const awardOwner = findAwardOwner(database, request.params.awardId);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    const transactions = database
      .prepare(
        `SELECT ${transactionRecordColumns}
         FROM transaction_records
         WHERE award_id = ?
         ORDER BY created_at DESC`
      )
      .all(awardOwner.id) as TransactionRecordRow[];

    response.json({ transactions: transactions.map(toTransactionRecordResponse) });
  });

  router.post("/awards/:awardId/transactions", requireSession, (request, response) => {
    const awardOwner = findAwardOwner(database, request.params.awardId);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, awardOwner)) {
      sendTransactionRecordForbidden(response);
      return;
    }

    const parsedTransaction = createTransactionRecordSchema.safeParse(request.body);

    if (!parsedTransaction.success) {
      sendError(
        response,
        400,
        "INVALID_TRANSACTION_RECORD_INPUT",
        "Transaction record input is invalid",
        {
          issues: parsedTransaction.error.flatten()
        }
      );
      return;
    }

    const transaction = insertTransactionRecord(database, {
      ...parsedTransaction.data,
      awardId: awardOwner.id
    });

    response.status(201).json({ transaction: toTransactionRecordResponse(transaction) });
  });

  router.get("/transactions/:id", (request, response) => {
    const transaction = findTransactionRecord(database, request.params.id);

    if (!transaction) {
      sendTransactionRecordNotFound(response);
      return;
    }

    response.json({ transaction: toTransactionRecordResponse(transaction) });
  });

  router.delete("/transactions/:id", requireSession, (request, response) => {
    const transaction = findTransactionRecord(database, request.params.id);

    if (!transaction) {
      sendTransactionRecordNotFound(response);
      return;
    }

    const awardOwner = findAwardOwner(database, transaction.award_id);

    if (!awardOwner) {
      sendAwardNotFound(response);
      return;
    }

    if (!canMutateAward(request, awardOwner)) {
      sendTransactionRecordForbidden(response);
      return;
    }

    database.prepare("DELETE FROM transaction_records WHERE id = ?").run(transaction.id);
    response.status(204).send();
  });

  return router;
}

function insertTransactionRecord(
  database: DatabaseSync,
  transaction: CreateTransactionRecordInput
): TransactionRecordRow {
  const id = randomUUID();

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      transaction.awardId,
      transaction.transactionType,
      transaction.walletAddress,
      transaction.txHash,
      transaction.blockNumber ?? null,
      nowIso()
    );

  const created = findTransactionRecord(database, id);

  if (!created) {
    throw new Error("Failed to load created transaction record");
  }

  return created;
}

function canMutateAward(request: Request, awardOwner: AwardOwnerRow): boolean {
  return awardOwner.organizer_wallet === getAuthenticatedSession(request).walletAddress;
}

function findAwardOwner(database: DatabaseSync, awardId: string): AwardOwnerRow | undefined {
  return database
    .prepare("SELECT id, organizer_wallet FROM awards WHERE id = ?")
    .get(awardId) as AwardOwnerRow | undefined;
}

function findTransactionRecord(
  database: DatabaseSync,
  transactionId: string
): TransactionRecordRow | undefined {
  return database
    .prepare(`SELECT ${transactionRecordColumns} FROM transaction_records WHERE id = ?`)
    .get(transactionId) as TransactionRecordRow | undefined;
}

function toTransactionRecordResponse(row: TransactionRecordRow) {
  return {
    id: row.id,
    awardId: row.award_id,
    transactionType: row.transaction_type,
    walletAddress: row.wallet_address,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    createdAt: row.created_at
  };
}

function sendAwardNotFound(response: Response): void {
  sendError(response, 404, "AWARD_NOT_FOUND", "Award was not found");
}

function sendTransactionRecordNotFound(response: Response): void {
  sendError(response, 404, "TRANSACTION_RECORD_NOT_FOUND", "Transaction record was not found");
}

function sendTransactionRecordForbidden(response: Response): void {
  sendError(
    response,
    403,
    "TRANSACTION_RECORD_FORBIDDEN",
    "Transaction records can only be changed by the award organizer"
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
