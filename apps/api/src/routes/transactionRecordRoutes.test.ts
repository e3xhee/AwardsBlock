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

const awardInput = {
  title: "Best Product",
  rank: "1st",
  reason: "The team delivered the clearest user-facing award flow.",
  judgingSummary: "Strong product thinking, complete demo, and pragmatic technical execution.",
  rewardTokenAddress: "0x2222222222222222222222222222222222222222",
  rewardTokenSymbol: "MNT",
  rewardTokenDecimals: 18,
  totalReward: "1000000000000000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
  metadataUri: "ipfs://awardblock/best-product",
  metadataHash: "0xabc123"
};

const transactionInput = {
  transactionType: "AwardFunded",
  walletAddress: organizerAccount.address,
  txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  blockNumber: 123456
};

type NonceResponse = {
  nonce: {
    nonce: string;
    message: string;
  };
};

type IdResponse<Key extends string> = {
  [Property in Key]: {
    id: string;
  };
};

type TransactionRecordResponse = {
  transaction: {
    id: string;
    awardId: string;
    transactionType: string;
    walletAddress: string;
    txHash: string;
    blockNumber: number | null;
    createdAt: string;
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
  const created = await readJson<IdResponse<"event">>(response);
  return created.event.id;
}

async function createProject(baseUrl: string, cookie: string, eventId: string): Promise<string> {
  const response = await fetch(`${baseUrl}/events/${eventId}/projects`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(projectInput)
  });

  assert.equal(response.status, 201);
  const created = await readJson<IdResponse<"project">>(response);
  return created.project.id;
}

async function createAward(baseUrl: string, cookie: string, projectId: string): Promise<string> {
  const response = await fetch(`${baseUrl}/projects/${projectId}/awards`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(awardInput)
  });

  assert.equal(response.status, 201);
  const created = await readJson<IdResponse<"award">>(response);
  return created.award.id;
}

test("organizers can create, list, read, and delete transaction records", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const otherCookie = await signIn(baseUrl, otherAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);

    const anonymousCreateResponse = await fetch(`${baseUrl}/awards/${awardId}/transactions`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(transactionInput)
    });
    assert.equal(anonymousCreateResponse.status, 401);

    const forbiddenCreateResponse = await fetch(`${baseUrl}/awards/${awardId}/transactions`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify(transactionInput)
    });
    assert.equal(forbiddenCreateResponse.status, 403);

    const createResponse = await fetch(`${baseUrl}/awards/${awardId}/transactions`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(transactionInput)
    });
    assert.equal(createResponse.status, 201);
    const created = await readJson<TransactionRecordResponse>(createResponse);
    assert.equal(created.transaction.awardId, awardId);
    assert.equal(created.transaction.transactionType, transactionInput.transactionType);
    assert.equal(created.transaction.walletAddress, organizerAccount.address.toLowerCase());
    assert.equal(created.transaction.txHash, transactionInput.txHash);
    assert.equal(created.transaction.blockNumber, transactionInput.blockNumber);
    assert.equal(typeof created.transaction.createdAt, "string");

    const listResponse = await fetch(`${baseUrl}/awards/${awardId}/transactions`);
    assert.equal(listResponse.status, 200);
    const list = await readJson<{ transactions: TransactionRecordResponse["transaction"][] }>(
      listResponse
    );
    assert.equal(list.transactions.length, 1);
    assert.equal(list.transactions[0]?.id, created.transaction.id);

    const readResponse = await fetch(`${baseUrl}/transactions/${created.transaction.id}`);
    assert.equal(readResponse.status, 200);
    const read = await readJson<TransactionRecordResponse>(readResponse);
    assert.equal(read.transaction.id, created.transaction.id);

    const forbiddenDeleteResponse = await fetch(
      `${baseUrl}/transactions/${created.transaction.id}`,
      {
        method: "DELETE",
        headers: { cookie: otherCookie }
      }
    );
    assert.equal(forbiddenDeleteResponse.status, 403);

    const deleteResponse = await fetch(`${baseUrl}/transactions/${created.transaction.id}`, {
      method: "DELETE",
      headers: { cookie: organizerCookie }
    });
    assert.equal(deleteResponse.status, 204);

    const missingReadResponse = await fetch(`${baseUrl}/transactions/${created.transaction.id}`);
    assert.equal(missingReadResponse.status, 404);
  });
});

test("transaction record creation validates input and award existence", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);

    const invalidInputResponse = await fetch(`${baseUrl}/awards/${awardId}/transactions`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({
        ...transactionInput,
        txHash: "not-a-transaction-hash"
      })
    });
    assert.equal(invalidInputResponse.status, 400);
    const invalidInput = await readJson<{ error: { code: string } }>(invalidInputResponse);
    assert.equal(invalidInput.error.code, "INVALID_TRANSACTION_RECORD_INPUT");

    const missingAwardResponse = await fetch(`${baseUrl}/awards/missing-award/transactions`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(transactionInput)
    });
    assert.equal(missingAwardResponse.status, 404);
  });
});
