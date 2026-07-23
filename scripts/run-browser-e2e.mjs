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
    `${webBaseUrl}/login`,
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

  await cdp.send("Page.navigate", { url: `${webBaseUrl}/login` });
  await waitFor(
    cdp,
    "document.querySelector('.role-login-page') !== null",
    "role login page",
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

  await cdp.send("Page.navigate", { url: `${webBaseUrl}/organizer/events` });
  await waitFor(
    cdp,
    "document.querySelector('#organizer-event-form') !== null",
    "organizer event form",
  );
  await cdp.eval(`document.querySelector('#organizer-event-form').requestSubmit()`);
  const eventResult = await waitForValue(
    cdp,
    `(() => {
      const eventPath = [...document.querySelectorAll('.organizer-result-actions a')]
        .map((link) => link.getAttribute('href'))
        .find((href) => href?.startsWith('/events/'));
      return eventPath ? { eventPath, eventId: eventPath.split('/').pop() } : null;
    })()`,
    "event creation success",
  );

  await cdp.send("Page.navigate", { url: `${webBaseUrl}/participant/projects` });
  await waitFor(
    cdp,
    "document.querySelector('#participant-project-form') !== null",
    "participant project form",
  );
  await waitFor(
    cdp,
    `document.querySelector('#participant-event-select option[value="${eventResult.eventId}"]') !== null`,
    "created event option",
  );
  await cdp.eval(
    `document.querySelector('#participant-event-select').value = '${eventResult.eventId}'`,
  );
  await cdp.eval(
    `document.querySelector('#participant-project-form').requestSubmit()`,
  );
  const projectResult = await waitForValue(
    cdp,
    `(() => {
      const projectPath = document.querySelector('#participant-project-result a[href^="/projects/"]')?.getAttribute('href');
      return projectPath ? { projectPath, projectId: projectPath.split('/').pop() } : null;
    })()`,
    "project submission success",
  );

  await cdp.send("Page.navigate", { url: `${webBaseUrl}/organizer/winners` });
  await waitFor(
    cdp,
    "document.querySelector('#organizer-winner-form') !== null",
    "organizer winner form",
  );
  await waitFor(
    cdp,
    `document.querySelector('#winner-event-select option[value="${eventResult.eventId}"]') !== null`,
    "winner event option",
  );
  await cdp.eval(`(() => {
    const eventSelect = document.querySelector('#winner-event-select');
    eventSelect.value = '${eventResult.eventId}';
    eventSelect.dispatchEvent(new Event('change'));
  })()`);
  await waitFor(
    cdp,
    `document.querySelector('#winner-project-select option[value="${projectResult.projectId}"]') !== null`,
    "winner project option",
  );
  await cdp.eval(
    `document.querySelector('#winner-project-select').value = '${projectResult.projectId}'`,
  );
  await cdp.eval(
    `document.querySelector('[name="recipientWalletAddress"]').value = '${session.walletAddress}'`,
  );
  await cdp.eval(`document.querySelector('#organizer-winner-form').requestSubmit()`);
  const winnerResult = await waitForValue(
    cdp,
    `(() => {
      const awardPath = document.querySelector('#organizer-winner-result a[href^="/awards/"]')?.getAttribute('href');
      return awardPath ? { awardPath, awardId: awardPath.split('/').pop() } : null;
    })()`,
    "winner selection success",
  );

  await cdp.send("Page.navigate", {
    url: `${webBaseUrl}${winnerResult.awardPath}`,
  });
  await waitFor(
    cdp,
    "document.querySelector('#award-detail-content')?.innerText.includes('Grand Prize')",
    "award detail",
  );

  const awardBlock = await fetchJson(`${apiBaseUrl}/award-blocks/${winnerResult.awardId}`);
  const member = awardBlock.awardBlock.members[0];

  if (awardBlock.awardBlock.award.title !== "Grand Prize") {
    throw new Error(`Expected Grand Prize, got ${awardBlock.awardBlock.award.title}`);
  }

  if (awardBlock.awardBlock.project.id !== projectResult.projectId) {
    throw new Error("Expected award to reference submitted project");
  }

  if (member?.walletAddress !== session.walletAddress) {
    throw new Error("Expected authenticated wallet session as the recipientWalletAddress");
  }

  console.log(
    JSON.stringify(
      {
        eventPath: eventResult.eventPath,
        projectPath: projectResult.projectPath,
        awardPath: winnerResult.awardPath,
        awardStatus: awardBlock.awardBlock.award.status,
        recipientWalletAddress: member.walletAddress,
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