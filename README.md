# AwardBlock

AwardBlock은 해커톤, 빌더 프로그램, 데모데이의 수상 결과를 공개 검증 가능한 기록으로 남기고, 수상자가 ERC-20 리워드를 직접 클레임할 수 있게 만드는 Web3 어워드 아카이브입니다.

하나의 수상 기록은 이벤트, 프로젝트, 심사/수상 근거, 수상자 배정, 온체인 트랜잭션, 클레임 이력을 묶은 **Award Block**으로 표시됩니다.

## 주요 흐름

- 주최자는 이벤트, 프로젝트, 어워드, 수상자 배정, 클레임 초대를 생성합니다.
- 어워드는 `createAward`, `setRecipients`, `fundAward`, `finalizeAward` 온체인 단계로 등록됩니다.
- 수상자는 초대 링크로 지갑을 연결하고 `claim` 트랜잭션을 실행합니다.
- 공개 사용자는 홈, 이벤트, 프로젝트, 어워드 상세, 지갑 프로필에서 수상/클레임 이력을 확인합니다.

## 저장소 구조

```text
awardblock/
├─ apps/
│  ├─ web/        # Vite + TypeScript SPA
│  └─ api/        # Express + TypeScript + SQLite REST API
├─ packages/
│  ├─ contracts/  # Foundry 기반 Solidity 컨트랙트
│  └─ shared/     # 공통 타입/스키마/상수
├─ docs/          # 기획/구현 문서
└─ README.md
```

## 기술 스택

- Frontend: Vite, TypeScript, Vanilla CSS, viem
- Backend: Node.js, TypeScript, Express, SQLite, Zod
- Smart Contract: Solidity, Foundry, OpenZeppelin
- Auth: 지갑 서명 기반 인증, HttpOnly 세션 쿠키
- Package Manager: pnpm workspace

## 개발 시작

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test
corepack pnpm lint
```

로컬 개발 서버:

```bash
corepack pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- 기본 SQLite DB: `apps/api/data/awardblock.sqlite`

## 온체인 환경 변수

웹에서 지갑 트랜잭션과 어워드 상세 페이지의 블록 익스플로러 링크를 사용하려면 `.env.example`을 기준으로 `.env.local`을 준비합니다.

```bash
copy .env.example .env.local
```

주요 값:

- `VITE_CHAIN_ID`: 연결할 체인 ID입니다. 로컬 Anvil은 기본값 `31337`을 사용합니다.
- `VITE_RPC_URL`: 웹이 참고하는 RPC URL입니다.
- `VITE_BLOCK_EXPLORER_URL`: 트랜잭션 해시 링크의 기준 URL입니다. 로컬에 익스플로러가 없으면 비워둬도 됩니다.
- `VITE_REGISTRY_CONTRACT_ADDRESS`: `AwardDistributionRegistry` 컨트랙트 주소입니다.
- `VITE_MOCK_USDC_ADDRESS`: 로컬/테스트넷 리워드 토큰 주소입니다.

컨트랙트 배포 후에는 아래 명령으로 루트 `.env.local`과 `apps/web/.env.local`을 함께 동기화할 수 있습니다.

```bash
corepack pnpm contracts:sync-env -- --registry 0x... --mock-usdc 0x... --block-explorer-url https://explorer.sepolia.mantle.xyz
```

E2E 환경 점검:

```bash
corepack pnpm check:e2e
```

로컬 Anvil처럼 블록 익스플로러가 없는 환경에서는 `--block-explorer-url`을 생략하면 트랜잭션 해시가 일반 텍스트로 표시됩니다.

## 데모 데이터

로컬에서 빈 화면 대신 바로 확인 가능한 데모 어워드 데이터를 넣을 수 있습니다.

```bash
corepack pnpm seed:demo
corepack pnpm dev
```

seed 후 확인하기 좋은 경로:

- 홈: `http://localhost:5173/`
- 이벤트: `http://localhost:5173/events/event-1`
- 프로젝트: `http://localhost:5173/projects/project-1`
- 어워드: `http://localhost:5173/awards/award-1`
- 클레임 초대: `http://localhost:5173/claim/demo-claim-token`
- 지갑 프로필: `http://localhost:5173/profile/0x3333333333333333333333333333333333333333`

`seed:demo`는 고정 ID 기반 upsert 방식이라 여러 번 실행해도 같은 데모 데이터가 중복 생성되지 않습니다.

## 컨트랙트

주요 컨트랙트는 `packages/contracts/src/AwardDistributionRegistry.sol`입니다.

주요 함수:

- `createAward`
- `setRecipients`
- `fundAward`
- `finalizeAward`
- `claim`
- `supersedeAward`
- `closeAward`
- `pause`
- `unpause`

Foundry가 설치된 환경에서 별도로 검증합니다.

```bash
corepack pnpm contracts:build
corepack pnpm contracts:test
```

MVP 전체 플로우를 실제 지갑으로 점검할 때는 [MVP E2E 체크리스트](docs/MVP_E2E_CHECKLIST.md)를 따라가면 됩니다.

## 보안 메모

- 개인키와 seed phrase는 저장소에 포함하지 않습니다.
- 실제 자산을 다루는 배포 전에는 컨트랙트와 API 권한 흐름을 별도로 감사해야 합니다.
- ERC-20 금액은 JavaScript `number`가 아니라 최소 단위 문자열과 `bigint` 기준으로 처리합니다.
- 초대 토큰은 원문을 저장하지 않고 해시만 저장합니다.
