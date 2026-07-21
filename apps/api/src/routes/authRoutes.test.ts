import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { createApp } from "../app.js";
import { initializeDatabase } from "../database/connection.js";

const jsonHeaders = { "content-type": "application/json" };
const sessionCookieName = "awardblock_session";
const account = privateKeyToAccount(
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
);

type NonceResponse = {
  nonce: {
    walletAddress: string;
    nonce: string;
    message: string;
    expiresAt: string;
  };
};

type SessionResponse = {
  session: {
    walletAddress: string;
    expiresAt: string;
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

async function requestNonce(baseUrl: string): Promise<NonceResponse> {
  const response = await fetch(`${baseUrl}/auth/nonce`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ walletAddress: account.address })
  });

  assert.equal(response.status, 201);
  return readJson<NonceResponse>(response);
}

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie");

  if (setCookie === null) {
    assert.fail("Expected set-cookie header");
  }

  assert.ok(setCookie.includes(`${sessionCookieName}=`));
  assert.ok(setCookie.includes("HttpOnly"));
  assert.ok(setCookie.includes("SameSite=Lax"));
  return setCookie.split(";")[0] ?? "";
}

test("wallet signatures create, read, and clear sessions", async () => {
  await withApi(async (baseUrl) => {
    const nonce = await requestNonce(baseUrl);
    const signature = await account.signMessage({ message: nonce.nonce.message });

    const createSessionResponse = await fetch(`${baseUrl}/auth/session`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        walletAddress: account.address,
        nonce: nonce.nonce.nonce,
        signature
      })
    });

    assert.equal(createSessionResponse.status, 201);
    const cookie = extractCookie(createSessionResponse);
    const createdSession = await readJson<SessionResponse>(createSessionResponse);
    assert.equal(createdSession.session.walletAddress, account.address.toLowerCase());

    const getSessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie }
    });
    assert.equal(getSessionResponse.status, 200);
    const fetchedSession = await readJson<SessionResponse>(getSessionResponse);
    assert.equal(fetchedSession.session.walletAddress, account.address.toLowerCase());

    const logoutResponse = await fetch(`${baseUrl}/auth/session`, {
      method: "DELETE",
      headers: { cookie }
    });
    assert.equal(logoutResponse.status, 204);
    assert.ok(logoutResponse.headers.get("set-cookie")?.includes("Max-Age=0"));

    const missingSessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie }
    });
    assert.equal(missingSessionResponse.status, 401);
  });
});

test("session creation rejects invalid signatures and used nonces", async () => {
  await withApi(async (baseUrl) => {
    const nonce = await requestNonce(baseUrl);
    const invalidSignature = await account.signMessage({ message: "wrong message" });

    const invalidResponse = await fetch(`${baseUrl}/auth/session`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        walletAddress: account.address,
        nonce: nonce.nonce.nonce,
        signature: invalidSignature
      })
    });

    assert.equal(invalidResponse.status, 401);

    const validSignature = await account.signMessage({ message: nonce.nonce.message });
    const validResponse = await fetch(`${baseUrl}/auth/session`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        walletAddress: account.address,
        nonce: nonce.nonce.nonce,
        signature: validSignature
      })
    });
    assert.equal(validResponse.status, 201);

    const replayResponse = await fetch(`${baseUrl}/auth/session`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        walletAddress: account.address,
        nonce: nonce.nonce.nonce,
        signature: validSignature
      })
    });

    assert.equal(replayResponse.status, 401);
  });
});
