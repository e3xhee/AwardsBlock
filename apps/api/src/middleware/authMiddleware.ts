import type { DatabaseSync } from "node:sqlite";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  clearSessionCookie,
  findSession,
  getSessionCookieName,
  type AuthSession
} from "../auth/session.js";

type RequestWithSession = Request & {
  session?: AuthSession;
};

export function createRequireSession(database: DatabaseSync): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const sessionId = request.cookies?.[getSessionCookieName()];

    if (typeof sessionId !== "string" || !sessionId) {
      sendAuthRequired(response);
      return;
    }

    const session = findSession(database, sessionId);

    if (!session) {
      clearSessionCookie(response);
      sendAuthRequired(response);
      return;
    }

    (request as RequestWithSession).session = session;
    next();
  };
}

export function getAuthenticatedSession(request: Request): AuthSession {
  const session = (request as RequestWithSession).session;

  if (!session) {
    throw new Error("Authenticated session is missing from request");
  }

  return session;
}

function sendAuthRequired(response: Response): void {
  response.status(401).json({
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required"
    }
  });
}
