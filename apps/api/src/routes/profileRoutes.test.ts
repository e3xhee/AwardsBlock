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
const recipientAccount = privateKeyToAccount(
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
  rewardTokenSymbol: "mUSDC",
  rewardTokenDecimals: 6,
  totalReward: "1000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
  metadataUri: "ipfs://awardblock/best-product",
  metadataHash: "0xabc123"
};

const memberInput = {
  displayName: "Ada Lee",
  email: "ada@example.com",
  allocation: "600000"
};

const claimTxHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

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

type CreatedClaimInviteResponse = {
  invite: {
    token: string;
  };
};

type ProfileResponse = {
  profile: {
    walletAddress: string;
    stats: {
      awardCount: number;
      claimedAwardCount: number;
      projectCount: number;
    };
    awards: Array<{
      member: {
        id: string;
        displayName: string;
        allocation: string;
        inviteStatus: string;
        walletConnectedAt: string | null;
        claimedAt: string | null;
        claimTxHash: string | null;
      };
      award: {
        id: string;
        title: string;
        rank: string | null;
        rewardTokenSymbol: string;
        rewardTokenDecimals: number;
        totalReward: string;
      };
      project: {
        id: string;
        name: string;
      };
      event: {
        id: string;
        name: string;
      };
      claimTransactions: Array<{
        id: string;
        transactionType: string;
        txHash: string;
        blockNumber: number | null;
        createdAt: string;
      }>;
    }>;
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

async function createAwardMember(baseUrl: string, cookie: string, awardId: string): Promise<string> {
  const response = await fetch(`${baseUrl}/awards/${awardId}/members`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify(memberInput)
  });

  assert.equal(response.status, 201);
  const created = await readJson<IdResponse<"member">>(response);
  return created.member.id;
}

async function inviteAndClaimMember(
  baseUrl: string,
  organizerCookie: string,
  recipientCookie: string,
  awardId: string,
  memberId: string
): Promise<void> {
  const inviteResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie: organizerCookie },
    body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
  });
  assert.equal(inviteResponse.status, 201);
  const invite = await readJson<CreatedClaimInviteResponse>(inviteResponse);

  const connectResponse = await fetch(
    `${baseUrl}/claim-invites/${invite.invite.token}/connect-wallet`,
    {
      method: "POST",
      headers: { cookie: recipientCookie }
    }
  );
  assert.equal(connectResponse.status, 200);

  const claimResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie: recipientCookie },
    body: JSON.stringify({ claimTxHash })
  });
  assert.equal(claimResponse.status, 200);

  const transactionResponse = await fetch(`${baseUrl}/awards/${awardId}/transactions`, {
    method: "POST",
    headers: { ...jsonHeaders, cookie: organizerCookie },
    body: JSON.stringify({
      transactionType: "AwardClaimed",
      walletAddress: recipientAccount.address,
      txHash: claimTxHash,
      blockNumber: 123456
    })
  });
  assert.equal(transactionResponse.status, 201);
}

test("public wallet profiles include award and claim history", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const recipientCookie = await signIn(baseUrl, recipientAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);
    const memberId = await createAwardMember(baseUrl, organizerCookie, awardId);
    await inviteAndClaimMember(baseUrl, organizerCookie, recipientCookie, awardId, memberId);

    const response = await fetch(`${baseUrl}/profiles/${recipientAccount.address}`);
    assert.equal(response.status, 200);
    const profile = await readJson<ProfileResponse>(response);

    assert.equal(profile.profile.walletAddress, recipientAccount.address.toLowerCase());
    assert.equal(profile.profile.stats.awardCount, 1);
    assert.equal(profile.profile.stats.claimedAwardCount, 1);
    assert.equal(profile.profile.stats.projectCount, 1);
    assert.equal(profile.profile.awards.length, 1);

    const history = profile.profile.awards[0];
    assert.ok(history);
    assert.equal(history.member.id, memberId);
    assert.equal(history.member.displayName, memberInput.displayName);
    assert.equal(history.member.allocation, memberInput.allocation);
    assert.equal(history.member.inviteStatus, "Claimed");
    assert.equal(typeof history.member.walletConnectedAt, "string");
    assert.equal(typeof history.member.claimedAt, "string");
    assert.equal(history.member.claimTxHash, claimTxHash);
    assert.equal(history.award.id, awardId);
    assert.equal(history.award.title, awardInput.title);
    assert.equal(history.award.rank, awardInput.rank);
    assert.equal(history.award.rewardTokenSymbol, awardInput.rewardTokenSymbol);
    assert.equal(history.award.rewardTokenDecimals, awardInput.rewardTokenDecimals);
    assert.equal(history.award.totalReward, awardInput.totalReward);
    assert.equal(history.project.id, projectId);
    assert.equal(history.project.name, projectInput.name);
    assert.equal(history.event.id, eventId);
    assert.equal(history.event.name, eventInput.name);
    assert.equal(history.claimTransactions.length, 1);
    assert.equal(history.claimTransactions[0]?.transactionType, "AwardClaimed");
    assert.equal(history.claimTransactions[0]?.txHash, claimTxHash);
    assert.equal(history.claimTransactions[0]?.blockNumber, 123456);
  });
});

test("wallet profiles validate addresses and return empty public profiles", async () => {
  await withApi(async (baseUrl) => {
    const invalidResponse = await fetch(`${baseUrl}/profiles/not-a-wallet`);
    assert.equal(invalidResponse.status, 400);
    const invalid = await readJson<{ error: { code: string } }>(invalidResponse);
    assert.equal(invalid.error.code, "INVALID_WALLET_ADDRESS");

    const emptyWallet = "0x3333333333333333333333333333333333333333";
    const emptyResponse = await fetch(`${baseUrl}/profiles/${emptyWallet}`);
    assert.equal(emptyResponse.status, 200);
    const empty = await readJson<ProfileResponse>(emptyResponse);
    assert.equal(empty.profile.walletAddress, emptyWallet);
    assert.equal(empty.profile.stats.awardCount, 0);
    assert.equal(empty.profile.stats.claimedAwardCount, 0);
    assert.equal(empty.profile.stats.projectCount, 0);
    assert.equal(empty.profile.awards.length, 0);
  });
});
