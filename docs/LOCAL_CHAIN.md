# Local Chain Setup

AwardBlock uses `AwardDistributionRegistry` and `MockUSDC` for the local ERC-20 demo flow.

## 1. Build contracts

```bash
corepack pnpm contracts:build
```

## 2. Deploy contracts

Deploy `packages/contracts/script/Deploy.s.sol` with your preferred Foundry flow.

After deployment, sync the addresses into the app environment:

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

## 3. Run the local demo

```bash
corepack pnpm seed:demo
corepack pnpm dev
```

Open `http://localhost:5173`.
