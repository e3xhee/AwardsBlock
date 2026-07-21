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

type NonceResponse = {
  nonce: {
    nonce: string;
    message: string;
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

test("authenticated organizers can create, update, and delete their events", async () => {
  await withApi(async (baseUrl) => {
    const anonymousCreateResponse = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(eventInput)
    });
    assert.equal(anonymousCreateResponse.status, 401);

    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const otherCookie = await signIn(baseUrl, otherAccount);

    const createResponse = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(eventInput)
    });

    assert.equal(createResponse.status, 201);
    const created = await readJson<EventResponse>(createResponse);
    assert.equal(created.event.name, eventInput.name);
    assert.equal(created.event.organizerWallet, organizerAccount.address.toLowerCase());
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
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ name: "Seoul Builder Demo Day", status: "Published" })
    });

    assert.equal(updateResponse.status, 200);
    const updated = await readJson<EventResponse>(updateResponse);
    assert.equal(updated.event.name, "Seoul Builder Demo Day");
    assert.equal(updated.event.status, "Published");

    const forbiddenUpdateResponse = await fetch(`${baseUrl}/events/${created.event.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify({ name: "Other Wallet Update" })
    });
    assert.equal(forbiddenUpdateResponse.status, 403);

    const anonymousDeleteResponse = await fetch(`${baseUrl}/events/${created.event.id}`, {
      method: "DELETE"
    });
    assert.equal(anonymousDeleteResponse.status, 401);

    const forbiddenDeleteResponse = await fetch(`${baseUrl}/events/${created.event.id}`, {
      method: "DELETE",
      headers: { cookie: otherCookie }
    });
    assert.equal(forbiddenDeleteResponse.status, 403);

    const deleteResponse = await fetch(`${baseUrl}/events/${created.event.id}`, {
      method: "DELETE",
      headers: { cookie: organizerCookie }
    });

    assert.equal(deleteResponse.status, 204);

    const missingResponse = await fetch(`${baseUrl}/events/${created.event.id}`);
    assert.equal(missingResponse.status, 404);
  });
});

test("event creation rejects invalid date ranges", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const response = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
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
