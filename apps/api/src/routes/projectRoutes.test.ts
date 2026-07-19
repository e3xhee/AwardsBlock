import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { createApp } from "../app.js";
import { initializeDatabase } from "../database/connection.js";

const jsonHeaders = { "content-type": "application/json" };
const organizerAccount = privateKeyToAccount(
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
);
const otherAccount = privateKeyToAccount(
  "0x1111111111111111111111111111111111111111111111111111111111111111"
);

const eventInput = {
  name: "Seoul Demo Day",
  description: "Demo day for builder award submissions",
  startDate: "2026-08-01T09:00:00.000Z",
  endDate: "2026-08-01T18:00:00.000Z",
  location: "Seoul",
  officialUrl: "https://awardblock.example/events/seoul-demo-day"
};

const projectInput = {
  name: "ProofBoard",
  tagline: "Verifiable award submissions for hackathon teams",
  description: "A project that collects team proof and makes award review traceable.",
  problem: "Judges need consistent context before assigning prize rewards.",
  solution: "Teams submit canonical project data that awards can reference.",
  githubUrl: "https://github.com/example/proofboard",
  demoUrl: "https://proofboard.example"
};

type NonceResponse = {
  nonce: {
    nonce: string;
    message: string;
  };
};

type EventResponse = {
  event: {
    id: string;
  };
};

type ProjectResponse = {
  project: {
    id: string;
    eventId: string;
    name: string;
    tagline: string;
    description: string;
    problem: string | null;
    solution: string | null;
    imageUrl: string | null;
    githubUrl: string | null;
    demoUrl: string | null;
    presentationUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

async function withApi(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const database = new DatabaseSync(":memory:");
  initializeDatabase(database);

  const app = createApp({ database });
  const server = app.listen(0);
  const address = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await closeServer(server);
    database.close();
  }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function readJson<T>(response: { json: () => Promise<unknown> }): Promise<T> {
  return (await response.json()) as T;
}

async function signIn(baseUrl: string, account: typeof organizerAccount): Promise<string> {
  const nonceResponse = await fetch(`${baseUrl}/auth/nonce`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ walletAddress: account.address })
  });

  assert.equal(nonceResponse.status, 201);
  const nonce = await readJson<NonceResponse>(nonceResponse);
  const signature = await account.signMessage({ message: nonce.nonce.message });

  const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      walletAddress: account.address,
      nonce: nonce.nonce.nonce,
      signature
    })
  });

  assert.equal(sessionResponse.status, 201);
  const setCookie = sessionResponse.headers.get("set-cookie");

  if (setCookie === null) {
    assert.fail("Expected set-cookie header");
  }

  return setCookie.split(";")[0] ?? "";
}

async function createEvent(baseUrl: string, cookie: string): Promise<string> {
  const response = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(eventInput)
  });

  assert.equal(response.status, 201);
  const created = await readJson<EventResponse>(response);
  return created.event.id;
}

test("event organizers can create, read, update, and delete projects", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const otherCookie = await signIn(baseUrl, otherAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);

    const anonymousCreateResponse = await fetch(`${baseUrl}/events/${eventId}/projects`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(projectInput)
    });
    assert.equal(anonymousCreateResponse.status, 401);

    const forbiddenCreateResponse = await fetch(`${baseUrl}/events/${eventId}/projects`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify(projectInput)
    });
    assert.equal(forbiddenCreateResponse.status, 403);

    const createResponse = await fetch(`${baseUrl}/events/${eventId}/projects`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(projectInput)
    });

    assert.equal(createResponse.status, 201);
    const created = await readJson<ProjectResponse>(createResponse);
    assert.equal(created.project.eventId, eventId);
    assert.equal(created.project.name, projectInput.name);
    assert.equal(created.project.tagline, projectInput.tagline);
    assert.equal(created.project.imageUrl, null);

    const listResponse = await fetch(`${baseUrl}/events/${eventId}/projects`);
    assert.equal(listResponse.status, 200);
    const list = await readJson<{ projects: ProjectResponse["project"][] }>(listResponse);
    assert.equal(list.projects.length, 1);
    assert.equal(list.projects[0]?.id, created.project.id);

    const getResponse = await fetch(`${baseUrl}/projects/${created.project.id}`);
    assert.equal(getResponse.status, 200);
    const fetched = await readJson<ProjectResponse>(getResponse);
    assert.equal(fetched.project.id, created.project.id);

    const forbiddenUpdateResponse = await fetch(`${baseUrl}/projects/${created.project.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify({ tagline: "Changed by another wallet" })
    });
    assert.equal(forbiddenUpdateResponse.status, 403);

    const updateResponse = await fetch(`${baseUrl}/projects/${created.project.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ tagline: "Project data room for prize review", problem: null })
    });
    assert.equal(updateResponse.status, 200);
    const updated = await readJson<ProjectResponse>(updateResponse);
    assert.equal(updated.project.tagline, "Project data room for prize review");
    assert.equal(updated.project.problem, null);

    const anonymousDeleteResponse = await fetch(`${baseUrl}/projects/${created.project.id}`, {
      method: "DELETE"
    });
    assert.equal(anonymousDeleteResponse.status, 401);

    const forbiddenDeleteResponse = await fetch(`${baseUrl}/projects/${created.project.id}`, {
      method: "DELETE",
      headers: { cookie: otherCookie }
    });
    assert.equal(forbiddenDeleteResponse.status, 403);

    const deleteResponse = await fetch(`${baseUrl}/projects/${created.project.id}`, {
      method: "DELETE",
      headers: { cookie: organizerCookie }
    });
    assert.equal(deleteResponse.status, 204);

    const missingResponse = await fetch(`${baseUrl}/projects/${created.project.id}`);
    assert.equal(missingResponse.status, 404);
  });
});

test("project creation validates input and requires an existing event", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);

    const invalidResponse = await fetch(`${baseUrl}/events/${eventId}/projects`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ ...projectInput, name: "" })
    });
    assert.equal(invalidResponse.status, 400);
    const invalidPayload = await readJson<{ error: { code: string } }>(invalidResponse);
    assert.equal(invalidPayload.error.code, "INVALID_PROJECT_INPUT");

    const missingEventResponse = await fetch(`${baseUrl}/events/missing-event/projects`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(projectInput)
    });
    assert.equal(missingEventResponse.status, 404);
  });
});
