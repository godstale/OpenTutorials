---
title: "자기 개선형 AI 에이전트인 Hermes Agent의 실무자 가이드 (feat. Blake Crosley)"
type: source
ingest_mode: summary-only
content_type: report
source_file: wiki/originals/hermes-guide-pytorch-kr.md
created_at: 2026-05-25
author: 9bow (Blake Crosley)
team: 
tags: [hermes-agent, guide, korean, architecture, providers]
sources: []
last_updated: 2026-06-14
---

## Purpose
This document is a Korean community guide for practitioners using Hermes Agent, summarizing Blake Crosley's "Reference for Practitioners (2026)". It provides a comprehensive overview of the agent's core concepts and operational best practices.

## Scope
It covers the 5 core systems of Hermes Agent, an overview of updates in v0.14.0, installation methods, and a detailed explanation of the 3 authentication/provider paths (API Key, OAuth, Custom Endpoint).

## Structure
* Hermes Agent 소개 (Introduction)
* Hermes Agent 실무자 가이드: 5가지 핵심 시스템 (5 Core Systems)
* 핵심 요점 한눈에 보기 (Key Takeaways)
* v0.14.0에서 달라진 점 (What's new in v0.14.0)
* 설치: 한 줄로 끝나는 길과 직접 제어하는 길 (Installation)
* 인증 및 프로바이더: 3가지 경로 (Authentication & Providers)

## Key Values
* 5 core systems to understand: Provider Resolution, Config Hierarchy, Tool/Toolset System, Skills System, Gateway/Cron/Profiles.
* 3 authentication paths: .env API key, OAuth via `hermes model`, Custom endpoint.
* Supports local LLM endpoints (Ollama, vLLM, llama.cpp), but models must have a minimum context length of 64K tokens for agent operations.

## How to Use
Load the original file at `wiki/originals/hermes-guide-pytorch-kr.md` for full data.
