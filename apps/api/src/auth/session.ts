import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Response } from "express";
import { nowIso } from "../utils/time.js";

const sessionTtlMilliseconds = 7 * 24 * 60 * 60 * 1000;

type SessionRow = {
  id: string;
  wallet_address: string;
  expires_at: string;
  created_at: string;
};

export type AuthSession = {
  id: string;
  walletAddress: string;
  expiresAt: string;
  createdAt: string;
};

export function createSession(database: DatabaseSync, walletAddress: string): AuthSession {
  const sessionId = randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionTtlMilliseconds).toISOString();

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
    walletAddress,
    expiresAt,
    createdAt
  };
}

export function findSession(database: DatabaseSync, sessionId: string): AuthSession | undefined {
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
    deleteSession(database, sessionId);
    return undefined;
  }

  return {
    id: session.id,
    walletAddress: session.wallet_address,
    expiresAt: session.expires_at,
    createdAt: session.created_at
  };
}

export function deleteSession(database: DatabaseSync, sessionId: string): void {
  database.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function setSessionCookie(response: Response, sessionId: string, expiresAt: string): void {
  response.cookie(getSessionCookieName(), sessionId, {
    ...getSessionCookieOptions(),
    expires: new Date(expiresAt)
  });
}

export function clearSessionCookie(response: Response): void {
  response.cookie(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });
}

export function getSessionCookieName(): string {
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
