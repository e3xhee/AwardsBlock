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
test("browser e2e uses the authenticated wallet session as the recipient", async () => {
  const script = await readFile("scripts/run-browser-e2e.mjs", "utf8");
  assert.match(script, /\/auth\/session/);
  assert.match(script, /recipientWalletAddress/);
  assert.doesNotMatch(script, /account\.address/);
});
