import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const contractsRoot = resolve(scriptDir, "..");
const repoRoot = resolve(contractsRoot, "..", "..");
const args = new Set(process.argv.slice(2));

loadEnvFile(resolve(repoRoot, ".env.local"));
loadEnvFile(resolve(repoRoot, ".env"));

const shouldBroadcast = args.has("--broadcast");
const shouldSimulate = args.has("--simulate") || !shouldBroadcast;
const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const privateKey = process.env.PRIVATE_KEY;
const forgeArgs = ["script", "script/Deploy.s.sol", "--sig", "create"];

if (shouldBroadcast) {
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is required for broadcast deployment.");
  }

  forgeArgs.push("--rpc-url", rpcUrl, "--broadcast", "--private-key", privateKey);
}

const forge = resolveForgeExecutable();
const result = spawnSync(forge, forgeArgs, {
  cwd: contractsRoot,
  encoding: "utf8"
});

const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
process.stdout.write(output);

if (result.status !== 0) {
  throw new Error(`forge script failed with exit code ${result.status ?? "unknown"}`);
}

const deployment = parseDeploymentOutput(output);

if (shouldBroadcast) {
  const syncResult = spawnSync(
    process.execPath,
    [
      resolve(scriptDir, "syncDeploymentEnv.mjs"),
      "--registry",
      deployment.registryAddress,
      "--mock-usdc",
      deployment.mockUsdcAddress
    ],
    {
      cwd: contractsRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        RPC_URL: rpcUrl
      }
    }
  );

  process.stdout.write(syncResult.stdout ?? "");
  process.stderr.write(syncResult.stderr ?? "");

  if (syncResult.status !== 0) {
    throw new Error(`deployment env sync failed with exit code ${syncResult.status ?? "unknown"}`);
  }
} else if (shouldSimulate) {
  console.log(
    [
      "",
      "Deployment simulation complete. No transactions were broadcast.",
      `registry=${deployment.registryAddress}`,
      `mockUsdc=${deployment.mockUsdcAddress}`
    ].join("\n")
  );
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function resolveForgeExecutable() {
  if (process.platform === "win32") {
    const bundledForge = resolve(
      contractsRoot,
      "node_modules",
      "@foundry-rs",
      "forge-win32-amd64",
      "bin",
      "forge.exe"
    );

    if (existsSync(bundledForge)) {
      return bundledForge;
    }
  }

  return "forge";
}

function parseDeploymentOutput(output) {
  const registryAddress = findReturnedAddress(output, "registry");
  const mockUsdcAddress = findReturnedAddress(output, "mockUSDC");

  return { registryAddress, mockUsdcAddress };
}

function findReturnedAddress(output, name) {
  const match = output.match(new RegExp(`${name}:\\s+contract\\s+\\S+\\s+(0x[a-fA-F0-9]{40})`));

  if (!match?.[1]) {
    throw new Error(`Could not parse ${name} address from forge script output.`);
  }

  return match[1];
}
