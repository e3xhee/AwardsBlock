# AwardBlock 빠른 시작

처음부터 혼자 다시 실행할 때 보는 문서입니다. 클론, 설치, 환경변수, 로컬 실행, 브라우저 E2E 검증 순서로 정리했습니다.

## 1. 준비물

- Node.js 24.x
- Corepack
- Git
- Google Chrome
- 로컬 컨트랙트 배포를 할 경우 Foundry/Anvil

```bash
corepack enable
```

## 2. 레포지토리 받기

```bash
git clone https://github.com/e3xhee/AwardsBlock.git
cd AwardsBlock
corepack pnpm install
```

## 3. 환경변수 파일 만들기

루트와 웹 앱에 같은 예시 파일을 복사합니다.

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

브라우저 E2E를 지갑 확장 프로그램 없이 돌리려면 `apps/web/.env.local`에 개발용 지갑을 설정합니다.

```env
VITE_ENABLE_DEV_WALLET=true
VITE_DEV_WALLET_PRIVATE_KEY=0x...
```

이 값은 Anvil 또는 버려도 되는 테스트 지갑 키만 사용합니다. 실제 자산이 있는 개인키는 절대 넣지 않습니다.

## 4. 컨트랙트 주소 연결

로컬 Anvil 또는 테스트넷에 새로 배포할 때:

```bash
corepack pnpm contracts:deploy
```

이미 배포된 주소가 있다면 직접 동기화합니다.

```bash
corepack pnpm contracts:sync-env -- --registry 0xRegistryAddress --mock-usdc 0xMockUsdcAddress
```

환경변수가 맞는지 확인합니다.

```bash
corepack pnpm check:e2e
```

## 5. 앱 실행

```bash
corepack pnpm seed:demo
corepack pnpm dev
```

브라우저에서 엽니다.

- Web: http://localhost:5173
- API: http://localhost:4000/health

## 6. 브라우저 E2E 검증

개발 서버가 켜진 상태에서 실행합니다.

```bash
corepack pnpm e2e:browser
```

필요하면 실행 환경을 바꿀 수 있습니다.

```bash
AWARDBLOCK_CHROME_PATH=C:/Chrome/chrome.exe
AWARDBLOCK_CDP_PORT=9333
AWARDBLOCK_WEB_URL=http://localhost:5173
AWARDBLOCK_API_URL=http://localhost:4000
```

성공하면 어워드 생성, 수령자 설정, 리워드 예치, 어워드 확정, 클레임, 트랜잭션 기록 검증까지 자동으로 지나갑니다.

## 7. 자주 쓰는 검증 명령

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm lint
```

## 문제가 생겼을 때

- `src refspec main does not match any`: 현재 폴더가 실제 레포지토리인지 확인하고 `git status --short --branch`를 먼저 봅니다.
- `check:e2e`가 실패함: `.env.local`과 `apps/web/.env.local`의 컨트랙트 주소가 같은지 확인합니다.
- 브라우저 E2E가 Chrome을 못 찾음: `AWARDBLOCK_CHROME_PATH`에 Chrome 실행 파일 경로를 넣습니다.
- 트랜잭션이 실패함: Anvil 또는 RPC가 켜져 있는지, `.env.local`의 `VITE_RPC_URL`과 `VITE_CHAIN_ID`가 맞는지 확인합니다.
