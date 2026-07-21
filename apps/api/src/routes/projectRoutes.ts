import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { createRequireSession, getAuthenticatedSession } from "../middleware/authMiddleware.js";
import { nowIso } from "../utils/time.js";

const nullableTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional()
);

const createProjectSchema = z
  .object({
    name: z.string().trim().min(1),
    tagline: z.string().trim().min(1),
    description: z.string().trim().min(1),
    problem: nullableTextSchema,
    solution: nullableTextSchema,
    imageUrl: nullableTextSchema,
    githubUrl: nullableTextSchema,
    demoUrl: nullableTextSchema,
    presentationUrl: nullableTextSchema
  })
  .strict();

const updateProjectSchema = createProjectSchema.partial().strict();

type CreateProjectInput = z.infer<typeof createProjectSchema> & {
  eventId: string;
};
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

type EventOwnerRow = {
  organizer_wallet: string;
};

type ProjectRow = {
  id: string;
  event_id: string;
  name: string;
  tagline: string;
  description: string;
  problem: string | null;
  solution: string | null;
  image_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  presentation_url: string | null;
  created_at: string;
  updated_at: string;
};

const projectColumns = `
  id,
  event_id,
  name,
  tagline,
  description,
  problem,
  solution,
  image_url,
  github_url,
  demo_url,
  presentation_url,
  created_at,
  updated_at
`;

export function createProjectRouter(database: DatabaseSync) {
  const router = Router();
  const requireSession = createRequireSession(database);

  router.get("/events/:eventId/projects", (request, response) => {
    const eventOwner = findEventOwner(database, request.params.eventId);

    if (!eventOwner) {
      sendEventNotFound(response);
      return;
    }

    const projects = database
      .prepare(`SELECT ${projectColumns} FROM projects WHERE event_id = ? ORDER BY created_at DESC`)
      .all(request.params.eventId) as ProjectRow[];

    response.json({ projects: projects.map(toProjectResponse) });
  });

  router.post("/events/:eventId/projects", requireSession, (request, response) => {
    const eventOwner = findEventOwner(database, request.params.eventId);

    if (!eventOwner) {
      sendEventNotFound(response);
      return;
    }

    const session = getAuthenticatedSession(request);

    if (eventOwner.organizer_wallet !== session.walletAddress) {
      sendProjectForbidden(response);
      return;
    }

    const parsedProject = createProjectSchema.safeParse(request.body);

    if (!parsedProject.success) {
      sendError(response, 400, "INVALID_PROJECT_INPUT", "Project input is invalid", {
        issues: parsedProject.error.flatten()
      });
      return;
    }

    const project = insertProject(database, {
      ...parsedProject.data,
      eventId: request.params.eventId
    });

    response.status(201).json({ project: toProjectResponse(project) });
  });

  router.get("/projects/:id", (request, response) => {
    const project = findProject(database, request.params.id);

    if (!project) {
      sendProjectNotFound(response);
      return;
    }

    response.json({ project: toProjectResponse(project) });
  });

  router.patch("/projects/:id", requireSession, (request, response) => {
    const project = findProject(database, request.params.id);

    if (!project) {
      sendProjectNotFound(response);
      return;
    }

    if (!canMutateProject(database, request, project)) {
      sendProjectForbidden(response);
      return;
    }

    const parsedPatch = updateProjectSchema.safeParse(request.body);

    if (!parsedPatch.success) {
      sendError(response, 400, "INVALID_PROJECT_INPUT", "Project input is invalid", {
        issues: parsedPatch.error.flatten()
      });
      return;
    }

    const updated = updateProject(database, project, parsedPatch.data);
    response.json({ project: toProjectResponse(updated) });
  });

  router.delete("/projects/:id", requireSession, (request, response) => {
    const project = findProject(database, request.params.id);

    if (!project) {
      sendProjectNotFound(response);
      return;
    }

    if (!canMutateProject(database, request, project)) {
      sendProjectForbidden(response);
      return;
    }

    database.prepare("DELETE FROM projects WHERE id = ?").run(project.id);
    response.status(204).send();
  });

  return router;
}

function insertProject(database: DatabaseSync, project: CreateProjectInput): ProjectRow {
  const id = randomUUID();
  const now = nowIso();

  database
    .prepare(
      `INSERT INTO projects (
        id,
        event_id,
        name,
        tagline,
        description,
        problem,
        solution,
        image_url,
        github_url,
        demo_url,
        presentation_url,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      project.eventId,
      project.name,
      project.tagline,
      project.description,
      project.problem ?? null,
      project.solution ?? null,
      project.imageUrl ?? null,
      project.githubUrl ?? null,
      project.demoUrl ?? null,
      project.presentationUrl ?? null,
      now,
      now
    );

  const created = findProject(database, id);

  if (!created) {
    throw new Error("Failed to load created project");
  }

  return created;
}

function updateProject(
  database: DatabaseSync,
  existing: ProjectRow,
  patch: UpdateProjectInput
): ProjectRow {
  const name = patch.name ?? existing.name;
  const tagline = patch.tagline ?? existing.tagline;
  const description = patch.description ?? existing.description;
  const problem = hasPatchProperty(patch, "problem") ? patch.problem ?? null : existing.problem;
  const solution = hasPatchProperty(patch, "solution") ? patch.solution ?? null : existing.solution;
  const imageUrl = hasPatchProperty(patch, "imageUrl") ? patch.imageUrl ?? null : existing.image_url;
  const githubUrl = hasPatchProperty(patch, "githubUrl")
    ? patch.githubUrl ?? null
    : existing.github_url;
  const demoUrl = hasPatchProperty(patch, "demoUrl") ? patch.demoUrl ?? null : existing.demo_url;
  const presentationUrl = hasPatchProperty(patch, "presentationUrl")
    ? patch.presentationUrl ?? null
    : existing.presentation_url;

  database
    .prepare(
      `UPDATE projects
       SET name = ?,
           tagline = ?,
           description = ?,
           problem = ?,
           solution = ?,
           image_url = ?,
           github_url = ?,
           demo_url = ?,
           presentation_url = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      name,
      tagline,
      description,
      problem,
      solution,
      imageUrl,
      githubUrl,
      demoUrl,
      presentationUrl,
      nowIso(),
      existing.id
    );

  const updated = findProject(database, existing.id);

  if (!updated) {
    throw new Error("Failed to load updated project");
  }

  return updated;
}

function canMutateProject(
  database: DatabaseSync,
  request: Request,
  project: ProjectRow
): boolean {
  const eventOwner = findEventOwner(database, project.event_id);
  const session = getAuthenticatedSession(request);

  return eventOwner?.organizer_wallet === session.walletAddress;
}

function findEventOwner(database: DatabaseSync, eventId: string): EventOwnerRow | undefined {
  return database
    .prepare("SELECT organizer_wallet FROM events WHERE id = ?")
    .get(eventId) as EventOwnerRow | undefined;
}

function findProject(database: DatabaseSync, projectId: string): ProjectRow | undefined {
  return database
    .prepare(`SELECT ${projectColumns} FROM projects WHERE id = ?`)
    .get(projectId) as ProjectRow | undefined;
}

function hasPatchProperty(patch: UpdateProjectInput, key: keyof UpdateProjectInput): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function toProjectResponse(row: ProjectRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    problem: row.problem,
    solution: row.solution,
    imageUrl: row.image_url,
    githubUrl: row.github_url,
    demoUrl: row.demo_url,
    presentationUrl: row.presentation_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sendEventNotFound(response: Response): void {
  sendError(response, 404, "EVENT_NOT_FOUND", "Event was not found");
}

function sendProjectNotFound(response: Response): void {
  sendError(response, 404, "PROJECT_NOT_FOUND", "Project was not found");
}

function sendProjectForbidden(response: Response): void {
  sendError(response, 403, "PROJECT_FORBIDDEN", "Project can only be changed by its event organizer");
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
