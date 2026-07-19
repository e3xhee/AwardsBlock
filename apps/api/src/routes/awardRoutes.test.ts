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
  };
};

type AwardResponse = {
  award: {
    id: string;
    eventId: string;
    projectId: string;
    organizerWallet: string;
    title: string;
    rank: string | null;
    reason: string | null;
    judgingSummary: string | null;
    rewardTokenAddress: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    totalReward: string;
    claimStart: string;
    claimEnd: string;
    metadataUri: string | null;
    metadataHash: string | null;
    contractAwardId: string | null;
    status: string;
    createTxHash: string | null;
    fundTxHash: string | null;
    finalizeTxHash: string | null;
    supersededBy: string | null;
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

async function createProject(baseUrl: string, cookie: string, eventId: string): Promise<string> {
  const response = await fetch(`${baseUrl}/events/${eventId}/projects`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(projectInput)
  });

  assert.equal(response.status, 201);
  const created = await readJson<ProjectResponse>(response);
  return created.project.id;
}

test("event organizers can create, read, update, and delete awards", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const otherCookie = await signIn(baseUrl, otherAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);

    const anonymousCreateResponse = await fetch(`${baseUrl}/projects/${projectId}/awards`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(awardInput)
    });
    assert.equal(anonymousCreateResponse.status, 401);

    const forbiddenCreateResponse = await fetch(`${baseUrl}/projects/${projectId}/awards`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify(awardInput)
    });
    assert.equal(forbiddenCreateResponse.status, 403);

    const createResponse = await fetch(`${baseUrl}/projects/${projectId}/awards`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(awardInput)
    });

    assert.equal(createResponse.status, 201);
    const created = await readJson<AwardResponse>(createResponse);
    assert.equal(created.award.eventId, eventId);
    assert.equal(created.award.projectId, projectId);
    assert.equal(created.award.organizerWallet, organizerAccount.address.toLowerCase());
    assert.equal(created.award.title, awardInput.title);
    assert.equal(created.award.status, "Draft");

    const listResponse = await fetch(`${baseUrl}/projects/${projectId}/awards`);
    assert.equal(listResponse.status, 200);
    const list = await readJson<{ awards: AwardResponse["award"][] }>(listResponse);
    assert.equal(list.awards.length, 1);
    assert.equal(list.awards[0]?.id, created.award.id);

    const getResponse = await fetch(`${baseUrl}/awards/${created.award.id}`);
    assert.equal(getResponse.status, 200);
    const fetched = await readJson<AwardResponse>(getResponse);
    assert.equal(fetched.award.id, created.award.id);

    const forbiddenUpdateResponse = await fetch(`${baseUrl}/awards/${created.award.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify({ title: "Changed by another wallet" })
    });
    assert.equal(forbiddenUpdateResponse.status, 403);

    const updateResponse = await fetch(`${baseUrl}/awards/${created.award.id}`, {
      method: "PATCH",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({
        reason: null,
        status: "AwaitingRecipients",
        totalReward: "2000000000000000000"
      })
    });
    assert.equal(updateResponse.status, 200);
    const updated = await readJson<AwardResponse>(updateResponse);
    assert.equal(updated.award.reason, null);
    assert.equal(updated.award.status, "AwaitingRecipients");
    assert.equal(updated.award.totalReward, "2000000000000000000");

    const anonymousDeleteResponse = await fetch(`${baseUrl}/awards/${created.award.id}`, {
      method: "DELETE"
    });
    assert.equal(anonymousDeleteResponse.status, 401);

    const forbiddenDeleteResponse = await fetch(`${baseUrl}/awards/${created.award.id}`, {
      method: "DELETE",
      headers: { cookie: otherCookie }
    });
    assert.equal(forbiddenDeleteResponse.status, 403);

    const deleteResponse = await fetch(`${baseUrl}/awards/${created.award.id}`, {
      method: "DELETE",
      headers: { cookie: organizerCookie }
    });
    assert.equal(deleteResponse.status, 204);

    const missingResponse = await fetch(`${baseUrl}/awards/${created.award.id}`);
    assert.equal(missingResponse.status, 404);
  });
});

test("award creation validates reward and claim window input", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);

    const invalidRewardResponse = await fetch(`${baseUrl}/projects/${projectId}/awards`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ ...awardInput, totalReward: "0" })
    });
    assert.equal(invalidRewardResponse.status, 400);
    const invalidReward = await readJson<{ error: { code: string } }>(invalidRewardResponse);
    assert.equal(invalidReward.error.code, "INVALID_AWARD_INPUT");

    const invalidClaimWindowResponse = await fetch(`${baseUrl}/projects/${projectId}/awards`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({
        ...awardInput,
        claimStart: "2026-09-02T00:00:00.000Z",
        claimEnd: "2026-09-01T00:00:00.000Z"
      })
    });
    assert.equal(invalidClaimWindowResponse.status, 400);

    const missingProjectResponse = await fetch(`${baseUrl}/projects/missing-project/awards`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify(awardInput)
    });
    assert.equal(missingProjectResponse.status, 404);
  });
});
