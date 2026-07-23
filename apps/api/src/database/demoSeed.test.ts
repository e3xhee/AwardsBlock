import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createApp } from "../app.js";
import { initializeDatabase } from "./connection.js";
import { seedDemoData } from "./demoSeed.js";

type AwardBlockListResponse = {
  awardBlocks: Array<{
    id: string;
    event: { id: string; name: string };
    project: { id: string; name: string };
    award: { id: string; title: string; rank: string | null; status: string };
    claimStats: { recipientCount: number; claimedCount: number };
  }>;
};

type AwardBlockDetailResponse = {
  awardBlock: {
    id: string;
    members: Array<{
      id: string;
      displayName: string;
      inviteStatus: string;
      claimTxHash: string | null;
    }>;
    transactions: Array<{
      transactionType: string;
      txHash: string;
    }>;
  };
};

type ClaimInviteLookupResponse = {
  invite: {
    id: string;
    member: {
      id: string;
      displayName: string;
      inviteStatus: string;
    };
  };
};

type WalletProfileResponse = {
  profile: {
    walletAddress: string;
    stats: {
      awardCount: number;
      claimedAwardCount: number;
    };
    awards: Array<{
      member: {
        id: string;
        claimTxHash: string | null;
      };
    }>;
  };
};

async function withSeededApi(
  run: (baseUrl: string, database: DatabaseSync) => Promise<void>,
) {
  const database = new DatabaseSync(":memory:");
  initializeDatabase(database);
  const seed = seedDemoData(database);
  const reseed = seedDemoData(database);

  assert.deepEqual(reseed, seed);

  const app = createApp({ database });
  const server = app.listen(0);
  const address = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${address.port}`, database);
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

async function readJson<T>(response: {
  json: () => Promise<unknown>;
}): Promise<T> {
  return (await response.json()) as T;
}

test("demo seed exposes a complete award and claim journey", async () => {
  await withSeededApi(async (baseUrl, database) => {
    const eventCount = database
      .prepare("SELECT COUNT(*) AS count FROM events WHERE id = ?")
      .get("event-1") as { count: number };
    assert.equal(eventCount.count, 1);

    const listResponse = await fetch(`${baseUrl}/award-blocks`);
    assert.equal(listResponse.status, 200);
    const list = await readJson<AwardBlockListResponse>(listResponse);
    const awardBlock = list.awardBlocks.find(
      (candidate) => candidate.id === "award-1",
    );

    assert.ok(awardBlock);
    assert.equal(awardBlock.event.name, "De-Buthon 2026");
    assert.equal(awardBlock.project.name, "Uniport");
    assert.equal(awardBlock.award.title, "Grand Prize");
    assert.equal(awardBlock.award.rank, null);
    assert.equal(awardBlock.award.status, "Claiming");
    assert.deepEqual(awardBlock.claimStats, {
      recipientCount: 2,
      claimedCount: 1,
    });

    const detailResponse = await fetch(`${baseUrl}/award-blocks/award-1`);
    assert.equal(detailResponse.status, 200);
    const detail = await readJson<AwardBlockDetailResponse>(detailResponse);
    assert.equal(detail.awardBlock.members.length, 2);
    assert.equal(
      detail.awardBlock.members.find((member) => member.id === "member-1")
        ?.inviteStatus,
      "Claimed",
    );
    assert.equal(
      detail.awardBlock.members.find((member) => member.id === "member-2")
        ?.inviteStatus,
      "Invited",
    );
    assert.ok(
      detail.awardBlock.transactions.some(
        (transaction) => transaction.transactionType === "AwardClaimed",
      ),
    );

    const inviteResponse = await fetch(
      `${baseUrl}/claim-invites/demo-claim-token`,
    );
    assert.equal(inviteResponse.status, 200);
    const invite = await readJson<ClaimInviteLookupResponse>(inviteResponse);
    assert.equal(invite.invite.id, "invite-1");
    assert.equal(invite.invite.member.id, "member-2");
    assert.equal(invite.invite.member.displayName, "Grace Park");
    assert.equal(invite.invite.member.inviteStatus, "Invited");

    const profileResponse = await fetch(
      `${baseUrl}/profiles/0x3333333333333333333333333333333333333333`,
    );
    assert.equal(profileResponse.status, 200);
    const profile = await readJson<WalletProfileResponse>(profileResponse);
    assert.equal(profile.profile.stats.awardCount, 1);
    assert.equal(profile.profile.stats.claimedAwardCount, 1);
    assert.equal(
      profile.profile.awards[0]?.member.claimTxHash,
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });
});
