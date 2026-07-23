# MVP E2E Checklist

이 문서는 AwardBlock을 데모 가능한 MVP 상태로 확인하기 위한 실제 실행 체크리스트다.

## 1. 사전 준비

- Node.js와 pnpm workspace가 동작해야 한다.
- Foundry `forge`와 로컬 체인 RPC가 필요하다.
- 로컬 체인은 Anvil 기준 `http://127.0.0.1:8545`, Chain ID `31337`을 사용한다.
- 브라우저 지갑은 로컬 체인에 연결되어 있어야 한다.
- 주최자 지갑에는 로컬 체인 native token이 있어야 한다.

## 2. 컨트랙트 빌드와 배포

컨트랙트 빌드와 배포 스크립트 시뮬레이션을 먼저 확인한다.

```bash
corepack pnpm contracts:build
corepack pnpm contracts:deploy:simulate
```

로컬 체인 RPC를 실행한 뒤 `.env.local`에 배포 계정 개인키를 넣는다.

```env
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x...
```

실제 배포와 환경 동기화를 실행한다.

```bash
corepack pnpm contracts:deploy
```

배포가 끝나면 아래 파일에 같은 주소가 반영되어야 한다.

- `.env.local`
- `apps/web/.env.local`

필수 확인값:

- `VITE_CHAIN_ID`
- `VITE_RPC_URL`
- `VITE_REGISTRY_CONTRACT_ADDRESS`
- `VITE_MOCK_USDC_ADDRESS`
- `REGISTRY_CONTRACT_ADDRESS`
- `MOCK_USDC_ADDRESS`

E2E 환경 점검:

```bash
corepack pnpm check:e2e
```

?? ?????? ?? ?? ?? UI/API ??? ?? ????? `apps/web/.env.local`? ?? ?? ????. ?? ??? ?? private key? ?? ???? ???.

```env
VITE_ENABLE_DEV_WALLET=true
VITE_DEV_WALLET_PRIVATE_KEY=0x...
```

## 3. 앱 실행

데모 데이터를 넣고 웹/API 서버를 실행한다.

```bash
corepack pnpm seed:demo
corepack pnpm dev
```

확인 URL:

- Web: `http://localhost:5173`
- API health: `http://localhost:4000/health`
- 어워드 상세: `http://localhost:5173/awards/award-1`

## 4. 주최자 플로우

1. 브라우저 지갑을 로컬 체인에 연결한다.
2. 주최자 지갑으로 로그인한다.
3. `/organizer`에서 어워드 설정 폼을 제출한다.
4. 지갑에서 `createAward` 트랜잭션을 승인한다.
5. 이어서 `setRecipients` 트랜잭션을 승인한다.
6. 성공 화면에서 `Contract Award ID`, `Create Tx`, 클레임 초대 링크가 표시되는지 확인한다.
7. 생성된 어워드 상세 페이지에서 상태가 `예치 대기`로 표시되는지 확인한다.
8. 트랜잭션 목록에 `어워드 등록`, `수신자 설정`이 순서대로 표시되는지 확인한다.

## 5. 펀딩과 확정 플로우

1. 어워드 상세 페이지에서 `토큰 승인`을 실행한다.
2. 지갑에서 MockUSDC `approve` 트랜잭션을 승인한다.
3. `리워드 예치`를 실행한다.
4. 지갑에서 `fundAward` 트랜잭션을 승인한다.
5. 상태가 `예치 완료`로 바뀌는지 확인한다.
6. `어워드 확정`을 실행한다.
7. 지갑에서 `finalizeAward` 트랜잭션을 승인한다.
8. 상태가 `클레임 진행 중`으로 바뀌는지 확인한다.

## 6. 수상자 클레임 플로우

1. 주최자 성공 화면 또는 데모 데이터의 클레임 초대 링크를 연다.
2. 수상자 지갑을 연결한다.
3. 초대 토큰으로 수상자 지갑 연결을 완료한다.
4. 클레임 가능 금액과 어워드 정보를 확인한다.
5. `claim` 트랜잭션을 승인한다.
6. 수상자 상태가 `클레임 완료`로 바뀌는지 확인한다.
7. 지갑 프로필에서 클레임 이력이 보이는지 확인한다.

## 7. 공개 조회 검증

아래 화면에서 같은 어워드 정보가 일관되게 보이는지 확인한다.

- 홈 최신 어워드 블록
- 이벤트 상세
- 프로젝트 상세
- 어워드 상세
- 수상자 지갑 프로필

트랜잭션 검증:

- `AwardRegistered`는 `어워드 등록`으로 보인다.
- `RecipientsSet`은 `수신자 설정`으로 보인다.
- `AwardFunded`는 `리워드 예치`로 보인다.
- `AwardFinalized`는 `어워드 확정`으로 보인다.
- `AwardClaimed`는 `리워드 클레임`으로 보인다.
- `VITE_BLOCK_EXPLORER_URL`이 있으면 tx 해시는 새 탭 링크로 열린다.

## 8. 완료 기준

MVP E2E 완료는 아래 조건을 모두 만족할 때로 본다.

- 로컬 또는 테스트넷에 Registry와 MockUSDC가 실제 배포되어 있다.
- 앱 환경 변수는 실제 배포 주소를 사용한다.
- 주최자 생성 플로우가 `createAward`와 `setRecipients`를 모두 성공시킨다.
- 펀딩과 확정 트랜잭션이 성공한다.
- 수상자 클레임 트랜잭션이 성공한다.
- 어워드 상세와 프로필에서 트랜잭션 이력이 확인된다.
- `corepack pnpm test`, `corepack pnpm build`, `corepack pnpm lint`가 통과한다.
