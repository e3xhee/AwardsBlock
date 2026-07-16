# AwardBlock Implementation Plan

## Phase 1. Project Foundation

- pnpm workspace 구성
- Vite + TypeScript 프론트엔드 앱 생성
- Express + TypeScript API 앱 생성
- SQLite 마이그레이션 파일 생성
- Foundry 컨트랙트 패키지 생성
- shared 타입, 스키마, 상수 패키지 생성
- 환경변수 예시와 기본 README 정리

## Phase 2. Smart Contracts

- MockUSDC 구현
- AwardDistributionRegistry 구현
- 수상 생성, 수상자 배정, 예치, 확정, Claim, 정정, 종료 테스트 작성
- 로컬 체인 배포 스크립트 작성
- ABI를 shared 패키지로 복사하는 스크립트 작성

## Phase 3. Auth and Database

- SQLite 연결과 마이그레이션 실행 흐름 구현
- nonce 발급과 지갑 서명 검증 구현
- HttpOnly 세션 쿠키 구현
- 운영자 권한 검증 미들웨어 구현
- 행사, 프로젝트, 수상 CRUD API 구현

## Phase 4. Organizer Flow

- 지갑 연결 UI
- 운영자 로그인
- 행사 생성 화면
- 프로젝트 등록 화면
- 수상 결과 작성 화면
- 수상자와 배정 금액 입력
- 초대 링크 생성과 지갑 등록 상태 확인

## Phase 5. Onchain Finalization

- 토큰 잔액과 allowance 조회
- approve, fundAward, setRecipients, finalizeAward 실행
- 트랜잭션 상태 UI 구현
- 트랜잭션 해시 저장

## Phase 6. Claim

- 초대 링크 페이지 구현
- 수상자 지갑 등록
- 개인별 배정액 조회
- Claim 가능 여부 계산
- Claim 실행과 중복 Claim 차단
- Claim 완료 내역 저장

## Phase 7. Public Archive

- 홈, 행사 상세, 프로젝트 상세, Award Block 상세, 지갑 프로필 페이지 구현
- 트랜잭션 링크 표시
- 메타데이터 검증 상태 표시

## Phase 8. Corrections and Closing

- Superseded 상태 처리
- 기존 기록과 새 기록 연결
- Claim 종료와 미수령 잔액 회수
- 변경 이력 표시

## Phase 9. Verification

- 전체 테스트 실행
- 빌드 실행
- 로컬 E2E 시나리오 검증
- 반응형 화면 확인
- 오류 메시지 검수
- 로컬 실행 및 테스트넷 배포 문서 정리
