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
  metadataHash: "0xabc123",
  contractAwardId: "contract-award-1",
  status: "Claiming"
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

type AwardBlockListResponse = {
  awardBlocks: Array<{
    id: string;
    organizerWallet: string;
    event: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
    };
    project: {
      id: string;
      name: string;
      tagline: string | null;
    };
    award: {
      id: string;
      title: string;
      rank: string | null;
      status: string;
      rewardTokenSymbol: string;
      rewardTokenDecimals: number;
      totalReward: string;
      metadataHash: string | null;
      contractAwardId: string | null;
    };
    claimStats: {
      recipientCount: number;
      claimedCount: number;
    };
    createdAt: string;
  }>;
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

async function signIn(baseUrl: string): Promise<string> {
  const nonceResponse = await fetch(`${baseUrl}/auth/nonce`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ walletAddress: organizerAccount.address })
  });

  assert.equal(nonceResponse.status, 201);
  const nonce = await readJson<NonceResponse>(nonceResponse);
  const signature = await organizerAccount.signMessage({ message: nonce.nonce.message });

  const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      walletAddress: organizerAccount.address,
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

async function createAwardMember(
  baseUrl: string,
  cookie: string,
  awardId: string,
  displayName: string,
  inviteStatus: "Pending" | "Claimed"
): Promise<string> {
  const response = await fetch(`${baseUrl}/awards/${awardId}/members`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({
      displayName,
      email: `${displayName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      walletAddress:
        inviteStatus === "Claimed" ? "0x3333333333333333333333333333333333333333" : null,
      allocation: "500000000000000000",
      inviteStatus,
      walletConnectedAt: inviteStatus === "Claimed" ? "2026-08-03T00:00:00.000Z" : null,
      claimedAt: inviteStatus === "Claimed" ? "2026-08-04T00:00:00.000Z" : null,
      claimTxHash:
        inviteStatus === "Claimed"
          ? "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          : null
    })
  });

  assert.equal(response.status, 201);
  const created = await readJson<IdResponse<"member">>(response);
  return created.member.id;
}

test("public award blocks include latest award summaries and claim stats", async () => {
  await withApi(async (baseUrl) => {
    const cookie = await signIn(baseUrl);
    const eventId = await createEvent(baseUrl, cookie);
    const projectId = await createProject(baseUrl, cookie, eventId);
    const awardId = await createAward(baseUrl, cookie, projectId);
    await createAwardMember(baseUrl, cookie, awardId, "Ada Lee", "Claimed");
    await createAwardMember(baseUrl, cookie, awardId, "Grace Park", "Pending");

    const response = await fetch(`${baseUrl}/award-blocks`);
    assert.equal(response.status, 200);
    const payload = await readJson<AwardBlockListResponse>(response);

    assert.equal(payload.awardBlocks.length, 1);
    const awardBlock = payload.awardBlocks[0];
    assert.ok(awardBlock);
    assert.equal(awardBlock.id, awardId);
    assert.equal(awardBlock.organizerWallet, organizerAccount.address.toLowerCase());
    assert.equal(awardBlock.event.id, eventId);
    assert.equal(awardBlock.event.name, eventInput.name);
    assert.equal(awardBlock.event.startDate, eventInput.startDate);
    assert.equal(awardBlock.event.endDate, eventInput.endDate);
    assert.equal(awardBlock.project.id, projectId);
    assert.equal(awardBlock.project.name, projectInput.name);
    assert.equal(awardBlock.project.tagline, projectInput.tagline);
    assert.equal(awardBlock.award.id, awardId);
    assert.equal(awardBlock.award.title, awardInput.title);
    assert.equal(awardBlock.award.rank, awardInput.rank);
    assert.equal(awardBlock.award.status, awardInput.status);
    assert.equal(awardBlock.award.rewardTokenSymbol, awardInput.rewardTokenSymbol);
    assert.equal(awardBlock.award.rewardTokenDecimals, awardInput.rewardTokenDecimals);
    assert.equal(awardBlock.award.totalReward, awardInput.totalReward);
    assert.equal(awardBlock.award.metadataHash, awardInput.metadataHash);
    assert.equal(awardBlock.award.contractAwardId, awardInput.contractAwardId);
    assert.equal(awardBlock.claimStats.recipientCount, 2);
    assert.equal(awardBlock.claimStats.claimedCount, 1);
    assert.equal(typeof awardBlock.createdAt, "string");
  });
});

test("public award blocks return an empty list", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/award-blocks`);
    assert.equal(response.status, 200);
    const payload = await readJson<AwardBlockListResponse>(response);
    assert.deepEqual(payload.awardBlocks, []);
  });
});
