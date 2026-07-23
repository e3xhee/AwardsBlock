import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const chromePath =
  process.env.AWARDBLOCK_CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = Number(process.env.AWARDBLOCK_CDP_PORT ?? 9333);
const userDataDir = `${process.env.TEMP ?? "C:/tmp"}/awardblock-cdp-${Date.now()}`;
const webBaseUrl = process.env.AWARDBLOCK_WEB_URL ?? "http://localhost:5173";
const apiBaseUrl = process.env.AWARDBLOCK_API_URL ?? "http://localhost:4000";

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `${webBaseUrl}/organizer`,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitForJson(`http://127.0.0.1:${port}/json`, 30_000);
  const page = target.find((entry) => entry.type === "page") ?? target[0];
  if (!page?.webSocketDebuggerUrl)
    throw new Error("Chrome page target not found");

  const cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: `${webBaseUrl}/organizer` });
  await waitFor(
    cdp,
    "document.querySelector('#organizer-award-form') !== null",
    "organizer form",
  );

  await cdp.eval(`document.querySelector('[data-wallet-connect]').click()`);
  await waitFor(
    cdp,
    "document.querySelector('[data-wallet-status]')?.textContent.includes('0x')",
    "wallet session",
  );
  const session = await waitForValue(
    cdp,
    `fetch("${apiBaseUrl}/auth/session", { credentials: "include" }).then((response) => response.ok ? response.json() : null).then((payload) => payload?.session ?? null)`,
    "wallet API session",
  );
  await cdp.eval(
    `document.querySelector('[name="recipientWalletAddress"]').value = '${session.walletAddress}'`,
  );

  await cdp.eval(
    `document.querySelector('#organizer-award-form').requestSubmit()`,
  );
  const organizerResult = await waitForValue(
    cdp,
    `(() => {
      const links = [...document.querySelectorAll('.organizer-result-actions a')].map((link) => link.getAttribute('href'));
      const awardPath = links.find((href) => href?.startsWith('/awards/'));
      const claimPath = links.find((href) => href?.startsWith('/claim/'));
      return awardPath && claimPath ? { awardPath, claimPath, text: document.querySelector('#organizer-result')?.innerText ?? '' } : null;
    })()`,
    "organizer success",
  );

  await cdp.send("Page.navigate", {
    url: `${webBaseUrl}${organizerResult.awardPath}`,
  });
  await waitFor(
    cdp,
    "document.querySelector('[data-onchain-action=\"fund\"]') !== null",
    "fund action",
  );
  await cdp.eval(
    `document.querySelector('[data-onchain-action="fund"]').click()`,
  );
  await waitFor(
    cdp,
    "document.querySelector('[data-onchain-action=\"finalize\"]') !== null",
    "finalize action",
  );
  await cdp.eval(
    `document.querySelector('[data-onchain-action="finalize"]').click()`,
  );
  await waitFor(
    cdp,
    "document.querySelector('[data-onchain-action]') === null",
    "finalized state",
  );

  await cdp.send("Page.navigate", {
    url: `${webBaseUrl}${organizerResult.claimPath}`,
  });
  await waitFor(
    cdp,
    "document.querySelector('[data-claim-form] button') !== null",
    "claim form",
  );
  await cdp.eval(`document.querySelector('[data-claim-form]').requestSubmit()`);
  await waitFor(
    cdp,
    "document.querySelector('.empty-state h2')?.innerText.includes('0x')",
    "claim success",
  );

  const awardId = organizerResult.awardPath.split("/").pop();
  const awardBlock = await fetchJson(`${apiBaseUrl}/award-blocks/${awardId}`);
  const transactionTypes = awardBlock.awardBlock.transactions.map(
    (tx) => tx.transactionType,
  );
  const member = awardBlock.awardBlock.members[0];

  if (awardBlock.awardBlock.award.status !== "Claiming") {
    throw new Error(
      `Expected award status Claiming, got ${awardBlock.awardBlock.award.status}`,
    );
  }

  for (const expected of [
    "AwardRegistered",
    "RecipientsSet",
    "AwardFunded",
    "AwardFinalized",
    "AwardClaimed",
  ]) {
    if (!transactionTypes.includes(expected)) {
      throw new Error(`Missing transaction record ${expected}`);
    }
  }

  if (member?.inviteStatus !== "Claimed" || !member.claimTxHash) {
    throw new Error("Expected recipient member to be claimed");
  }

  console.log(
    JSON.stringify(
      {
        awardPath: organizerResult.awardPath,
        claimPath: organizerResult.claimPath,
        awardStatus: awardBlock.awardBlock.award.status,
        memberStatus: member.inviteStatus,
        transactionTypes,
      },
      null,
      2,
    ),
  );

  await cdp.close();
} finally {
  chrome.kill();
  await rm(userDataDir, { recursive: true, force: true }).catch(
    () => undefined,
  );
}

async function waitForJson(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await fetchJson(url);
    } catch {
      await delay(250);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.json();
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let id = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    send(method, params = {}) {
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) =>
        pending.set(id, { resolve, reject }),
      );
    },
    async eval(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails)
        throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    close() {
      socket.close();
    },
  };
}

async function waitFor(cdp, expression, label) {
  await waitForValue(cdp, `Boolean(${expression})`, label);
}

async function waitForValue(cdp, expression, label) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const value = await cdp.eval(expression).catch(() => null);
    if (value) return value;
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
