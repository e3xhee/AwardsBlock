import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { createRequireSession, getAuthenticatedSession } from "../middleware/authMiddleware.js";
import { nowIso } from "../utils/time.js";

const eventStatuses = ["Draft", "Published", "Completed", "Archived"] as const;
const eventStatusSchema = z.enum(eventStatuses);
type EventStatus = (typeof eventStatuses)[number];

const dateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

const nullableTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional()
);

const createEventSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    location: nullableTextSchema,
    imageUrl: nullableTextSchema,
    officialUrl: nullableTextSchema,
    socialUrl: nullableTextSchema,
    status: eventStatusSchema.default("Draft")
  })
  .strict()
  .superRefine((event, context) => {
    if (!hasValidDateRange(event.startDate, event.endDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate must be after startDate"
      });
    }
  });

const updateEventSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    location: nullableTextSchema,
    imageUrl: nullableTextSchema,
    officialUrl: nullableTextSchema,
    socialUrl: nullableTextSchema,
    status: eventStatusSchema.optional()
  })
  .strict();

type CreateEventInput = z.infer<typeof createEventSchema> & {
  organizerWallet: string;
};
type UpdateEventInput = z.infer<typeof updateEventSchema>;

type EventRow = {
  id: string;
  organizer_wallet: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string | null;
  image_url: string | null;
  official_url: string | null;
  social_url: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};

const eventColumns = `
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
`;

export function createEventRouter(database: DatabaseSync) {
  const router = Router();
  const requireSession = createRequireSession(database);

  router.post("/", requireSession, (request, response) => {
    const session = getAuthenticatedSession(request);
    const parsedEvent = createEventSchema.safeParse(request.body);

    if (!parsedEvent.success) {
      sendError(response, 400, "INVALID_EVENT_INPUT", "Event input is invalid", {
        issues: parsedEvent.error.flatten()
      });
      return;
    }

    const created = insertEvent(database, {
      ...parsedEvent.data,
      organizerWallet: session.walletAddress
    });
    response.status(201).json({ event: toEventResponse(created) });
  });

  router.get("/", (_request, response) => {
    const rows = database
      .prepare(`SELECT ${eventColumns} FROM events ORDER BY created_at DESC`)
      .all() as EventRow[];

    response.json({ events: rows.map(toEventResponse) });
  });

  router.get("/:id", (request, response) => {
    const event = findEvent(database, request.params.id);

    if (!event) {
      sendEventNotFound(response);
      return;
    }

    response.json({ event: toEventResponse(event) });
  });

  router.patch("/:id", requireSession, (request, response) => {
    const session = getAuthenticatedSession(request);
    const existing = findEvent(database, request.params.id);

    if (!existing) {
      sendEventNotFound(response);
      return;
    }

    if (existing.organizer_wallet !== session.walletAddress) {
      sendError(response, 403, "EVENT_FORBIDDEN", "Event can only be changed by its organizer");
      return;
    }

    const parsedPatch = updateEventSchema.safeParse(request.body);

    if (!parsedPatch.success) {
      sendError(response, 400, "INVALID_EVENT_INPUT", "Event input is invalid", {
        issues: parsedPatch.error.flatten()
      });
      return;
    }

    const updated = updateEvent(database, existing, parsedPatch.data);

    if (!updated) {
      sendError(response, 400, "INVALID_EVENT_INPUT", "Event input is invalid", {
        issues: { fieldErrors: { endDate: ["endDate must be after startDate"] } }
      });
      return;
    }

    response.json({ event: toEventResponse(updated) });
  });

  router.delete("/:id", requireSession, (request, response) => {
    const session = getAuthenticatedSession(request);
    const existing = findEvent(database, request.params.id);

    if (!existing) {
      sendEventNotFound(response);
      return;
    }

    if (existing.organizer_wallet !== session.walletAddress) {
      sendError(response, 403, "EVENT_FORBIDDEN", "Event can only be changed by its organizer");
      return;
    }

    const result = database.prepare("DELETE FROM events WHERE id = ?").run(request.params.id);

    if (Number(result.changes) === 0) {
      sendEventNotFound(response);
      return;
    }

    response.status(204).send();
  });

  return router;
}

function insertEvent(database: DatabaseSync, event: CreateEventInput): EventRow {
  const id = randomUUID();
  const now = nowIso();

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      event.organizerWallet,
      event.name,
      event.description,
      event.startDate,
      event.endDate,
      event.location ?? null,
      event.imageUrl ?? null,
      event.officialUrl ?? null,
      event.socialUrl ?? null,
      event.status,
      now,
      now
    );

  const created = findEvent(database, id);

  if (!created) {
    throw new Error("Failed to load created event");
  }

  return created;
}

function updateEvent(
  database: DatabaseSync,
  existing: EventRow,
  patch: UpdateEventInput
): EventRow | null {
  const name = patch.name ?? existing.name;
  const description = patch.description ?? existing.description;
  const startDate = patch.startDate ?? existing.start_date;
  const endDate = patch.endDate ?? existing.end_date;
  const location = hasPatchProperty(patch, "location") ? patch.location ?? null : existing.location;
  const imageUrl = hasPatchProperty(patch, "imageUrl") ? patch.imageUrl ?? null : existing.image_url;
  const officialUrl = hasPatchProperty(patch, "officialUrl")
    ? patch.officialUrl ?? null
    : existing.official_url;
  const socialUrl = hasPatchProperty(patch, "socialUrl") ? patch.socialUrl ?? null : existing.social_url;
  const status = patch.status ?? existing.status;

  if (!hasValidDateRange(startDate, endDate)) {
    return null;
  }

  database
    .prepare(
      `UPDATE events
       SET name = ?,
           description = ?,
           start_date = ?,
           end_date = ?,
           location = ?,
           image_url = ?,
           official_url = ?,
           social_url = ?,
           status = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      name,
      description,
      startDate,
      endDate,
      location,
      imageUrl,
      officialUrl,
      socialUrl,
      status,
      nowIso(),
      existing.id
    );

  const updated = findEvent(database, existing.id);

  if (!updated) {
    throw new Error("Failed to load updated event");
  }

  return updated;
}

function findEvent(database: DatabaseSync, eventId: string): EventRow | undefined {
  return database
    .prepare(`SELECT ${eventColumns} FROM events WHERE id = ?`)
    .get(eventId) as EventRow | undefined;
}

function hasPatchProperty(patch: UpdateEventInput, key: keyof UpdateEventInput): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function hasValidDateRange(startDate: string, endDate: string): boolean {
  return Date.parse(startDate) < Date.parse(endDate);
}

function toEventResponse(row: EventRow) {
  return {
    id: row.id,
    organizerWallet: row.organizer_wallet,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    imageUrl: row.image_url,
    officialUrl: row.official_url,
    socialUrl: row.social_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sendEventNotFound(response: Response): void {
  sendError(response, 404, "EVENT_NOT_FOUND", "Event was not found");
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
