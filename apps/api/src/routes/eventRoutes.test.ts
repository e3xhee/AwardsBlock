import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createApp } from "../app.js";
import { initializeDatabase } from "../database/connection.js";

const jsonHeaders = { "content-type": "application/json" };

const eventInput = {
  organizerWallet: "0x1111111111111111111111111111111111111111",
  name: "Seoul Demo Day",
  description: "Demo day for builder award submissions",
  startDate: "2026-08-01T09:00:00.000Z",
  endDate: "2026-08-01T18:00:00.000Z",
  location: "Seoul",
  officialUrl: "https://awardblock.example/events/seoul-demo-day"
};

type EventResponse = {
  event: {
    id: string;
    organizerWallet: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string | null;
    imageUrl: string | null;
    officialUrl: string | null;
    socialUrl: string | null;
    status: string;
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

test("events can be created, read, listed, updated, and deleted", async () => {
  await withApi(async (baseUrl) => {
    const createResponse = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(eventInput)
    });

    assert.equal(createResponse.status, 201);
    const created = await readJson<EventResponse>(createResponse);
    assert.equal(created.event.name, eventInput.name);
    assert.equal(created.event.organizerWallet, eventInput.organizerWallet);
    assert.equal(created.event.status, "Draft");
    assert.equal(typeof created.event.id, "string");

    const getResponse = await fetch(`${baseUrl}/events/${created.event.id}`);
    assert.equal(getResponse.status, 200);
    const fetched = await readJson<EventResponse>(getResponse);
    assert.equal(fetched.event.id, created.event.id);

    const listResponse = await fetch(`${baseUrl}/events`);
    assert.equal(listResponse.status, 200);
    const list = await readJson<{ events: EventResponse["event"][] }>(listResponse);
    assert.equal(list.events.length, 1);
    assert.equal(list.events[0]?.id, created.event.id);

    const updateResponse = await fetch(`${baseUrl}/events/${created.event.id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "Seoul Builder Demo Day", status: "Published" })
    });

    assert.equal(updateResponse.status, 200);
    const updated = await readJson<EventResponse>(updateResponse);
    assert.equal(updated.event.name, "Seoul Builder Demo Day");
    assert.equal(updated.event.status, "Published");

    const deleteResponse = await fetch(`${baseUrl}/events/${created.event.id}`, {
      method: "DELETE"
    });

    assert.equal(deleteResponse.status, 204);

    const missingResponse = await fetch(`${baseUrl}/events/${created.event.id}`);
    assert.equal(missingResponse.status, 404);
  });
});

test("event creation rejects invalid date ranges", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        ...eventInput,
        startDate: "2026-08-02T09:00:00.000Z",
        endDate: "2026-08-01T18:00:00.000Z"
      })
    });

    assert.equal(response.status, 400);
    const payload = await readJson<{ error: { code: string } }>(response);
    assert.equal(payload.error.code, "INVALID_EVENT_INPUT");
  });
});
