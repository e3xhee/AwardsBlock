# Local Chain Setup

AwardBlock uses `AwardDistributionRegistry` and `MockUSDC` for the local ERC-20 demo flow.

## 1. Build contracts

```bash
corepack pnpm contracts:build
```

## 2. Deploy contracts

You can first verify the deploy script without broadcasting:

```bash
corepack pnpm contracts:deploy:simulate
```

For a real deployment, run a local RPC such as Anvil or use a testnet RPC, then set `RPC_URL` and `PRIVATE_KEY` in `.env.local`.

```bash
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x...
```

Then deploy and sync app env files:

```bash
corepack pnpm contracts:deploy
```

If contracts are already deployed, sync the addresses directly:

```bash
corepack pnpm contracts:sync-env -- --registry 0xRegistryAddress --mock-usdc 0xMockUsdcAddress
```

If you have a Foundry broadcast file, the script can read it:

```bash
corepack pnpm contracts:sync-env -- --broadcast packages/contracts/broadcast/Deploy.s.sol/31337/run-latest.json
```

The command writes:

- `.env.local`
- `apps/web/.env.local`

The web app reads `VITE_REGISTRY_CONTRACT_ADDRESS` for registry writes and `VITE_MOCK_USDC_ADDRESS` as the organizer form default reward token address.

Before running the browser flow, check that the root and web env files are synced:

```bash
corepack pnpm check:e2e
```

For browser-only local E2E without a wallet extension, enable the dev wallet in `apps/web/.env.local`. Use only an Anvil or test private key.

```env
VITE_ENABLE_DEV_WALLET=true
VITE_DEV_WALLET_PRIVATE_KEY=0x...
```

## 3. Run the local demo

```bash
corepack pnpm seed:demo
corepack pnpm dev
```

Open `http://localhost:5173`.
