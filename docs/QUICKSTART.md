# AwardBlock Quickstart

This guide is for a fresh machine setup: clone, install, configure env files, run the app, and verify the browser E2E flow.

## 1. Prerequisites

- Node.js 24.x
- Corepack enabled
- Git
- Google Chrome, or set AWARDBLOCK_CHROME_PATH for another Chromium binary
- Foundry/Anvil when deploying or testing local contracts

```bash
corepack enable
```

## 2. Clone and Install

```bash
git clone https://github.com/e3xhee/AwardsBlock.git
cd AwardsBlock
corepack pnpm install
```

## 3. Create Env Files

Copy the example env file to the root and web app env files.

PowerShell:

```powershell
Copy-Item .env.example .env.local
Copy-Item .env.example apps/web/.env.local
```

Bash:

```bash
cp .env.example .env.local
cp .env.example apps/web/.env.local
```

For local browser E2E without a wallet extension, set these in apps/web/.env.local:

```env
VITE_ENABLE_DEV_WALLET=true
VITE_DEV_WALLET_PRIVATE_KEY=0x...
```

Use only Anvil or throwaway test private keys. Never commit real private keys.

## 4. Configure Contracts

For local Anvil or testnet deployments, deploy and sync addresses:

```bash
corepack pnpm contracts:deploy
```

If contracts are already deployed, sync addresses directly:

```bash
corepack pnpm contracts:sync-env -- --registry 0xRegistryAddress --mock-usdc 0xMockUsdcAddress
```

Then verify env consistency:

```bash
corepack pnpm check:e2e
```

## 5. Run the App

```bash
corepack pnpm seed:demo
corepack pnpm dev
```

Open:

- Web: http://localhost:5173
- API: http://localhost:4000/health

## 6. Verify Browser E2E

With the dev server running:

```bash
corepack pnpm e2e:browser
```

Optional overrides:

```bash
AWARDBLOCK_CHROME_PATH=C:/Chrome/chrome.exe
AWARDBLOCK_CDP_PORT=9333
AWARDBLOCK_WEB_URL=http://localhost:5173
AWARDBLOCK_API_URL=http://localhost:4000
```

A successful run creates an award, sets recipients, funds, finalizes, claims, and verifies the transaction record sequence.

## 7. Routine Checks

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm lint
```
