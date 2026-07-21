import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  checkE2eReadiness,
  formatReadinessReport,
} from "./check-e2e-readiness.mjs";

const validAddressA = "0x1111111111111111111111111111111111111111";
const validAddressB = "0x2222222222222222222222222222222222222222";

test("checkE2eReadiness passes when root and web env files are synced", async () => {
  const repoRoot = await createRepoEnv({
    rootEnv: [
      "CHAIN_ID=31337",
      "RPC_URL=http://127.0.0.1:8545",
      `REGISTRY_CONTRACT_ADDRESS=${validAddressA}`,
      `MOCK_USDC_ADDRESS=${validAddressB}`,
    ],
    webEnv: [
      "VITE_API_BASE_URL=http://localhost:4000",
      "VITE_CHAIN_ID=31337",
      "VITE_RPC_URL=http://127.0.0.1:8545",
      `VITE_REGISTRY_CONTRACT_ADDRESS=${validAddressA}`,
      `VITE_MOCK_USDC_ADDRESS=${validAddressB}`,
    ],
  });

  try {
    const report = checkE2eReadiness({ repoRoot });

    assert.equal(report.ok, true);
    assert.deepEqual(report.errors, []);
    assert.match(formatReadinessReport(report), /E2E readiness check passed/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("checkE2eReadiness reports missing env files and required values", () => {
  const report = checkE2eReadiness({
    repoRoot: join(tmpdir(), "missing-awardblock-env"),
  });

  assert.equal(report.ok, false);
  assert.match(formatReadinessReport(report), /\.env\.local was not found/);
  assert.match(
    formatReadinessReport(report),
    /apps\/web\/\.env\.local was not found/,
  );
});

test("checkE2eReadiness reports mismatched deployment values", async () => {
  const repoRoot = await createRepoEnv({
    rootEnv: [
      "CHAIN_ID=31337",
      "RPC_URL=http://127.0.0.1:8545",
      `REGISTRY_CONTRACT_ADDRESS=${validAddressA}`,
      `MOCK_USDC_ADDRESS=${validAddressB}`,
    ],
    webEnv: [
      "VITE_API_BASE_URL=http://localhost:4000",
      "VITE_CHAIN_ID=5003",
      "VITE_RPC_URL=http://127.0.0.1:8545",
      `VITE_REGISTRY_CONTRACT_ADDRESS=${validAddressB}`,
      `VITE_MOCK_USDC_ADDRESS=${validAddressA}`,
    ],
  });

  try {
    const report = checkE2eReadiness({ repoRoot });
    const formatted = formatReadinessReport(report);

    assert.equal(report.ok, false);
    assert.match(formatted, /CHAIN_ID and VITE_CHAIN_ID must match/);
    assert.match(
      formatted,
      /REGISTRY_CONTRACT_ADDRESS and VITE_REGISTRY_CONTRACT_ADDRESS must match/,
    );
    assert.match(
      formatted,
      /MOCK_USDC_ADDRESS and VITE_MOCK_USDC_ADDRESS must match/,
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

async function createRepoEnv({ rootEnv, webEnv }) {
  const repoRoot = await mkdtemp(join(tmpdir(), "awardblock-e2e-"));
  const webRoot = join(repoRoot, "apps", "web");

  await mkdir(webRoot, { recursive: true });
  await writeFile(join(repoRoot, ".env.local"), `${rootEnv.join("\n")}\n`);
  await writeFile(join(webRoot, ".env.local"), `${webEnv.join("\n")}\n`);

  return repoRoot;
}
