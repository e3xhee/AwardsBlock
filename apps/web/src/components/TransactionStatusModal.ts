export type TransactionStep = "서명 요청" | "트랜잭션 전송" | "블록 확인 대기" | "완료" | "실패";

export function renderTransactionStatus(step: TransactionStep): string {
  return `<div class="modal-surface" role="status">${step}</div>`;
}
