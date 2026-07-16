import type { NextFunction, Request, Response } from "express";

export function requireSession(request: Request, response: Response, next: NextFunction) {
  const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? "awardblock_session";

  if (!request.cookies?.[sessionCookieName]) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  next();
}
