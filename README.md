# AwardsBlock

AwardBlock은 해커톤, 공모전, 빌더 프로그램의 공식 수상 결과를 검증 가능한 기록으로 남기고, 수상자가 ERC-20 상금을 직접 Claim할 수 있게 만드는 Web3 수상 아카이브 플랫폼입니다.

수상 기록 하나는 사용자 화면에서 **Award Block** 카드로 표현됩니다. 다만 기술적으로 수상 기록 하나가 블록체인의 개별 블록이 된다는 뜻은 아닙니다. Award Block은 온체인 수상 기록, 트랜잭션, 이벤트 로그, ERC-20 Claim 내역, 오프체인 메타데이터, 메타데이터 해시 검증 결과를 하나로 묶어 보여주는 서비스 단위입니다.

## 왜 필요한가

해커톤 수상 정보는 보통 행사 SNS, 홈페이지, 상장 이미지, 프로젝트 GitHub, 개인 포트폴리오, 운영자 스프레드시트에 흩어져 있습니다. 시간이 지나면 공지나 링크가 사라지고, 실제 수상자와 팀원, 상금 지급 여부를 확인하기 어려워집니다.

AwardBlock은 다음 정보를 하나의 공개 기록으로 연결합니다.

- 어떤 행사에서 어떤 프로젝트가 수상했는지
- 어떤 운영자 지갑이 수상 결과를 확정했는지
- 누가 팀원으로 참여했고 어떤 금액을 배정받았는지
- ERC-20 상금이 실제로 예치되고 Claim 되었는지
- 현재 메타데이터가 온체인에 기록된 해시와 일치하는지

블록체인에 기록됐다는 사실만으로 수상 내용이 자동으로 진실이 되는 것은 아닙니다. AwardBlock은 “누가 어떤 기록을 확정했고, 그 이후 변경되지 않았는지”를 검증 가능하게 보여주는 데 집중합니다.

## 주요 사용자

### 운영자

해커톤이나 공모전 운영자는 행사를 만들고, 프로젝트와 수상 결과를 등록하며, 팀원별 상금 배정과 초대 링크를 관리합니다. 모든 팀원이 지갑을 등록하면 운영자는 ERC-20 상금을 예치하고 수상 결과를 온체인에 확정합니다.

### 수상자

수상자는 운영자가 전달한 초대 링크로 접속해 자신의 지갑을 연결하고, 배정된 상금을 직접 Claim합니다. Claim 이후에는 자신의 지갑 프로필에서 검증 가능한 수상 이력을 확인할 수 있습니다.

### 일반 조회자

로그인하지 않은 사용자도 공개 Award Block, 행사, 프로젝트, 지갑 프로필을 조회할 수 있습니다. 트랜잭션 링크와 메타데이터 검증 결과도 함께 확인할 수 있습니다.

## 핵심 기능

- 지갑 서명 기반 로그인
- 행사 생성 및 공개 행사 페이지
- 프로젝트 등록 및 공개 프로젝트 페이지
- 수상 결과 작성
- 수상자별 초대 링크 생성
- 초대 코드 해시 저장 및 1회 사용 처리
- 수상자 지갑 등록
- ERC-20 상금 예치
- 온체인 수상 결과 확정
- 수상자별 ERC-20 Claim
- 중복 Claim 방지
- Award Block 공개 상세 페이지
- 지갑별 수상 이력 페이지
- 메타데이터 JSON 생성 및 SHA-256 해시 검증
- 잘못된 기록을 삭제하지 않고 새 Award로 정정 연결

## MVP 범위

MVP는 하나의 EVM 네트워크와 하나의 ERC-20 토큰 지급 흐름을 기준으로 합니다. 로컬 개발과 테스트넷 검증을 위해 `MockUSDC` 테스트 토큰을 사용합니다.

MVP에 포함하지 않는 기능은 NFT/Soulbound Token 발급, 다중 체인 지원, 크로스체인 지급, 법정화폐 결제, KYC, 이메일 자동 발송, 소셜 로그인, 심사위원 투표, IPFS 업로드, 가스비 대납, 모바일 앱입니다.

## 시스템 구성

예정된 구조는 다음과 같습니다.

```text
awardblock/
├─ apps/
│  ├─ web/        # Vite + TypeScript + Vanilla CSS SPA
│  └─ api/        # Express + TypeScript + SQLite REST API
├─ packages/
│  ├─ contracts/  # Foundry 기반 Solidity 스마트 컨트랙트
│  └─ shared/     # 공통 타입, 스키마, ABI, 상수
├─ docs/          # 제품 명세와 구현 계획
└─ README.md
```

## 기술 스택

- Frontend: Vite, TypeScript, Vanilla CSS, viem
- Backend: Node.js, TypeScript, Express, SQLite, Zod
- Smart Contract: Solidity, Foundry, OpenZeppelin
- Auth: 지갑 서명 기반 인증, HttpOnly 세션 쿠키
- Package Management: pnpm workspace

## 개발 시작

Node.js와 Corepack이 필요합니다. pnpm은 `packageManager` 설정을 기준으로 Corepack이 실행합니다.

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test
corepack pnpm lint
```

기본 `build`, `test`, `lint` 명령은 `apps/web`, `apps/api`, `packages/shared`를 검증합니다.

스마트 컨트랙트는 Foundry가 설치된 환경에서 별도로 검증합니다.

```bash
corepack pnpm contracts:build
corepack pnpm contracts:test
```

Foundry가 설치되어 있지 않으면 `forge` 명령을 찾을 수 없다는 오류가 발생합니다. 컨트랙트 구현 단계에 들어가기 전에 Foundry를 설치하고 PATH에 `forge`가 잡히는지 확인해야 합니다.

## 스마트 컨트랙트 개요

핵심 컨트랙트는 `AwardDistributionRegistry.sol`입니다. MVP에서는 수상 기록 등록, 수상자별 배정, ERC-20 상금 예치, 결과 확정, Claim, 정정 기록 연결, 잔여 금액 회수를 하나의 흐름으로 관리합니다.

주요 함수는 다음과 같습니다.

- `createAward`
- `setRecipients`
- `fundAward`
- `finalizeAward`
- `claim`
- `supersedeAward`
- `closeAward`
- `pause`
- `unpause`

ERC-20 전송은 OpenZeppelin `SafeERC20`을 사용하며, 재진입 공격 방지, 일시 정지, 권한 제어를 포함합니다.

## 데이터 저장 방식

긴 텍스트와 이미지는 블록체인에 직접 저장하지 않습니다. 블록체인에는 식별자, 운영자 주소, 토큰 주소, 금액, Claim 기간, 메타데이터 URI, 메타데이터 해시, 수상자별 배정액, 상태 변경 이벤트만 기록합니다.

행사 설명, 프로젝트 설명, 수상 사유, 공개 팀원 이름, GitHub 링크, 데모 링크 같은 정보는 오프체인 메타데이터로 저장합니다. 서버는 정규화된 JSON을 생성하고 SHA-256 해시를 계산해 온체인 `metadataHash`와 비교합니다.

## 현재 상태

현재 저장소는 Phase 1 기반 구성 단계입니다. pnpm workspace, Vite 프론트엔드, Express API, SQLite용 API 구조, Foundry 컨트랙트 패키지, shared 타입/스키마 패키지가 생성되어 있습니다.

앱/API/shared의 기본 빌드와 타입 체크가 통과하며, 컨트랙트 빌드와 테스트도 Foundry 환경에서 검증합니다.

## 보안 원칙

- 개인키, 시드 구문, API 키는 코드나 Git에 포함하지 않습니다.
- 모든 환경변수는 `.env.example`에 문서화합니다.
- ERC-20 금액은 JavaScript `number`로 계산하지 않고 최소 단위 정수 문자열과 `bigint`를 사용합니다.
- 초대 코드 원문은 저장하지 않고 해시만 저장합니다.
- 실제 자산을 사용하는 배포 전에는 별도의 보안 감사를 전제로 합니다.
