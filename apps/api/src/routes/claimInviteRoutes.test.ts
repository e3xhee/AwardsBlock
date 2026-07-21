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

type AwardMemberResponse = {
  member: {
    id: string;
    walletAddress: string | null;
    inviteStatus: string;
    walletConnectedAt: string | null;
    claimedAt: string | null;
    claimTxHash: string | null;
  };
};

type ClaimInviteResponse = {
  invite: {
    id: string;
    awardMemberId: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  };
};

type CreatedClaimInviteResponse = {
  invite: ClaimInviteResponse["invite"] & {
    token: string;
  };
};

type ClaimInviteLookupResponse = {
  invite: {
    id: string;
    awardMemberId: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
    member: {
      id: string;
      awardId: string;
      displayName: string;
      allocation: string;
      inviteStatus: string;
    };
  };
};

type ConnectedClaimInviteResponse = {
  invite: ClaimInviteResponse["invite"] & {
    member: {
      id: string;
      walletAddress: string;
      inviteStatus: string;
      walletConnectedAt: string;
    };
  };
};

type ClaimedAwardMemberResponse = {
  member: {
    id: string;
    walletAddress: string;
    inviteStatus: string;
    claimedAt: string;
    claimTxHash: string;
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

test("organizers can create, list, resolve, and revoke claim invites", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const otherCookie = await signIn(baseUrl, otherAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);
    const memberId = await createAwardMember(baseUrl, organizerCookie, awardId);

    const anonymousCreateResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
    });
    assert.equal(anonymousCreateResponse.status, 401);

    const forbiddenCreateResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: otherCookie },
      body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
    });
    assert.equal(forbiddenCreateResponse.status, 403);

    const createResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
    });

    assert.equal(createResponse.status, 201);
    const created = await readJson<CreatedClaimInviteResponse>(createResponse);
    assert.equal(created.invite.awardMemberId, memberId);
    assert.equal(created.invite.expiresAt, "2026-08-15T00:00:00.000Z");
    assert.equal(created.invite.usedAt, null);
    assert.equal(typeof created.invite.token, "string");
    assert.ok(created.invite.token.length >= 32);

    const memberResponse = await fetch(`${baseUrl}/award-members/${memberId}`);
    assert.equal(memberResponse.status, 200);
    const member = await readJson<AwardMemberResponse>(memberResponse);
    assert.equal(member.member.inviteStatus, "Invited");

    const listResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      headers: { cookie: organizerCookie }
    });
    assert.equal(listResponse.status, 200);
    const list = await readJson<{ invites: ClaimInviteResponse["invite"][] }>(listResponse);
    assert.equal(list.invites.length, 1);
    const listedInvite = list.invites[0];
    assert.ok(listedInvite);
    assert.equal(listedInvite.id, created.invite.id);
    assert.equal("token" in listedInvite, false);

    const lookupResponse = await fetch(`${baseUrl}/claim-invites/${created.invite.token}`);
    assert.equal(lookupResponse.status, 200);
    const lookup = await readJson<ClaimInviteLookupResponse>(lookupResponse);
    assert.equal(lookup.invite.id, created.invite.id);
    assert.equal(lookup.invite.member.id, memberId);
    assert.equal(lookup.invite.member.awardId, awardId);
    assert.equal(lookup.invite.member.displayName, memberInput.displayName);
    assert.equal(lookup.invite.member.allocation, memberInput.allocation);

    const forbiddenDeleteResponse = await fetch(`${baseUrl}/claim-invites/${created.invite.id}`, {
      method: "DELETE",
      headers: { cookie: otherCookie }
    });
    assert.equal(forbiddenDeleteResponse.status, 403);

    const deleteResponse = await fetch(`${baseUrl}/claim-invites/${created.invite.id}`, {
      method: "DELETE",
      headers: { cookie: organizerCookie }
    });
    assert.equal(deleteResponse.status, 204);

    const missingLookupResponse = await fetch(`${baseUrl}/claim-invites/${created.invite.token}`);
    assert.equal(missingLookupResponse.status, 404);
  });
});

test("claim invite creation validates expiration and member existence", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);
    const memberId = await createAwardMember(baseUrl, organizerCookie, awardId);

    const invalidExpirationResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ expiresAt: "2000-01-01T00:00:00.000Z" })
    });
    assert.equal(invalidExpirationResponse.status, 400);
    const invalidExpiration = await readJson<{ error: { code: string } }>(invalidExpirationResponse);
    assert.equal(invalidExpiration.error.code, "INVALID_CLAIM_INVITE_INPUT");

    const missingMemberResponse = await fetch(`${baseUrl}/award-members/missing-member/claim-invites`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
    });
    assert.equal(missingMemberResponse.status, 404);
  });
});

test("recipients can connect wallets with claim invite tokens", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const recipientCookie = await signIn(baseUrl, otherAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);
    const memberId = await createAwardMember(baseUrl, organizerCookie, awardId);

    const createResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
    });
    assert.equal(createResponse.status, 201);
    const created = await readJson<CreatedClaimInviteResponse>(createResponse);

    const anonymousConnectResponse = await fetch(
      `${baseUrl}/claim-invites/${created.invite.token}/connect-wallet`,
      {
        method: "POST"
      }
    );
    assert.equal(anonymousConnectResponse.status, 401);

    const connectResponse = await fetch(
      `${baseUrl}/claim-invites/${created.invite.token}/connect-wallet`,
      {
        method: "POST",
        headers: { cookie: recipientCookie }
      }
    );
    assert.equal(connectResponse.status, 200);
    const connected = await readJson<ConnectedClaimInviteResponse>(connectResponse);
    assert.equal(connected.invite.id, created.invite.id);
    assert.equal(connected.invite.awardMemberId, memberId);
    assert.equal(typeof connected.invite.usedAt, "string");
    assert.equal(connected.invite.member.id, memberId);
    assert.equal(connected.invite.member.walletAddress, otherAccount.address.toLowerCase());
    assert.equal(connected.invite.member.inviteStatus, "WalletConnected");
    assert.equal(typeof connected.invite.member.walletConnectedAt, "string");

    const memberResponse = await fetch(`${baseUrl}/award-members/${memberId}`);
    assert.equal(memberResponse.status, 200);
    const member = await readJson<AwardMemberResponse>(memberResponse);
    assert.equal(member.member.walletAddress, otherAccount.address.toLowerCase());
    assert.equal(member.member.inviteStatus, "WalletConnected");
    assert.equal(typeof member.member.walletConnectedAt, "string");

    const usedLookupResponse = await fetch(`${baseUrl}/claim-invites/${created.invite.token}`);
    assert.equal(usedLookupResponse.status, 404);

    const duplicateConnectResponse = await fetch(
      `${baseUrl}/claim-invites/${created.invite.token}/connect-wallet`,
      {
        method: "POST",
        headers: { cookie: recipientCookie }
      }
    );
    assert.equal(duplicateConnectResponse.status, 404);
  });
});

test("connected recipients can record award member claims", async () => {
  await withApi(async (baseUrl) => {
    const organizerCookie = await signIn(baseUrl, organizerAccount);
    const recipientCookie = await signIn(baseUrl, otherAccount);
    const eventId = await createEvent(baseUrl, organizerCookie);
    const projectId = await createProject(baseUrl, organizerCookie, eventId);
    const awardId = await createAward(baseUrl, organizerCookie, projectId);
    const memberId = await createAwardMember(baseUrl, organizerCookie, awardId);

    const createInviteResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim-invites`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ expiresAt: "2026-08-15T00:00:00.000Z" })
    });
    assert.equal(createInviteResponse.status, 201);
    const invite = await readJson<CreatedClaimInviteResponse>(createInviteResponse);

    const connectResponse = await fetch(
      `${baseUrl}/claim-invites/${invite.invite.token}/connect-wallet`,
      {
        method: "POST",
        headers: { cookie: recipientCookie }
      }
    );
    assert.equal(connectResponse.status, 200);

    const claimTxHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const anonymousClaimResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ claimTxHash })
    });
    assert.equal(anonymousClaimResponse.status, 401);

    const forbiddenClaimResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: organizerCookie },
      body: JSON.stringify({ claimTxHash })
    });
    assert.equal(forbiddenClaimResponse.status, 403);

    const claimResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: recipientCookie },
      body: JSON.stringify({ claimTxHash })
    });
    assert.equal(claimResponse.status, 200);
    const claimed = await readJson<ClaimedAwardMemberResponse>(claimResponse);
    assert.equal(claimed.member.id, memberId);
    assert.equal(claimed.member.walletAddress, otherAccount.address.toLowerCase());
    assert.equal(claimed.member.inviteStatus, "Claimed");
    assert.equal(claimed.member.claimTxHash, claimTxHash);
    assert.equal(typeof claimed.member.claimedAt, "string");

    const memberResponse = await fetch(`${baseUrl}/award-members/${memberId}`);
    assert.equal(memberResponse.status, 200);
    const member = await readJson<AwardMemberResponse>(memberResponse);
    assert.equal(member.member.inviteStatus, "Claimed");
    assert.equal(member.member.claimTxHash, claimTxHash);
    assert.equal(typeof member.member.claimedAt, "string");

    const duplicateClaimResponse = await fetch(`${baseUrl}/award-members/${memberId}/claim`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: recipientCookie },
      body: JSON.stringify({ claimTxHash })
    });
    assert.equal(duplicateClaimResponse.status, 409);
  });
});
