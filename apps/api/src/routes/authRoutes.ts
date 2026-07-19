import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Response } from "express";
import { isAddress, verifyMessage } from "viem";
import type { Address, Hex } from "viem";
import { createAuthNonce, createSignInMessage } from "../auth/nonce.js";
import { nowIso } from "../utils/time.js";

const nonceTtlMilliseconds = 5 * 60 * 1000;
const sessionTtlMilliseconds = 7 * 24 * 60 * 60 * 1000;

type AuthNonceRow = {
  wallet_address: string;
  nonce: string;
  expires_at: string;
  used_at: string | null;
};

type SessionRow = {
  id: string;
  wallet_address: string;
  expires_at: string;
  created_at: string;
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

    const session = createSession(database, input.walletAddress, input.nonce);
    setSessionCookie(response, session.id, session.expires_at);

    response.status(201).json({
      session: {
        walletAddress: session.wallet_address,
        expiresAt: session.expires_at
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
        walletAddress: session.wallet_address,
        expiresAt: session.expires_at
      }
    });
  });

  router.delete("/session", (request, response) => {
    const sessionId = request.cookies?.[getSessionCookieName()];

    if (sessionId) {
      database.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
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

function createSession(database: DatabaseSync, walletAddress: string, nonce: string): SessionRow {
  const sessionId = randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionTtlMilliseconds).toISOString();

  database
    .prepare(
      `UPDATE auth_nonces
       SET used_at = ?
       WHERE wallet_address = ? AND nonce = ?`
    )
    .run(createdAt, walletAddress, nonce);

  database
    .prepare(
      `INSERT INTO sessions (
        id,
        wallet_address,
        expires_at,
        created_at
      ) VALUES (?, ?, ?, ?)`
    )
    .run(sessionId, walletAddress, expiresAt, createdAt);

  return {
    id: sessionId,
    wallet_address: walletAddress,
    expires_at: expiresAt,
    created_at: createdAt
  };
}

function findSession(database: DatabaseSync, sessionId: string): SessionRow | undefined {
  const session = database
    .prepare(
      `SELECT id, wallet_address, expires_at, created_at
       FROM sessions
       WHERE id = ?`
    )
    .get(sessionId) as SessionRow | undefined;

  if (!session) {
    return undefined;
  }

  if (Date.parse(session.expires_at) <= Date.now()) {
    database.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return undefined;
  }

  return session;
}

function setSessionCookie(response: Response, sessionId: string, expiresAt: string): void {
  response.cookie(getSessionCookieName(), sessionId, {
    ...getSessionCookieOptions(),
    expires: new Date(expiresAt)
  });
}

function clearSessionCookie(response: Response): void {
  response.cookie(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });
}

function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME ?? "awardblock_session";
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };
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
