---
title: Hermes Dashboard API
type: concept
aliases: [Dashboard API, Hermes 설정 API]
created_at: 2026-06-21
---

# Hermes Dashboard API

Hermes Agent의 시스템 설정, 프로필 생성, 모델 변경, Cron 등록 등을 담당하는 Web UI 기반의 관리 API입니다.

## 핵심 개념
- 기본적으로 9120 포트를 사용하며, 기본 바인딩(127.0.0.1)에서는 **세션 토큰(Session Token) 인증**을 통해 요청을 제어합니다.
- PennyPress와 같은 외부 서비스에서 Hermes 에이전트를 프로그래매틱하게 설정/구동하려면 API Server(8642)가 아닌 Dashboard API(9120)를 통해 제어해야 합니다.
- Dashboard는 CORS 제한이 로컬호스트로 한정되어 있어, 외부 서버에서 연동할 때는 Nginx 리버스 프록시와 결합하여 호출합니다.

## 연관 요소
- **[[PennyPress]]**: 이 API를 활용하여 사용자가 요청한 에이전트 프로필 및 구성을 원격 셋업.
- **[[HermesAgent]]**: 시스템 본체.
- **[[ExternalHermesAgent]]**: 외부 에이전트 인스턴스 연동 아키텍처.
