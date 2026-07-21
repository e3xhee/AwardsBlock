import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Response } from "express";
import { isAddress, verifyMessage } from "viem";
import type { Address, Hex } from "viem";
import { createAuthNonce, createSignInMessage } from "../auth/nonce.js";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  findSession,
  getSessionCookieName,
  setSessionCookie
} from "../auth/session.js";
import { nowIso } from "../utils/time.js";

const nonceTtlMilliseconds = 5 * 60 * 1000;

type AuthNonceRow = {
  wallet_address: string;
  nonce: string;
  expires_at: string;
  used_at: string | null;
};

export function createAuthRouter(database: DatabaseSync) {
  const router = Router();

  router.post("/nonce", (request, response) => {
    const walletAddress = normalizeWalletAddress(request.body?.walletAddress);

    if (!walletAddress) {
      sendError(response, 400, "INVALID_WALLET_ADDRESS", "Wallet address is invalid");
      return;
    }

    const nonce = createAuthNonce();
    const expiresAt = new Date(Date.now() + nonceTtlMilliseconds).toISOString();

    database
      .prepare(
        `INSERT INTO auth_nonces (
          wallet_address,
          nonce,
          expires_at,
          used_at
        ) VALUES (?, ?, ?, NULL)`
      )
      .run(walletAddress, nonce, expiresAt);

    response.status(201).json({
      nonce: {
        walletAddress,
        nonce,
        message: createSignInMessage(walletAddress, nonce),
        expiresAt
      }
    });
  });

  router.post("/session", async (request, response) => {
    const input = parseSessionInput(request.body);

    if (!input) {
      sendError(response, 400, "INVALID_SESSION_INPUT", "Session input is invalid");
      return;
    }

    const nonce = findUsableNonce(database, input.walletAddress, input.nonce);

    if (!nonce) {
      sendError(response, 401, "INVALID_AUTH_NONCE", "Authentication nonce is invalid");
      return;
    }

    const message = createSignInMessage(input.walletAddress, input.nonce);
    const isValidSignature = await verifyMessage({
      address: input.walletAddress as Address,
      message,
      signature: input.signature as Hex
    });

    if (!isValidSignature) {
      sendError(response, 401, "INVALID_SIGNATURE", "Signature is invalid");
      return;
    }

    markNonceUsed(database, input.walletAddress, input.nonce);

    const session = createSession(database, input.walletAddress);
    setSessionCookie(response, session.id, session.expiresAt);

    response.status(201).json({
      session: {
        walletAddress: session.walletAddress,
        expiresAt: session.expiresAt
      }
    });
  });

  router.get("/session", (request, response) => {
    const sessionId = request.cookies?.[getSessionCookieName()];

    if (!sessionId) {
      sendAuthRequired(response);
      return;
    }

    const session = findSession(database, sessionId);

    if (!session) {
      clearSessionCookie(response);
      sendAuthRequired(response);
      return;
    }

    response.json({
      session: {
        walletAddress: session.walletAddress,
        expiresAt: session.expiresAt
      }
    });
  });

  router.delete("/session", (request, response) => {
    const sessionId = request.cookies?.[getSessionCookieName()];

    if (sessionId) {
      deleteSession(database, sessionId);
    }

    clearSessionCookie(response);
    response.status(204).send();
  });

  return router;
}

function parseSessionInput(body: unknown):
  | {
      walletAddress: string;
      nonce: string;
      signature: string;
    }
  | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;
  const walletAddress = normalizeWalletAddress(value.walletAddress);
  const nonce = typeof value.nonce === "string" ? value.nonce.trim() : "";
  const signature = typeof value.signature === "string" ? value.signature.trim() : "";

  if (!walletAddress || !nonce || !signature.startsWith("0x")) {
    return null;
  }

  return { walletAddress, nonce, signature };
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

function findUsableNonce(
  database: DatabaseSync,
  walletAddress: string,
  nonce: string
): AuthNonceRow | undefined {
  const row = database
    .prepare(
      `SELECT wallet_address, nonce, expires_at, used_at
       FROM auth_nonces
       WHERE wallet_address = ? AND nonce = ?`
    )
    .get(walletAddress, nonce) as AuthNonceRow | undefined;

  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) {
    return undefined;
  }

  return row;
}

function markNonceUsed(database: DatabaseSync, walletAddress: string, nonce: string): void {
  database
    .prepare(
      `UPDATE auth_nonces
       SET used_at = ?
       WHERE wallet_address = ? AND nonce = ?`
    )
    .run(nowIso(), walletAddress, nonce);
}

function sendAuthRequired(response: Response): void {
  sendError(response, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
}

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({
    error: {
      code,
      message
    }
  });
}
