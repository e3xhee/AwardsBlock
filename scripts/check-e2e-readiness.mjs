#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..");

const requiredRootEnv = [
  "CHAIN_ID",
  "RPC_URL",
  "REGISTRY_CONTRACT_ADDRESS",
  "MOCK_USDC_ADDRESS",
];

const requiredWebEnv = [
  "VITE_API_BASE_URL",
  "VITE_CHAIN_ID",
  "VITE_RPC_URL",
  "VITE_REGISTRY_CONTRACT_ADDRESS",
  "VITE_MOCK_USDC_ADDRESS",
];

const matchingEnvPairs = [
  ["CHAIN_ID", "VITE_CHAIN_ID"],
  ["RPC_URL", "VITE_RPC_URL"],
  ["REGISTRY_CONTRACT_ADDRESS", "VITE_REGISTRY_CONTRACT_ADDRESS"],
  ["MOCK_USDC_ADDRESS", "VITE_MOCK_USDC_ADDRESS"],
];

const addressEnvKeys = [
  "REGISTRY_CONTRACT_ADDRESS",
  "MOCK_USDC_ADDRESS",
  "VITE_REGISTRY_CONTRACT_ADDRESS",
  "VITE_MOCK_USDC_ADDRESS",
];

export function checkE2eReadiness({ repoRoot = defaultRepoRoot } = {}) {
  const rootEnvPath = resolve(repoRoot, ".env.local");
  const webEnvPath = resolve(repoRoot, "apps", "web", ".env.local");
  const rootEnv = readEnvFile(rootEnvPath);
  const webEnv = readEnvFile(webEnvPath);
  const combinedEnv = { ...rootEnv.values, ...webEnv.values };
  const errors = [];
  const warnings = [];

  if (!rootEnv.exists) {
    errors.push(`${formatPath(repoRoot, rootEnvPath)} was not found.`);
  }

  if (!webEnv.exists) {
    errors.push(`${formatPath(repoRoot, webEnvPath)} was not found.`);
  }

  for (const key of requiredRootEnv) {
    if (!rootEnv.values[key]) {
      errors.push(
        `${key} is required in ${formatPath(repoRoot, rootEnvPath)}.`,
      );
    }
  }

  for (const key of requiredWebEnv) {
    if (!webEnv.values[key]) {
      errors.push(`${key} is required in ${formatPath(repoRoot, webEnvPath)}.`);
    }
  }

  validateChainId(rootEnv.values.CHAIN_ID, "CHAIN_ID", errors);
  validateChainId(webEnv.values.VITE_CHAIN_ID, "VITE_CHAIN_ID", errors);
  validateUrl(rootEnv.values.RPC_URL, "RPC_URL", errors);
  validateUrl(webEnv.values.VITE_RPC_URL, "VITE_RPC_URL", errors);
  validateUrl(webEnv.values.VITE_API_BASE_URL, "VITE_API_BASE_URL", errors);

  for (const key of addressEnvKeys) {
    validateAddress(combinedEnv[key], key, errors);
  }

  for (const [rootKey, webKey] of matchingEnvPairs) {
    const rootValue = rootEnv.values[rootKey];
    const webValue = webEnv.values[webKey];

    if (rootValue && webValue && rootValue !== webValue) {
      errors.push(`${rootKey} and ${webKey} must match.`);
    }
  }

  if (!combinedEnv.VITE_BLOCK_EXPLORER_URL && !combinedEnv.BLOCK_EXPLORER_URL) {
    warnings.push(
      "VITE_BLOCK_EXPLORER_URL is empty. Tx hashes will render without explorer links.",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    rootEnvPath,
    webEnvPath,
  };
}

export function formatReadinessReport(report) {
  const lines = [
    report.ok ? "E2E readiness check passed." : "E2E readiness check failed.",
  ];

  if (report.errors.length > 0) {
    lines.push("", "Errors:");
    lines.push(...report.errors.map((error) => `- ${error}`));
  }

  if (report.warnings.length > 0) {
    lines.push("", "Warnings:");
    lines.push(...report.warnings.map((warning) => `- ${warning}`));
  }

  if (report.ok) {
    lines.push("", "Next commands:");
    lines.push("- corepack pnpm seed:demo");
    lines.push("- corepack pnpm dev");
    lines.push("- Open http://localhost:5173/organizer");
  }

  return lines.join("\n");
}

function readEnvFile(path) {
  if (!existsSync(path)) {
    return { exists: false, values: {} };
  }

  const values = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values[key] = stripQuotes(value);
  }

  return { exists: true, values };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function validateChainId(value, key, errors) {
  if (!value) return;

  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    errors.push(`${key} must be a positive numeric chain id.`);
  }
}

function validateUrl(value, key, errors) {
  if (!value) return;

  try {
    new URL(value);
  } catch {
    errors.push(`${key} must be a valid URL.`);
  }
}

function validateAddress(value, key, errors) {
  if (!value) return;

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    errors.push(`${key} must be an EVM address.`);
  }
}

function formatPath(repoRoot, path) {
  const pathValue = relative(repoRoot, path) || path;
  return pathValue.replace(/\\/g, "/");
}

function isCliEntryPoint() {
  if (!process.argv[1]) return false;
  return fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isCliEntryPoint()) {
  const report = checkE2eReadiness();
  console.log(formatReadinessReport(report));
  process.exitCode = report.ok ? 0 : 1;
}
