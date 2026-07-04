# PointSystem

**Type:** Concept (Business Logic)
**Related:** [[PennyPress]]

---

PennyPress의 과금 시스템.

## 규칙

- 1 포인트 = 1 원
- 현금 충전만 지원 (결제: TossPayments)
- Phase 1에서는 UI stub만 구현

## 과금 모델

| 모델 | 설명 |
|------|------|
| 포인트 구매 | 기능 사용할 때마다 포인트 차감 |
| 구독 | 기간 내 자유 사용 (토큰 사용량 제한) |

## 환불 정책

- 자동 환불 없음
- Admin이 결제 관리 화면에서 수동 처리

## 구현

- Phase 1: UI 구조만 (결제/충전 기능 없음)
- Phase 3: TossPayments 실제 연동
