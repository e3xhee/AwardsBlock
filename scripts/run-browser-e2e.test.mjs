import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("package exposes the browser e2e command", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(
    packageJson.scripts["e2e:browser"],
    "node scripts/run-browser-e2e.mjs",
  );
});

test("browser e2e follows the dashboard-based role flow and uses the authenticated recipient wallet", async () => {
  const script = await readFile("scripts/run-browser-e2e.mjs", "utf8");
  assert.match(script, /\/auth\/session/);
  assert.match(script, /organizer-dashboard-page/);
  assert.match(script, /#organizer-event-form/);
  assert.match(script, /data-organizer-event-id/);
  assert.match(script, /\/participant\/projects/);
  assert.match(script, /data-winner-project-id/);
  assert.match(script, /recipientWalletAddress/);
  assert.doesNotMatch(script, /\/organizer\/events/);
  assert.doesNotMatch(script, /\/organizer\/winners/);
  assert.doesNotMatch(script, /account\.address/);
});

test("browser e2e can be configured by environment variables", async () => {
  const script = await readFile("scripts/run-browser-e2e.mjs", "utf8");
  assert.match(script, /AWARDBLOCK_CHROME_PATH/);
  assert.match(script, /AWARDBLOCK_CDP_PORT/);
  assert.match(script, /AWARDBLOCK_WEB_URL/);
  assert.match(script, /AWARDBLOCK_API_URL/);
  assert.doesNotMatch(
    script,
    /fetch\("http:\/\/localhost:4000\/auth\/session"/,
  );
});

test("env example documents browser e2e overrides", async () => {
  const envExample = await readFile(".env.example", "utf8");
  assert.match(envExample, /AWARDBLOCK_CHROME_PATH=/);
  assert.match(envExample, /AWARDBLOCK_CDP_PORT=/);
  assert.match(envExample, /AWARDBLOCK_WEB_URL=/);
  assert.match(envExample, /AWARDBLOCK_API_URL=/);
});
