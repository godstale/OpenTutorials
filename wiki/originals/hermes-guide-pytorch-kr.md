[메인 콘텐츠로 건너뛰기](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335#main-container)

# [자기 개선형 AI 에이전트인 Hermes Agent의 실무자 가이드 (feat. Blake Crosley)](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335)

[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14)

- [llm](https://discuss.pytorch.kr/tag/llm/162),
- [opensource](https://discuss.pytorch.kr/tag/opensource/395),
- [ai-agent](https://discuss.pytorch.kr/tag/ai-agent/3012),
- [mcp](https://discuss.pytorch.kr/tag/mcp/5435),
- [guide](https://discuss.pytorch.kr/tag/guide/459),
- [hermes-agent](https://discuss.pytorch.kr/tag/hermes-agent/6801),
- [nous-research](https://discuss.pytorch.kr/tag/nous-research/3573)

**0** 개의 개시물을 선택했습니다.

[전체 선택](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335)

[선택을 취소](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335)

[5월 25](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335/1 "첫 번째 게시물로 이동")

1 / 1


5월 26


[19일 전 전](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335/1)

## post by 9bow 5월 25

[![](https://discuss.pytorch.kr/user_avatar/discuss.pytorch.kr/9bow/48/16301_2.png)](https://discuss.pytorch.kr/u/9bow)

[9bow](https://discuss.pytorch.kr/u/9bow)[박정환](https://discuss.pytorch.kr/u/9bow)

1

[19일 전](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335 "게시 일자")

[![자기 개선형 AI 에이전트인 Hermes Agent 사용을 위한 실무자 가이드](https://discuss.pytorch.kr/uploads/default/original/3X/3/4/340162c058983b392e8e083d9d84fbe5575177e9.jpeg)\\
자기 개선형 AI 에이전트인 Hermes Agent 사용을 위한 실무자 가이드1028×487 107 KB](https://discuss.pytorch.kr/uploads/default/original/3X/3/4/340162c058983b392e8e083d9d84fbe5575177e9.jpeg "자기 개선형 AI 에이전트인 Hermes Agent 사용을 위한 실무자 가이드")

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-hermes-agent-1) Hermes Agent 소개

지난 2년간 LLM 기반 에이전트 도구는 폭발적으로 늘어났지만, 대부분은 특정 벤더의 모델과 인프라에 강하게 결합되어 있습니다. [Claude Code](https://www.anthropic.com/claude-code?utm_source=pytorchkr&ref=pytorchkr) 는 Anthropic 모델에, [Codex CLI](https://github.com/openai/codex?utm_source=pytorchkr&ref=pytorchkr) 는 OpenAI에, [Gemini CLI](https://github.com/google-gemini/gemini-cli?utm_source=pytorchkr&ref=pytorchkr) 는 Google에 각각 고정되어 있어, 사용자는 한 도구로 모든 작업을 묶을지 아니면 여러 도구를 병행하며 컨텍스트와 메모리가 단절되는 비용을 감수할지 사이에서 선택해야 했습니다. 이러한 단절은 단순한 불편을 넘어, 에이전트가 사용할수록 똑똑해지는 _learning-by-doing_ 효과를 사실상 사라지게 만듭니다.

**Hermes Agent** 는 [Nous Research](https://nousresearch.com/?utm_source=pytorchkr&ref=pytorchkr) 가 만든 오픈소스 자기 개선형 AI 에이전트로, 이 결합을 풀어내는 것을 목표로 합니다. CLI로 실행되면서 동시에 멀티 플랫폼 메시징 게이트웨이로도 작동하고, 디스크에 오래 유지되는 정체성(identity)과 지속 메모리(persistent memory)를 저장하며, 사용할수록 개선되는 스킬(skill)을 모으고, OpenAI와 호환되는 어떤 LLM 프로바이더와도 함께 사용할 수 있습니다. [Nous Portal](https://portal.nousresearch.com/?utm_source=pytorchkr&ref=pytorchkr), [OpenRouter](https://openrouter.ai/?utm_source=pytorchkr&ref=pytorchkr), [Anthropic](https://www.anthropic.com/?utm_source=pytorchkr&ref=pytorchkr), [GitHub Copilot](https://github.com/features/copilot?utm_source=pytorchkr&ref=pytorchkr), [z.ai](https://z.ai/?utm_source=pytorchkr&ref=pytorchkr), [Kimi](https://www.kimi.com/?utm_source=pytorchkr&ref=pytorchkr), [MiniMax](https://www.minimax.io/?utm_source=pytorchkr&ref=pytorchkr), [DeepSeek](https://www.deepseek.com/?utm_source=pytorchkr&ref=pytorchkr), [Qwen Cloud](https://qwenlm.github.io/?utm_source=pytorchkr&ref=pytorchkr), [Hugging Face](https://huggingface.co/?utm_source=pytorchkr&ref=pytorchkr), [Google](https://ai.google.dev/?utm_source=pytorchkr&ref=pytorchkr), [xAI/SuperGrok](https://x.ai/?utm_source=pytorchkr&ref=pytorchkr), 또는 직접 self-hosted 엔드포인트까지 모두 한 도구에서 다룰 수 있다는 점이 핵심 차별점입니다.

이 글은 [Blake Crosley](https://blakecrosley.com/?utm_source=pytorchkr&ref=pytorchkr) 가 정리한 _"Hermes Agent: 실무자를 위한 레퍼런스 (2026)"_ 를 바탕으로, 2026년 5월 16일 출시된 v0.14.0 기준의 Hermes 동작 원리를 가능한 한 자기완결적으로 풀어 정리한 자료입니다. _Hermes Agent는 chat wrapper가 아니라 완전한 agent runtime으로 작동합니다_ — 파일 시스템을 읽고, sandboxed 백엔드에서 명령을 실행하고, 웹을 스크랩하고, subagent를 생성하고, 예약 cron job을 실행하며, 단일 게이트웨이 프로세스에서 [Telegram](https://telegram.org/?utm_source=pytorchkr&ref=pytorchkr) / [Discord](https://discord.com/?utm_source=pytorchkr&ref=pytorchkr) / [Slack](https://slack.com/?utm_source=pytorchkr&ref=pytorchkr) / [WhatsApp](https://www.whatsapp.com/?utm_source=pytorchkr&ref=pytorchkr) / [Signal](https://signal.org/?utm_source=pytorchkr&ref=pytorchkr) / Email과 대화하고, 경험을 바탕으로 자체 스킬을 만듭니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-hermes-agent-5-2) Hermes Agent 실무자 가이드: 5가지 핵심 시스템

[![Hermes Agent 실무자 가이드 소개](https://discuss.pytorch.kr/uploads/default/optimized/3X/a/6/a6b7c19825c0cb96825fe0bf55dfb7193de23080_2_1028x538.jpeg)\\
Hermes Agent 실무자 가이드 소개1733×908 284 KB](https://discuss.pytorch.kr/uploads/default/original/3X/a/6/a6b7c19825c0cb96825fe0bf55dfb7193de23080.jpeg "Hermes Agent 실무자 가이드 소개")

**Hermes Agent 실무자 가이드** 의 저자인 Blake Crosley는 _"가볍게 쓰는 Hermes와 전문가 수준으로 쓰는 Hermes의 차이는 5가지 시스템을 얼마나 이해하느냐에 달려 있다"_ 고 단언합니다. 이 다섯 가지를 머릿속에 정리해 두면, 이후의 모든 설정 항목이 _"이 노브는 어느 시스템의 어떤 단계를 조절하는가"_ 라는 한 줄로 환원됩니다. 단순히 명령어를 외우는 대신 시스템 단위로 사고하는 것이 Hermes를 익히는 가장 빠른 길입니다.

**1\. 프로바이더 해소(Provider Resolution)**: 인증 흐름이 실제 API 호출에 매핑되는 방식입니다. Hermes의 모든 동작은 _"어떤 프로바이더가 resolve되었는가"_ 에 따라 달라지므로, 가장 먼저 익혀야 할 부분입니다.

**2\. 설정 계층(Configuration Hierarchy)**: `config.yaml`, `.env`, `auth.json`, `SOUL.md`, `AGENTS.md`로 분산된 설정 표면을 어떻게 조합하는지 이해해야 합니다.

**3\. 도구 및 도구셋 시스템(Tool + Toolset System)**: 에이전트가 무엇을 할 수 있는지, 그리고 플랫폼별로 어떻게 제한되는지를 결정하는 핵심 메커니즘입니다.

**4\. 스킬 시스템(Skills System)**: 에이전트가 직접 만들고 발전시키는 절차적 메모리(procedural memory)로, Hermes가 사용할수록 똑똑해지는 비결입니다.

**5\. 게이트웨이, 크론, 프로파일(Gateway + Cron + Profiles)**: 단순한 터미널 도구가 아니라 일상의 메시징 환경에서 살아 있는 에이전트로 만드는 운영 레이어입니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-3) 핵심 요점 한눈에 보기

본격적인 섹션 전에, 신규 사용자가 가장 많이 부딪히는 함정 다섯 가지를 먼저 정리합니다. 원문에서도 _"이 5가지를 모르면 Hermes는 조용히 성능이 저하된 채 작동한다"_ 고 강조하는 부분입니다.

- **인증 경로는 3가지로 나뉩니다.**`.env`에 둔 API key, `hermes model` / `hermes auth`를 통한 OAuth, 그리고 `config.yaml`의 custom endpoint입니다. 익숙해 보이는 경로가 아니라 _프로바이더가 요구하는_ 경로를 골라야 합니다.
- **프로바이더 전환은 명령 한 줄로 끝납니다.**`hermes model`은 OAuth 로그인을 포함해 지원되는 모든 프로바이더를 대화형으로 안내하고, `/model provider:model`은 세션 중간에 대화 기록을 잃지 않고 전환합니다.
- **사용자가 직접 편집하는 설정 표면은 2개 파일입니다.**`~/.hermes/config.yaml`에는 일반 설정이, `~/.hermes/.env`에는 비밀이 들어갑니다. `auth.json`, `MEMORY.md`, `skills/`는 Hermes가 직접 관리하고, `SOUL.md`만 사용자가 편집할 수 있습니다.
- **Hermes는 OpenClaw의 후속 프로젝트입니다.** 이전 도구를 쓰고 있었다면 `hermes claw migrate`가 30개 이상의 상태 카테고리를 자동으로 옮겨줍니다.
- **서비스 품질은 보조 모델(auxiliary model)에 달려 있습니다.** 비전, 웹 요약, 컨텍스트 압축, 메모리 flush는 모두 별도의 보조 LLM을 사용합니다. 기본값은 자동 감지(OpenRouter → Nous → Codex)를 통한 Gemini Flash이며, 어느 것도 설정되어 있지 않으면 해당 기능들은 _조용히_ 성능이 저하됩니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-v0140-4) v0.14.0에서 달라진 점

v0.14.0(2026년 5월 16일 출시)은 하나의 대표 기능보다는, Hermes가 _어디서 어떻게 실행되는지_ 의 범위를 넓히면서 설정 부담을 줄이는 데 초점이 있습니다. 주요 운영 변경 사항은 다음과 같습니다.

- **설치와 시작이 더 가벼워졌습니다.**`pip install hermes-agent`로 [PyPI](https://pypi.org/project/hermes-agent/?utm_source=pytorchkr&ref=pytorchkr) 에서 설치할 수 있고, 무거운 어댑터는 처음 사용할 때 lazy-install되며, cold start가 약 19초 줄었습니다.
- **구독 서비스를 로컬 API endpoint로 만들 수 있습니다.**`hermes proxy`는 [Claude Pro](https://www.anthropic.com/pricing?utm_source=pytorchkr&ref=pytorchkr), [ChatGPT Pro](https://openai.com/chatgpt/pricing/?utm_source=pytorchkr&ref=pytorchkr), [SuperGrok](https://x.ai/grok?utm_source=pytorchkr&ref=pytorchkr) 같은 OAuth 기반 프로바이더를 [Aider](https://aider.chat/?utm_source=pytorchkr&ref=pytorchkr), [Cline](https://github.com/cline/cline?utm_source=pytorchkr&ref=pytorchkr), [Continue](https://www.continue.dev/?utm_source=pytorchkr&ref=pytorchkr) 에서 쓸 수 있는 OpenAI 호환 로컬 endpoint로 바꿉니다.
- **게이트웨이 지원 범위가 넓어졌습니다.** [LINE](https://line.me/?utm_source=pytorchkr&ref=pytorchkr) 과 [SimpleX Chat](https://simplex.chat/?utm_source=pytorchkr&ref=pytorchkr) 이 추가되어 메시징 플랫폼 수가 22개가 되었고, [Microsoft Teams](https://www.microsoft.com/microsoft-teams?utm_source=pytorchkr&ref=pytorchkr) 는 end-to-end로 연결되었으며, Discord history backfill은 기본값으로 켜져 있습니다.
- **쓰기 시점 검증이 개선되었습니다.** 편집 후 Hermes는 다음 턴 전에 turn별 파일 변경 요약과 [LSP](https://microsoft.github.io/language-server-protocol/?utm_source=pytorchkr&ref=pytorchkr) semantic diagnostics를 표시할 수 있어, evidence-driven 에이전트 작업에 더 가까워졌습니다.
- **데스크톱 및 미디어 도구가 확장되었습니다.**`computer_use`는 Anthropic가 아닌 프로바이더에서도 [cua-driver](https://github.com/trycua/cua?utm_source=pytorchkr&ref=pytorchkr) 를 통해 작동하고, `video_generate`는 pluggable 백엔드 뒤에서 통합되었으며, `vision_analyze`는 실제로 볼 수 있는 모델에 raw pixel을 보냅니다.

이밖에도 [grok-4.3](https://x.ai/?utm_source=pytorchkr&ref=pytorchkr) 1M 컨텍스트를 지원하는 SuperGrok OAuth, 일급 `x_search`, lazy dependency 설치, `/handoff` 슬래시 명령, 통합 `video_generate`, native Windows beta, 그리고 12개의 P0 / 50개의 P1 보안 항목 종료가 포함되어 있습니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-5) 설치: 한 줄로 끝나는 길과 직접 제어하는 길

대부분의 사용자에게는 한 줄짜리 설치 스크립트가 권장 경로입니다. 이 설치 스크립트는 [Python](https://www.python.org/?utm_source=pytorchkr&ref=pytorchkr), [uv](https://github.com/astral-sh/uv?utm_source=pytorchkr&ref=pytorchkr), [Node.js](https://nodejs.org/?utm_source=pytorchkr&ref=pytorchkr) v22(브라우저 자동화와 WhatsApp 브리지용), [ripgrep](https://github.com/BurntSushi/ripgrep?utm_source=pytorchkr&ref=pytorchkr), [ffmpeg](https://ffmpeg.org/?utm_source=pytorchkr&ref=pytorchkr), 저장소 복제(clone), 가상 환경 설정, 전역 `hermes` 명령을 모두 처리합니다.

```bash

curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

이미 Python 환경을 직접 관리하고 있다면 PyPI 패키지가 더 깔끔합니다.

```bash

pip install hermes-agent
```

Linux, macOS, WSL2, [Termux](https://termux.dev/?utm_source=pytorchkr&ref=pytorchkr) 기반 Android에서 작동하며, 설치 스크립트는 Termux를 자동 감지하고 검증된 Android 번들로 전환합니다. v0.14.0은 PowerShell 설치 스크립트를 통해 native Windows 지원을 early beta로 추가했지만, production 용도에는 여전히 WSL2가 더 안전합니다. 설치 직후 다음 명령으로 상태를 확인할 수 있습니다.

```bash

hermes version      # 버전 확인
hermes doctor       # 설정 및 의존성 진단 (--fix 옵션으로 자동 복구 시도)
hermes status       # 현재 설정과 인증 상태
hermes dump         # 디버깅용 plain-text 요약 (secrets는 마스킹)
```

`hermes doctor`는 문제가 생겼을 때 _가장 먼저_ 실행해야 하는 명령으로, 무엇이 빠졌고 어떻게 고치면 되는지 정확히 알려줍니다. `hermes dump`는 GitHub 이슈나 Discord 스레드에 도움을 요청할 때 그대로 복사해 붙여넣을 수 있는 진단 출력을 생성합니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-6) 설치 더 알아보기

**Hermes 공식 설치 가이드**

**Hermes Agent GitHub 저장소**

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-3-7) 인증 및 프로바이더: 3가지 경로

원문에서 가장 강조하는 부분이자 신규 사용자가 가장 자주 막히는 지점입니다. Hermes는 약 20개의 일급 프로바이더와 custom endpoint를 지원하지만, 인증 패턴은 단 3가지뿐입니다. 이 3가지 중 어느 경로에 속하는지를 먼저 파악하면, 이후의 설정은 거의 자동으로 풀립니다.

**경로 1 — `.env`의 API key**: 키를 `~/.hermes/.env`에 넣으면 Hermes가 시작할 때 읽습니다. OpenRouter, [AI Gateway (Vercel)](https://vercel.com/docs/ai-gateway?utm_source=pytorchkr&ref=pytorchkr), z.ai/GLM, Kimi/Moonshot, MiniMax, Alibaba Cloud/DashScope, Kilo Code, OpenCode, DeepSeek, Hugging Face, Google/Gemini 등 대부분의 third-party 프로바이더에서 사용합니다.

**경로 2 — `hermes model` 또는 `hermes auth`를 통한 OAuth**: device code flow를 시작하고, 브라우저를 열어 인증한 다음 자격 증명을 `~/.hermes/auth.json`에 저장합니다. [Claude Code](https://www.anthropic.com/claude-code?utm_source=pytorchkr&ref=pytorchkr) 나 [Codex CLI](https://github.com/openai/codex?utm_source=pytorchkr&ref=pytorchkr) 같은 도구의 기존 자격 증명을 가져올 수도 있습니다. Nous Portal, OpenAI Codex (ChatGPT 계정), GitHub Copilot, Anthropic (Claude Pro/Max)에서 사용합니다.

**경로 3 — `config.yaml`의 Custom endpoint**: OpenAI-compatible API라면 무엇이든 사용할 수 있습니다. [Ollama](https://ollama.com/?utm_source=pytorchkr&ref=pytorchkr), [vLLM](https://docs.vllm.ai/?utm_source=pytorchkr&ref=pytorchkr), [SGLang](https://github.com/sgl-project/sglang?utm_source=pytorchkr&ref=pytorchkr), [llama.cpp](https://github.com/ggerganov/llama.cpp?utm_source=pytorchkr&ref=pytorchkr), [LM Studio](https://lmstudio.ai/?utm_source=pytorchkr&ref=pytorchkr), [LiteLLM proxy](https://www.litellm.ai/?utm_source=pytorchkr&ref=pytorchkr), [Together AI](https://www.together.ai/?utm_source=pytorchkr&ref=pytorchkr), [Groq](https://groq.com/?utm_source=pytorchkr&ref=pytorchkr), [Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/?utm_source=pytorchkr&ref=pytorchkr), 직접 self-hosted 서버가 여기에 해당합니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-anthropic-3-8) Anthropic의 특수성: 3가지 방법

Anthropic만 별도로 짚어둘 필요가 있습니다. Hermes에서 Claude로 들어가는 경로가 3가지이고, 동일 머신에서 이미 Claude Code를 사용 중이라면 _어느 방법을 고르느냐_ 가 갱신 가능한 자격 증명 유지에 직결되기 때문입니다.

```bash

# Method 1: API key (pay-per-token)
export ANTHROPIC_API_KEY=***
hermes chat --provider anthropic --model claude-sonnet-4-6

# Method 2: OAuth through hermes model (preferred)
# Claude Code의 credential store를 우선 사용
hermes model

# Method 3: Manual setup-token (fallback/legacy)
export ANTHROPIC_TOKEN=***
hermes chat --provider anthropic
```

`hermes model`에서 Anthropic OAuth를 선택하면 Hermes는 토큰을 `~/.hermes/.env`에 복사하기보다 Claude Code 자체 credential store를 우선 사용합니다. 이렇게 해야 refreshable Claude 자격 증명이 _계속 refreshable한 상태로_ 유지됩니다. 같은 머신에서 이미 Claude Code를 쓰고 있다면 이 방식이 가장 깔끔합니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-xai-9) 중국계 프로바이더와 xAI

Hermes는 z.ai/GLM, Kimi/Moonshot, MiniMax(global과 China endpoint 분리), Alibaba Cloud(Qwen)를 dedicated provider ID로 내장 지원합니다. z.ai/GLM provider를 사용할 때 Hermes는 여러 endpoint(global, China, coding variants)를 자동으로 probe해서 사용자의 API key를 받아들이는 endpoint를 찾고, 결과를 캐시합니다. xAI (Grok) provider는 base URL에 `x.ai`가 포함되어 있으면 모든 요청에 `x-grok-conv-id` 헤더를 보내 같은 서버로 라우팅하고, cached system prompts와 history를 자동으로 재사용합니다. 즉 prompt caching이 _별도의 설정 없이_ 활성화됩니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-llm-10) 로컬 LLM 서버 연결하기

Hermes의 진가는 클라우드 프로바이더와 로컬 LLM을 _동일한 도구로_ 다룰 수 있다는 데 있습니다. OpenAI-compatible `/v1/chat/completions` endpoint를 구현하는 서버라면 무엇이든 가리킬 수 있습니다.

**Ollama** — 가장 쉬운 로컬 경로, 거의 zero config:

```bash

ollama pull qwen2.5-coder:32b
OLLAMA_CONTEXT_LENGTH=32768 ollama serve   # 기본 4k를 32k로 상향
hermes model   # Custom endpoint → http://localhost:11434/v1 → qwen2.5-coder:32b
```

여기서 _반드시_ 주의해야 할 함정이 있습니다. Ollama의 기본 컨텍스트 길이는 4,096 토큰으로 매우 낮고, OpenAI-compatible API는 클라이언트에서 컨텍스트 길이를 받지 않으므로 Hermes가 대신 설정할 수 없습니다. `OLLAMA_CONTEXT_LENGTH` 환경 변수 또는 Modelfile을 통해 에이전트 용도로는 최소 16k~32k를 설정해야 합니다.

**vLLM** — high-performance GPU serving:

```bash

pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --port 8000 \
  --max-model-len 65536 \
  --tensor-parallel-size 2 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes
```

Tool calling에는 `--enable-auto-tool-choice`와 `--tool-call-parser <name>`이 _반드시_ 필요합니다. 지원되는 parser는 `hermes` (Qwen 2.5, Hermes 2/3), `llama3_json`, `mistral`, `deepseek_v3`, `deepseek_v31`, `xlam`, `pythonic`입니다. 이 flag가 빠지면 tool call이 그냥 plain text로 반환됩니다.

**llama.cpp** — CPU 및 Apple Silicon Metal에 적합합니다.

```bash

./build/bin/llama-server \
  --jinja -fa \
  -c 32768 \
  -ngl 99 \
  -m models/qwen2.5-coder-32b-instruct-Q4_K_M.gguf \
  --port 8080 --host 0.0.0.0
```

여기서도 함정이 있습니다. **tool calling에는 `--jinja`가 반드시 필요합니다.** 이 옵션이 없으면 llama-server가 `tools` 파라미터를 완전히 무시하고, 모델은 응답 텍스트에 JSON을 박는 식으로 tool을 호출하려 시도해, Hermes가 이를 실제 tool call로 파싱할 수 없게 됩니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-11) 세션 중간에 모델 전환

`/model` 슬래시 명령은 대화 기록을 잃지 않고 프로바이더와 모델을 즉시 전환합니다. 이는 _"비싼 모델로 어려운 부분만 처리하고 다시 저렴한 모델로 돌아가는"_ 워크플로를 한 세션 안에서 가능하게 합니다.

```bash

/model claude-sonnet-4              # 모델 전환 (provider auto-detect)
/model zai:glm-5                    # provider:model 명시 전환
/model custom:qwen-2.5              # custom endpoint 사용
/model custom                       # endpoint의 /v1/models를 query해서 단일 모델 자동 선택
/model custom:local:qwen-2.5        # named custom provider "local"
```

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-auxiliary-models-12) 보조 모델(Auxiliary Models): 가장 자주 빠지는 함정

Hermes는 side task — 이미지 분석, 웹 페이지 요약, 브라우저 스크린샷 분석, 위험 명령 승인 분류, 컨텍스트 압축, 세션 검색 요약, 스킬 매칭, MCP 도구 dispatch, 메모리 flush — 에 lightweight 보조 모델을 사용합니다. 기본값은 자동 감지(OpenRouter → Nous → Codex)를 통한 Gemini Flash이지만, 만약 Anthropic OAuth만 설정해두고 OpenRouter key가 없다면 비전, 웹 요약, 압축이 _조용히_ 저하되거나 실패합니다. 원문에서 _"신규 Hermes 사용자가 가장 자주 겪는 기능이 조용히 작동하지 않는 문제"_ 라고 강조하는 부분입니다.

```yaml

auxiliary:
  vision:
    provider: "main"      # main agent의 provider를 그대로 사용
  web_extract:
    provider: "main"
  approval:
    provider: "auto"      # auto, openrouter, nous, codex, main 등
  compression:
    timeout: 120
  session_search: { provider: "auto", model: "", timeout: 30 }
```

`"main"` provider 옵션은 _"내 main agent가 사용하는 provider를 사용한다"_ 는 뜻이며, **오직**`auxiliary:`, `compression:`, `fallback_model:` 설정 안에서만 유효합니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-13) 인증 더 알아보기

**Hermes 공식 인증 및 프로바이더 가이드**

[https://hermes-agent.nousresearch.com/docs/guides/authentication-providers](https://hermes-agent.nousresearch.com/docs/guides/authentication-providers?utm_source=pytorchkr&ref=pytorchkr)

**Anthropic API**

**OpenRouter Models**

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-14) 설정 시스템: 계층형 구조의 이해

Hermes의 설정은 다음 우선순위로 적용됩니다. 상위 계층이 하위 계층을 덮어쓰며, 이 중 일부는 사용자 설정 파일에서 _보이지 않는_ 전역 레지스트리이기 때문에 순서를 익혀두는 것이 중요합니다.

1. CLI 인수 — `hermes chat --model anthropic/claude-sonnet-4`처럼 호출별로 override
2. 환경 변수 — 프로세스 시작 시 적용
3. `config.yaml` — 기본 설정 파일
4. `.env` — 비밀 정보 전용
5. 내장 기본값 — 다른 곳에서 값을 설정하지 않았을 때

비밀 정보는 shell 스타일 보간으로 `config.yaml`에서 참조할 수 있습니다.

```yaml

auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}
```

설정 조회와 편집에 사용하는 명령은 다음과 같습니다.

```bash

hermes config                # 현재 설정 보기
hermes config edit           # 에디터로 config.yaml 열기
hermes config set KEY VAL    # 특정 값 설정
hermes config path           # config 파일 경로 출력
hermes config check          # 업데이트 후 누락된 옵션 점검
hermes config migrate        # 누락된 옵션 대화형 추가
```

`hermes config check`와 `hermes config migrate`는 _모든 `hermes update` 이후 실행해야 하는_ 명령으로, 새로 추가된 설정 옵션을 파일에 자동으로 채워줍니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-15) 디렉터리 구조가 곧 시스템

Hermes는 모든 상태를 `~/.hermes/` 아래에 저장합니다. 기본값이 아닌 프로파일을 사용할 때는 `$HERMES_HOME` 아래입니다.

```bash

~/.hermes/
├── config.yaml       # 일반 설정 (model, terminal, TTS, compression, memory, toolsets)
├── .env              # 비밀 (API keys, bot tokens, passwords)
├── auth.json         # OAuth 자격 증명 (Nous Portal, Codex, Anthropic)
├── SOUL.md           # 에이전트의 기본 정체성 (system prompt 1번 슬롯)
├── memories/         # 영구 메모리 (MEMORY.md, USER.md)
├── skills/           # 번들 + 에이전트 생성 + 허브 설치 스킬
├── cron/             # 예약 작업
├── sessions/         # 게이트웨이 세션 상태
└── logs/             # agent.log, gateway.log, errors.log (secrets 자동 redacted)
```

각 파일에는 고유한 역할이 있어 서로 겹치지 않습니다. _"Hermes가 X를 어디에 저장하지?"_ 라는 질문이 생기면 위 항목 중 하나가 답입니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-hermes-16) 프로파일: 격리된 여러 Hermes 인스턴스

프로파일을 사용하면 각각 자체 설정, 세션, 스킬, 메모리, 게이트웨이 PID를 가진 격리된 Hermes 인스턴스를 여러 개 둘 수 있습니다. _work Hermes_ 와 _personal Hermes_ 를 서로의 상태가 보이지 않게 나란히 실행하는 방식입니다.

```bash

hermes profile create work --clone
hermes profile use work
hermes profile alias work --name h-work
hermes profile export work -o work-backup.tar.gz
hermes -p work chat -q "Hello from work profile"   # 전환 없이 일회성 실행
```

각 프로파일에는 자체 `HERMES_HOME`(기본값 `~/.hermes-<name>/`)이 할당되어, 여러 프로파일이 서로 간섭하지 않고 게이트웨이를 동시에 실행할 수 있습니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-17) 도구와 도구셋: 에이전트가 할 수 있는 일의 경계

Hermes는 웹 검색, 브라우저 자동화, 터미널 실행, 파일 편집, 메모리, 위임(delegation), RL 훈련, 메시징 전달, [Home Assistant](https://www.home-assistant.io/?utm_source=pytorchkr&ref=pytorchkr) 통합 등을 포괄하는 넓은 내장 tool 레지스트리를 제공하며, 이들은 논리적인 **도구셋(toolsets)** 으로 묶여 플랫폼별로 활성화/비활성화됩니다.

| 범주 | 예시 도구 | 설명 |
| --- | --- | --- |
| 웹 | `web_search`, `web_extract` | 검색 및 페이지 콘텐츠 추출 |
| 터미널/파일 | `terminal`, `process`, `read_file`, `patch` | 명령 실행 및 파일 조작 |
| 브라우저 | `browser_navigate`, `browser_snapshot`, `browser_vision` | 텍스트와 비전 기반 자동화 |
| 미디어 | `vision_analyze`, `video_analyze`, `video_generate`, `image_generate`, `text_to_speech` | 멀티모달 분석 및 생성 |
| 에이전트 오케스트레이션 | `todo`, `clarify`, `execute_code`, `delegate_task` | 계획, 명확화, 코드 실행, subagent 위임 |
| Computer use | `computer_use` | cua-driver 백엔드를 통한 데스크톱 제어 |
| 메모리 | `memory`, `session_search` | 영구 메모리 \+ 세션 검색 |
| 자동화 | `cronjob`, `send_message` | 예약 작업, 아웃바운드 메시징 |
| 통합 | `ha_*`, MCP tools, `rl_*` | Home Assistant, MCP, RL 훈련 |

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-6-18) 터미널 백엔드: 6가지 실행 환경

터미널 도구는 6가지 환경에서 명령을 실행할 수 있습니다. 보안과 재현성이 중요한 경우에는 `local` 대신 격리된 백엔드를 선택할 수 있다는 점이 핵심 차별점입니다.

| 백엔드 | 사용 사례 |
| --- | --- |
| `local` | 사용자 머신에서 실행 (기본값) — 신뢰할 수 있는 작업 |
| `docker` | 격리된 컨테이너 — 보안, 재현성 |
| `ssh` | 원격 서버 — sandbox, 에이전트가 자체 코드에서 떨어져 있게 유지 |
| `singularity` | [HPC 컨테이너](https://docs.sylabs.io/guides/3.5/user-guide/introduction.html?utm_source=pytorchkr&ref=pytorchkr) — 클러스터 컴퓨팅, rootless |
| `modal` | [Modal](https://modal.com/?utm_source=pytorchkr&ref=pytorchkr) 서버리스 클라우드 실행 |
| `daytona` | [Daytona](https://www.daytona.io/?utm_source=pytorchkr&ref=pytorchkr) 클라우드 sandbox 워크스페이스 |

원문 저자는 _"보안을 위해서는 SSH 백엔드가 권장된다 — 에이전트가 자기 자신을 수정하지 못하게 하기 때문"_ 이라고 지적합니다. 모든 컨테이너 백엔드에는 읽기 전용 root 파일 시스템(Docker), `DAC_OVERRIDE`/`CHOWN`/`FOWNER`를 제외한 Linux capability 제거, 권한 상승 차단, PID 제한(256개), 전체 namespace 격리 등의 보안 강화가 적용됩니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-19) 백그라운드 프로세스 관리

터미널 도구는 명시적인 프로세스 관리와 함께 백그라운드 실행을 지원합니다. 긴 빌드나 테스트 실행을 _blocking 하지 않고_ 띄워두고, 필요할 때 polling하는 방식입니다.

```python

terminal(command="pytest -v tests/", background=true)
# Returns: {"session_id": "proc_abc123", "pid": 12345}

process(action="list")                            # 모든 실행 중 프로세스
process(action="poll", session_id="proc_abc123")  # 상태 확인
process(action="wait", session_id="proc_abc123")  # 완료까지 block
process(action="log", session_id="proc_abc123")   # 전체 출력
process(action="kill", session_id="proc_abc123")  # 종료
process(action="write", session_id="proc_abc123", data="y")  # 입력 전달
```

PTY 모드(`pty=true`)는 Codex나 Claude Code 같은 대화형 CLI 도구를 에이전트가 직접 사용할 수 있게 합니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-20) 스킬 시스템: 에이전트의 절차적 메모리

Hermes의 스킬은 _에이전트가 필요할 때만 로드할 수 있는 온디맨드 지식 문서_ 입니다. 토큰 사용량을 줄이기 위해 **점진적 공개(progressive disclosure)** 패턴을 따르며, [agentskills.io](https://agentskills.io/?utm_source=pytorchkr&ref=pytorchkr) 공개 표준과 호환됩니다.

```css

Level 0: skills_list()           → [{name, description, category}, ...]  (~3k tokens)
Level 1: skill_view(name)        → 전체 콘텐츠 + 메타데이터               (varies)
Level 2: skill_view(name, path)  → 특정 참조 파일                         (varies)
```

에이전트는 _실제로 필요할 때만_ 스킬 전체 콘텐츠를 로드합니다. 이 설계는 컨텍스트 윈도우의 대부분을 작업 자체에 쓸 수 있게 해주는 핵심 메커니즘입니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-21) 에이전트가 직접 만드는 스킬

에이전트는 `skill_manage` 도구를 통해 자체 스킬을 만들고, 업데이트하고, 삭제할 수 있습니다. 이것이 Hermes의 **절차적 메모리(procedural memory)** 입니다. 복잡한 작업을 알아내면 나중에 다시 사용할 수 있도록 그 접근 방식을 스킬로 저장하는데, 다음과 같은 조건에서 자동으로 트리거됩니다.

- 5회 이상의 tool 호출이 필요한 복잡한 작업을 성공적으로 완료한 뒤
- 오류나 막다른 길을 만났고 작동하는 경로를 찾았을 때
- 사용자가 접근 방식을 수정해 주었을 때
- 사소하지 않은 워크플로를 발견했을 때

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-22) 스킬 허브: 외부 스킬 가져오기

온라인 레지스트리에서 스킬을 탐색, 검색, 설치, 관리할 수 있습니다. 통합된 소스에는 [openai/skills](https://github.com/openai/skills?utm_source=pytorchkr&ref=pytorchkr), [anthropics/skills](https://github.com/anthropics/skills?utm_source=pytorchkr&ref=pytorchkr), [skills-sh](https://skills.sh/?utm_source=pytorchkr&ref=pytorchkr), [LobeHub](https://lobehub.com/?utm_source=pytorchkr&ref=pytorchkr), `.well-known/skills/index.json`을 게시하는 임의 사이트, 직접 GitHub 저장소 경로가 포함됩니다.

```bash

hermes skills browse                          # 모든 허브 스킬 탐색
hermes skills search kubernetes               # 모든 소스에서 검색
hermes skills inspect openai/skills/k8s       # 설치 전 미리보기
hermes skills install openai/skills/k8s       # 보안 스캔 동반 설치
hermes skills check                           # upstream 업데이트 확인
hermes skills audit                           # 설치된 허브 스킬 재스캔
hermes skills tap add myorg/skills-repo       # 커스텀 GitHub 소스 추가
```

허브에서 설치되는 모든 스킬은 _데이터 유출, prompt injection, 파괴적 명령, 공급망 위협_ 을 확인하는 보안 스캐너를 거칩니다. 신뢰 수준은 `builtin`, `official`, `trusted`, `community`의 4단계로 나뉘며, `community` 스킬의 위험하지 않은 정책 차단은 `--force`로 재정의할 수 있지만 `dangerous` 판정은 절대 우회되지 _않습니다._

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-fallback-skill-23) 조건부 활성화: Fallback Skill 패턴

스킬은 사용 가능한 도구에 따라 자기 자신을 표시하거나 숨길 수 있습니다. 이는 _premium 도구를 사용할 수 없을 때만 나타나야 하는_ 무료 대안에 특히 유용합니다. 예를 들어 내장 `duckduckgo-search` 스킬은 `fallback_for_toolsets: [web]`를 사용하므로, [Firecrawl](https://www.firecrawl.dev/?utm_source=pytorchkr&ref=pytorchkr) API key가 설정되어 있으면 숨겨진 상태로 유지되고, 없으면 자동으로 fallback으로 나타납니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-memorymd-usermd-24) 지속 메모리: MEMORY.md와 USER.md

Hermes에는 세션 간에 유지되는 _제한적이고 선별된_ 메모리가 있습니다. 에이전트의 메모리는 `~/.hermes/memories/`에 저장된 두 파일로 구성됩니다.

| 파일 | 목적 | 문자 제한 |
| --- | --- | --- |
| `MEMORY.md` | 에이전트의 개인 메모 — 환경 정보, 규칙, 학습 내용 | 2,200자 (~800 토큰) |
| `USER.md` | 사용자 프로필 — 선호 사항, 커뮤니케이션 스타일, 기대치 | 1,375자 (~500 토큰) |

두 파일 모두 _세션 시작 시 고정된 스냅샷으로_ system prompt에 주입됩니다. 에이전트는 `memory` 도구를 통해 `add`, `replace`, `remove`로 메모리를 관리합니다. 세션 중에 변경한 내용은 즉시 디스크에 저장되지만, 다음 세션 전까지는 system prompt에 나타나지 않는데, 이는 _의도된 동작_ 으로 LLM의 prefix cache를 보존하기 위한 설계입니다.

저장에 적합한 정보는 다음과 같습니다.

- **사용자 선호**: _"TypeScript를 JavaScript보다 선호한다"_ → `user`
- **환경 정보**: _"이 서버는 Debian 12 + PostgreSQL 16"_ → `memory`
- **수정 사항**: _"Docker 명령에 sudo를 쓰지 말 것, 사용자가 docker 그룹에 있음"_ → `memory`
- **규칙**: _"프로젝트는 탭 \+ 120자 라인 + Google 스타일 docstring 사용"_ → `memory`
- **완료된 작업**: _"2026-01-15에 MySQL → PostgreSQL 마이그레이션 완료"_ → `memory`

반대로 사소하거나 다시 찾기 쉬운 사실, 원시 데이터 덤프, 세션 한정 정보, 이미 컨텍스트 파일에 있는 정보는 _저장하지 않는 것이_ 원칙입니다.

### [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-25) 세션 검색과 외부 메모리 제공자

`MEMORY.md` / `USER.md`의 작은 윈도우 외에도, 에이전트는 `session_search` 도구를 통해 모든 과거 대화를 검색할 수 있습니다. 모든 CLI와 메시징 세션은 [SQLite FTS5](https://www.sqlite.org/fts5.html?utm_source=pytorchkr&ref=pytorchkr) 로 저장되어 전체 텍스트 검색이 가능하고, 쿼리 결과는 Gemini Flash 요약과 함께 반환됩니다. 더 깊은 지속 메모리가 필요하다면 [Honcho](https://honcho.dev/?utm_source=pytorchkr&ref=pytorchkr), [Mem0](https://mem0.ai/?utm_source=pytorchkr&ref=pytorchkr), [Supermemory](https://supermemory.ai/?utm_source=pytorchkr&ref=pytorchkr) 등 8개의 외부 메모리 제공자 플러그인 중 하나를 활성화할 수 있습니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-soulmd-personality-vs-26) SOUL.md와 Personality: 정체성 vs 프로젝트 규칙

`SOUL.md`는 Hermes 인스턴스의 **기본 정체성** 입니다. system prompt의 1번 슬롯을 차지하며, 하드코딩된 기본 정체성을 대체합니다. Hermes는 `~/.hermes/SOUL.md`를 자동으로 생성하지만 _기존 사용자 파일은 절대 덮어쓰지 않습니다._ 현재 작업 디렉터리는 확인하지 않으므로, 어디서 Hermes를 실행하든 personality가 _예측 가능하게_ 유지됩니다.

원문에서 가장 유용한 구분 중 하나는 `SOUL.md`와 `AGENTS.md`의 역할 분리입니다.

- **`SOUL.md`** — 정체성, 어조, 스타일, 커뮤니케이션 기본값, personality 수준의 동작. **어디서나 따라야 하는 내용** 이 들어갑니다.
- **`AGENTS.md`** — 프로젝트 아키텍처, 코딩 규칙, 도구 선호, repo별 워크플로, 명령어, 포트, 경로, 배포 메모. **특정 프로젝트에 속한 내용** 이 들어갑니다.

내장 personality도 `/personality` 슬래시 명령으로 전환할 수 있습니다. `helpful`, `concise`, `technical`, `creative`, `teacher` 같은 실용적인 페르소나부터 `pirate`, `shakespeare`, `kawaii`, `catgirl` 같은 재미용까지 13가지가 기본 제공됩니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-h-22-27) 메시징 게이트웨이: 단일 프로세스, 22개 플랫폼

Hermes의 가장 차별화된 운영 레이어가 이 게이트웨이입니다. 하나의 게이트웨이 프로세스가 Telegram, Discord, Slack, WhatsApp, Signal, SMS, Email, Home Assistant, [Mattermost](https://mattermost.com/?utm_source=pytorchkr&ref=pytorchkr), [Matrix](https://matrix.org/?utm_source=pytorchkr&ref=pytorchkr), [DingTalk](https://www.dingtalk.com/?utm_source=pytorchkr&ref=pytorchkr), [Feishu/Lark](https://www.larksuite.com/?utm_source=pytorchkr&ref=pytorchkr), WeCom, WeChat, BlueBubbles (iMessage), QQBot, Microsoft Teams, Tencent Yuanbao, [Google Chat](https://workspace.google.com/products/chat/?utm_source=pytorchkr&ref=pytorchkr), LINE, SimpleX Chat, 범용 Webhook 어댑터 등 **22개 플랫폼** 에 동시에 연결됩니다.

```bash

hermes gateway setup                # 대화형 플랫폼 설정
hermes gateway install              # 사용자 서비스 (systemd/launchd)로 설치
hermes gateway start                # 설치된 서비스 시작
hermes gateway status
hermes gateway run                  # 포그라운드 실행 (디버깅)
```

핵심 아키텍처 원칙은 _"모든 메시징 플랫폼이 CLI와 같은 `AIAgent` 대화 루프를 통해 실행된다"_ 는 점입니다. 그래서 동일한 슬래시 명령이 터미널과 Telegram에서 똑같이 동작하고, Telegram에서 예약한 cron 작업의 출력을 Discord로 전달하는 _크로스 플랫폼 워크플로_ 가 자연스럽게 만들어집니다.

```scss

Platform event → Adapter.on_message() → MessageEvent
  → GatewayRunner._handle_message()
    → authorize user
    → resolve session key
    → create AIAgent with session history
    → AIAgent.run_conversation()
    → deliver response back through adapter
```

페어링 코드 시스템은 무작위 사용자가 게이트웨이와 대화하는 일을 막아줍니다. 사용자가 자신의 메시징 플랫폼에서 페어링 코드를 보내면, 운영자가 `hermes pairing approve`로 명시적으로 승인해야 그때부터 권한이 부여됩니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-mcp-28) 예약 작업과 MCP 통합

Hermes에는 작업이 셸 명령이 아니라 **에이전트 작업** 인 일급 cron 시스템이 있습니다. 각 예약 작업은 설정된 프롬프트와 (선택적으로) 연결된 스킬을 가진 새로운 `AIAgent`를 통해 실행되고, 결과를 _어떤 플랫폼으로든_ 전달합니다.

```bash

hermes cron list
hermes cron create --prompt "Check HN for AI news and summarize" \
  --schedule "0 9 * * *" --deliver telegram
hermes cron run <id>         # 다음 tick에 즉시 실행
```

또는 메시징 채팅 안에서 _대화로_ 만들 수도 있습니다: _"매일 아침 9시에 Hacker News에서 AI 뉴스를 확인하고 Telegram으로 요약을 보내줘."_ 에이전트가 도구를 통해 cron 작업을 설정하고, JSON으로 유지되어 재시작 후에도 남아 있습니다.

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/?utm_source=pytorchkr&ref=pytorchkr) 통합은 클라이언트와 서버 양쪽으로 지원됩니다.

```bash

# 클라이언트: 외부 MCP 서버에 연결해 도구 범위 확장
hermes mcp add github --command npx --args "-y,@modelcontextprotocol/server-github"
hermes mcp list
hermes mcp test github

# 서버: Hermes 대화를 다른 에이전트에 노출
hermes mcp serve
```

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-goal-29) 멀티 에이전트 칸반과 /goal

v0.13.0에서 도입된 영속적 **칸반 보드** 는 multi-agent 협업을 일급 프리미티브로 만듭니다. Heartbeat(작업을 소유한 worker가 신호를 보내지 못하면 의심 상태로 표시), reclaim(다른 worker가 방치된 작업을 부분 출력까지 포함해 이어받기), zombie detection(작업 완료 표시 없이 종료된 worker는 새 작업을 claim하지 못함), hallucination gate(검증을 통과하지 못한 출력은 완료로 표시되지 않고 사유와 함께 보드로 복귀), 작업별 `max_retries`, 다중 프로젝트 보드 등이 포함됩니다.

같은 버전에서 추가된 `/goal` 슬래시 명령은 _Ralph-loop 패턴을 일급 프리미티브로_ 제공합니다. 여러 턴에 걸쳐 작업을 유지하도록 에이전트를 목표에 고정하고, 턴 예산을 설정할 수 있습니다. v0.14.0의 `/subgoal`은 루프를 다시 시작하지 않고 활성 `/goal`에 성공 기준을 추가하며, 같은 버전의 `/handoff`는 라이브 세션(메시지, tool call, context)을 다른 모델, persona, 또는 프로파일로 이전합니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-claude-code-codex-cli-30) Claude Code, Codex CLI와의 비교

원문 FAQ에서 다루는 _Hermes Agent vs Claude Code_ 비교를 좀 더 명확히 정리하면 다음과 같습니다. 어떤 도구를 골라야 하는지의 기준은 _"하나의 모델 생태계에 고정되어도 되는가, 아니면 모델을 자유롭게 갈아끼울 일이 많은가"_ 입니다.

| 항목 | Hermes Agent | Claude Code | Codex CLI |
| --- | --- | --- | --- |
| 라이선스 | MIT (오픈소스) | 사용 약관 기반 (closed) | Apache 2.0 (오픈소스) |
| 모델 범위 | 20+ 프로바이더, OpenAI 호환 모든 endpoint | Anthropic 전용 | OpenAI 전용 |
| 메시징 게이트웨이 | 22개 플랫폼 일급 지원 | 없음 | 없음 |
| 지속 메모리 | MEMORY.md + USER.md + 8개 외부 제공자 | CLAUDE.md (project 단위) | AGENTS.md (project 단위) |
| 스킬 시스템 | 점진적 공개, 에이전트 자체 생성, 허브 설치 | Skills (Anthropic 제공) | 없음 |
| 멀티 에이전트 | 영속 칸반 보드, 워커 무리 | 1개 인스턴스 | 1개 인스턴스 |
| 예약 작업 | 일급 cron + 22개 플랫폼 배달 | 없음 | 없음 |

Hermes는 _"이미 Anthropic이나 OpenAI 구독을 갖고 있어 그것을 활용하고 싶지만, 거기에 고정되고 싶지는 않은"_ 사용자에게 가장 잘 맞는 위치를 차지합니다. v0.14.0의 `hermes proxy`는 이 그림을 한층 강화해, Claude Pro/ChatGPT Pro/SuperGrok 같은 OAuth 기반 프로바이더를 _모든 OpenAI-호환 도구가 쓸 수 있는 로컬 endpoint_ 로 변환합니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-v0130-v0140-31) 보안 강화: v0.13.0 ~ v0.14.0 둘 다 보안 업그레이드

원문은 _"Hermes 배포를 운영한다면 v0.13.0과 v0.14.0을 단순한 기능 추가가 아니라 보안 관련 업그레이드로 다뤄야 한다"_ 고 강조합니다. v0.13.0은 8개의 P0 보안 문제를 해결했고, v0.14.0은 12개의 P0와 50개의 P1을 추가로 종료했습니다. 주요 항목은 다음과 같습니다.

- **Secret redaction 기본 활성화**: 로그와 `hermes debug share` 업로드에서 secret을 마스킹. v0.12.0에서는 payload 손상 보고 이후 잠시 비활성화되었지만, v0.13.0에서 더 안전한 기준으로 복귀
- **Discord cross-guild DM 우회 (CVSS 8.1)**: 한 guild의 사용자 역할이 모든 guild의 DM을 승인하던 경로를 차단
- **MCP OAuth TOCTOU 창**: 자격 증명 저장 중 race condition 해결
- **Browser SSRF 하한선**: 169.254.169.254 같은 cloud metadata 주소 차단
- **Cron prompt-injection 스캔**: cron job 실행 전에 조립된 prompt(로드된 스킬 포함)를 prompt injection 여부로 스캔
- **Sudo 강화 및 위험 명령 우회 수정**, **plugin API 인증**, **skills-hub SSRF 범위 확대**, **설치 중 공급망 보안 권고 스캔** (v0.14.0)

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-openclaw-32) OpenClaw에서 마이그레이션

Hermes Agent는 [OpenClaw](https://github.com/NousResearch/openclaw?utm_source=pytorchkr&ref=pytorchkr) 의 후속 프로젝트로, 기존 사용자를 위한 자동 마이그레이션 명령이 준비되어 있습니다.

```bash

hermes claw migrate --dry-run                    # 어떤 것이 옮겨질지 미리 보기
hermes claw migrate --preset full                # API key 포함 전체 마이그레이션
hermes claw migrate --preset user-data --overwrite   # 사용자 데이터만, secrets 제외
hermes claw migrate --source /custom/path
```

30개 이상의 카테고리(SOUL.md, MEMORY.md, USER.md, AGENTS.md, 4개 소스의 스킬, 기본 모델, custom provider, MCP 서버, 7개 메시징 플랫폼의 토큰과 allowlist, 에이전트 기본값, TTS 설정, 브라우저 설정, 도구 설정 등)가 자동으로 import되고, cron job/플러그인/훅 등은 _수동 검토를 위해 archive_ 됩니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-hermes-33) 결론: Hermes를 언제 선택할 것인가

Hermes Agent는 _"단일 벤더 잠금에서 벗어나, 사용할수록 똑똑해지는 개인 에이전트를 가지면서, 동시에 일상의 메시징 환경에서도 살아 움직이는 도구를 만들고 싶을 때"_ 가장 잘 어울리는 선택지입니다. Nous Portal 구독자라면 v0.10.0부터 도입된 [Nous Tool Gateway](https://blakecrosley.com/ko/guides/hermes?utm_source=pytorchkr&ref=pytorchkr#nous-tool-gateway-v0100) 를 통해 [Firecrawl](https://www.firecrawl.dev/?utm_source=pytorchkr&ref=pytorchkr) 웹 검색, [FAL](https://fal.ai/?utm_source=pytorchkr&ref=pytorchkr) / FLUX 2 Pro 이미지 생성, [OpenAI TTS](https://platform.openai.com/docs/guides/text-to-speech?utm_source=pytorchkr&ref=pytorchkr), Browser Use 같은 관리형 도구에 추가 API key 없이 접근할 수 있고, BYOK 사용자라면 동일한 도구를 자기 키로 호출하는 무료 경로가 계속 유지됩니다.

특히 v0.14.0의 PyPI 설치, `hermes proxy`, LSP semantic diagnostics, 22개 메시징 플랫폼, 그리고 P0 12개와 P1 50개의 보안 강화는, Hermes가 단순한 실험 도구를 넘어 _production 운영을 의식한 에이전트 런타임_ 으로 성숙해지고 있다는 신호로 읽힙니다. 본격적으로 사용을 시작하기 전에 위에서 다룬 5가지 핵심 시스템 — 프로바이더 해소, 설정 계층, 도구셋, 스킬, 게이트웨이 + 크론 + 프로파일 — 을 한 번 더 머리에 넣어두면, 이후의 학습 곡선이 훨씬 짧아질 것입니다.

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-scroll-hermes-agent-2026-34)![:scroll:](https://discuss.pytorch.kr/images/emoji/fluentui/scroll.png?v=15) Hermes Agent: 실무자를 위한 가이드 (2026) 소개 블로그

## [Heading link](https://discuss.pytorch.kr/t/ai-hermes-agent-feat-blake-crosley/10335\#p-19870-house-nousresearch-hermes-agent-35)![:house:](https://discuss.pytorch.kr/images/emoji/fluentui/house.png?v=15) nousresearch의 Hermes Agent 공식 문서

* * *

_이 글은 GPT 모델로 정리한 글을 바탕으로 한 것으로, 원문의 내용 또는 의도와 다르게 정리된 내용이 있을 수 있습니다. 관심있는 내용이시라면 원문도 함께 참고해주세요! 읽으시면서 어색하거나 잘못된 내용을 발견하시면 덧글로 알려주시기를 부탁드립니다._![:hugs:](https://discuss.pytorch.kr/images/emoji/fluentui/hugs.png?v=15)

[![:pytorch:](https://discuss.pytorch.kr/uploads/default/original/2X/f/fa98c2196c22febe7475e503792febf39ba7a0de.svg?v=15)파이토치 한국 사용자 모임![:south_korea:](https://discuss.pytorch.kr/images/emoji/fluentui/south_korea.png?v=15)](https://pytorch.kr/) 이 정리한 이 글이 유용하셨나요? [회원으로 가입](https://discuss.pytorch.kr/signup) 하시면 주요 글들을 이메일![:love_letter:](https://discuss.pytorch.kr/images/emoji/fluentui/love_letter.png?v=15)로 보내드립니다! (기본은 Weekly지만 [Daily로 변경도 가능](https://discuss.pytorch.kr/my/preferences/emails) 합니다.)

![:wrapped_gift:](https://discuss.pytorch.kr/images/emoji/fluentui/wrapped_gift.png?v=15) 아래![:down_right_arrow:](https://discuss.pytorch.kr/images/emoji/fluentui/down_right_arrow.png?v=15)쪽에 좋아요![:+1:](https://discuss.pytorch.kr/images/emoji/fluentui/+1.png?v=15)를 눌러주시면 새로운 소식들을 정리하고 공유하는데 힘이 됩니다~ ![:star_struck:](https://discuss.pytorch.kr/images/emoji/fluentui/star_struck.png?v=15)

6.7천
조회
42
링크


읽기
19
최소


댓글 쓰기

### 새 글 또는 읽지 않은 글

| 글 | 댓글 | 조회수 | 활동 |
| --- | --- | --- | --- |
| [Open Code Review: 결정론적 엔진과 LLM 에이전트를 결합한 Alibaba의 코드 리뷰 도구](https://discuss.pytorch.kr/t/open-code-review-llm-alibaba/10622)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [llm](https://discuss.pytorch.kr/tag/llm/162),<br>- [ai-agent](https://discuss.pytorch.kr/tag/ai-agent/3012),<br>- [alibaba](https://discuss.pytorch.kr/tag/alibaba/844),<br>- [cli](https://discuss.pytorch.kr/tag/cli/6984),<br>- [apache-2](https://discuss.pytorch.kr/tag/apache-2/7791),<br>- [code-review](https://discuss.pytorch.kr/tag/code-review/7106),<br>- [open-code-review](https://discuss.pytorch.kr/tag/open-code-review/8068) | [0](https://discuss.pytorch.kr/t/open-code-review-llm-alibaba/10622/1) | 758 | [3일 전](https://discuss.pytorch.kr/t/open-code-review-llm-alibaba/10622/1) |
| [Nango: AI 에이전트와 제품을 800여 개 API에 연결하는 통합 플랫폼](https://discuss.pytorch.kr/t/nango-ai-800-api/10492)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [ai-agent](https://discuss.pytorch.kr/tag/ai-agent/3012),<br>- [mcp](https://discuss.pytorch.kr/tag/mcp/5435),<br>- [typescript](https://discuss.pytorch.kr/tag/typescript/2319),<br>- [integration-platform](https://discuss.pytorch.kr/tag/integration-platform/7983),<br>- [oauth](https://discuss.pytorch.kr/tag/oauth/7982),<br>- [api-integration](https://discuss.pytorch.kr/tag/api-integration/7981),<br>- [nango](https://discuss.pytorch.kr/tag/nango/7980) | [0](https://discuss.pytorch.kr/t/nango-ai-800-api/10492/1) | 390 | [10일 전](https://discuss.pytorch.kr/t/nango-ai-800-api/10492/1) |
| [Finance Skills: AI 코딩 에이전트에 금융 분석과 트레이딩 능력을 더하는 스킬 모음](https://discuss.pytorch.kr/t/finance-skills-ai/10590)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [claude-code](https://discuss.pytorch.kr/tag/claude-code/4551),<br>- [mit-license](https://discuss.pytorch.kr/tag/mit-license/2317),<br>- [agent-skills](https://discuss.pytorch.kr/tag/agent-skills/5713),<br>- [yfinance](https://discuss.pytorch.kr/tag/yfinance/8059),<br>- [trading](https://discuss.pytorch.kr/tag/trading/8058),<br>- [financial-analysis](https://discuss.pytorch.kr/tag/financial-analysis/8057),<br>- [finance-skills](https://discuss.pytorch.kr/tag/finance-skills/8056) | [0](https://discuss.pytorch.kr/t/finance-skills-ai/10590/1) | 259 | [6일 전](https://discuss.pytorch.kr/t/finance-skills-ai/10590/1) |
| [PyTorch 기반 RAG 및 LLM 파인튜닝을 위한 학술 데이터 인제스턴스 자동화 구조](https://discuss.pytorch.kr/t/pytorch-rag-llm/10475)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) | [1](https://discuss.pytorch.kr/t/pytorch-rag-llm/10475/1) | 228 | [13일 전](https://discuss.pytorch.kr/t/pytorch-rag-llm/10475/2) |
| [OpenClaw로 뭘 할 수 있을까? Moltbook에서 정리한 실전 활용 사례 74개](https://discuss.pytorch.kr/t/openclaw-moltbook-74/10513)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [ai](https://discuss.pytorch.kr/tag/1429-tag/1429),<br>- [opensource](https://discuss.pytorch.kr/tag/opensource/395),<br>- [claude-code](https://discuss.pytorch.kr/tag/claude-code/4551) | [0](https://discuss.pytorch.kr/t/openclaw-moltbook-74/10513/1) | 397 | [11일 전](https://discuss.pytorch.kr/t/openclaw-moltbook-74/10513/1) |
| [DeepSeek GUI: 높은 토큰 ROI를 추구하는 DeepSeek 모델 로컬 AI 에이전트 작업대](https://discuss.pytorch.kr/t/deepseek-gui-roi-deepseek-ai/10663)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [ai-agent](https://discuss.pytorch.kr/tag/ai-agent/3012),<br>- [coding-agent](https://discuss.pytorch.kr/tag/coding-agent/6991),<br>- [mit-license](https://discuss.pytorch.kr/tag/mit-license/2317),<br>- [deepseek](https://discuss.pytorch.kr/tag/deepseek/3136),<br>- [token-efficiency](https://discuss.pytorch.kr/tag/token-efficiency/8095),<br>- [kun](https://discuss.pytorch.kr/tag/kun/8094),<br>- [deepseek-gui](https://discuss.pytorch.kr/tag/deepseek-gui/8093) | [0](https://discuss.pytorch.kr/t/deepseek-gui-roi-deepseek-ai/10663/1) | 22 | [5시간](https://discuss.pytorch.kr/t/deepseek-gui-roi-deepseek-ai/10663/1) |
| [designlang: 웹사이트의 디자인 시스템을 한 번에 추출하는 CLI와 AI 에이전트 도구](https://discuss.pytorch.kr/t/designlang-cli-ai/10494)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [claude-code](https://discuss.pytorch.kr/tag/claude-code/4551),<br>- [mcp](https://discuss.pytorch.kr/tag/mcp/5435),<br>- [cli](https://discuss.pytorch.kr/tag/cli/6984),<br>- [design-system](https://discuss.pytorch.kr/tag/design-system/7479),<br>- [frontend](https://discuss.pytorch.kr/tag/frontend/2316),<br>- [design-tokens](https://discuss.pytorch.kr/tag/design-tokens/7989),<br>- [designlang](https://discuss.pytorch.kr/tag/designlang/7988) | [0](https://discuss.pytorch.kr/t/designlang-cli-ai/10494/1) | 2.1천 | [10일 전](https://discuss.pytorch.kr/t/designlang-cli-ai/10494/1) |
| [FLUX.2 klein LoRA 파인튜닝 가이드, RTX 4090 하나로 60분 만에 나만의 스타일 학습하기](https://discuss.pytorch.kr/t/flux-2-klein-lora-rtx-4090-60/10566)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [fine-tuning](https://discuss.pytorch.kr/tag/fine-tuning/428),<br>- [lora](https://discuss.pytorch.kr/tag/lora/409),<br>- [image-generation](https://discuss.pytorch.kr/tag/image-generation/3615),<br>- [hugging-face](https://discuss.pytorch.kr/tag/hugging-face/7065),<br>- [diffusers](https://discuss.pytorch.kr/tag/diffusers/1182),<br>- [gradio](https://discuss.pytorch.kr/tag/gradio/967),<br>- [flux-2](https://discuss.pytorch.kr/tag/flux-2/5990),<br>- [black-forest-labs](https://discuss.pytorch.kr/tag/black-forest-labs/8023) | [0](https://discuss.pytorch.kr/t/flux-2-klein-lora-rtx-4090-60/10566/1) | 205 | [7일 전](https://discuss.pytorch.kr/t/flux-2-klein-lora-rtx-4090-60/10566/1) |
| [SPRi AI Brief 2026년 6월호, GPT-5.5부터 미중 AI 패권 경쟁까지 \[국문/PDF/28p\]](https://discuss.pytorch.kr/t/spri-ai-brief-2026-6-gpt-5-5-ai-pdf-28p/10681)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [anthropic](https://discuss.pytorch.kr/tag/anthropic/265),<br>- [gemini](https://discuss.pytorch.kr/tag/gemini/2168),<br>- [report](https://discuss.pytorch.kr/tag/report/158),<br>- [spri](https://discuss.pytorch.kr/tag/spri/402),<br>- [gpt-5](https://discuss.pytorch.kr/tag/gpt-5/555),<br>- [ai-jobs](https://discuss.pytorch.kr/tag/ai-jobs/7335),<br>- [ai-brief](https://discuss.pytorch.kr/tag/ai-brief/4621),<br>- [ai-policy](https://discuss.pytorch.kr/tag/ai-policy/8105) | [0](https://discuss.pytorch.kr/t/spri-ai-brief-2026-6-gpt-5-5-ai-pdf-28p/10681/1) | 55 | [1일 전](https://discuss.pytorch.kr/t/spri-ai-brief-2026-6-gpt-5-5-ai-pdf-28p/10681/1) |
| [Google Research가 공개한 Agentic RAG: 부족한 정보를 끝까지 찾아내는 멀티 에이전트 검색](https://discuss.pytorch.kr/t/google-research-agentic-rag/10599)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [llm](https://discuss.pytorch.kr/tag/llm/162),<br>- [google](https://discuss.pytorch.kr/tag/google/57),<br>- [rag](https://discuss.pytorch.kr/tag/rag/1185),<br>- [multi-agent](https://discuss.pytorch.kr/tag/multi-agent/1829),<br>- [gemini](https://discuss.pytorch.kr/tag/gemini/2168),<br>- [agentic-rag](https://discuss.pytorch.kr/tag/agentic-rag/4379),<br>- [retrieval](https://discuss.pytorch.kr/tag/retrieval/7127) | [0](https://discuss.pytorch.kr/t/google-research-agentic-rag/10599/1) | 2.5천 | [5일 전](https://discuss.pytorch.kr/t/google-research-agentic-rag/10599/1) |
| [ADHD: 코딩 에이전트가 여러 사고 프레임으로 아이디어를 발산하고 추려내는 스킬](https://discuss.pytorch.kr/t/adhd/10481)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [coding-agent](https://discuss.pytorch.kr/tag/coding-agent/6991),<br>- [claude-agent-sdk](https://discuss.pytorch.kr/tag/claude-agent-sdk/5606),<br>- [reasoning](https://discuss.pytorch.kr/tag/reasoning/7128),<br>- [divergent-thinking](https://discuss.pytorch.kr/tag/divergent-thinking/7976),<br>- [adhd](https://discuss.pytorch.kr/tag/adhd/7975) | [0](https://discuss.pytorch.kr/t/adhd/10481/1) | 359 | [12일 전](https://discuss.pytorch.kr/t/adhd/10481/1) |
| [Gemini Omni 영상 편집 실전 가이드: 요소 교체, 카메라 제어, 멀티모달 입력 정리](https://discuss.pytorch.kr/t/gemini-omni/10662)<br>[읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) <br>- [ai](https://discuss.pytorch.kr/tag/1429-tag/1429) | [0](https://discuss.pytorch.kr/t/gemini-omni/10662/1) | 76 | [3일 전](https://discuss.pytorch.kr/t/gemini-omni/10662/1) |

Topic list, column headers with buttons are sortable.

### 더 읽을거리가 필요하신가요? [읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14) 에서 다른 글을 찾아 보거나 [최근 글](https://discuss.pytorch.kr/latest) 을 살펴보세요.

[Powered by Discourse](https://discourse.org/powered-by?utm_source=pytorchkr&ref=pytorchkr)

PyTorchKR🇰🇷


🔥파이토치 한국어 커뮤니티🇰🇷에 오신 것을 환영합니다! 파이토치 및 인공지능 관련 소식과 질문/답변, 행사, 이벤트 등의 정보를 나누며 함께 성장하는 것을 목표로 합니다. 함께 해주세요! ❤️


파이토치 한국 사용자 모임


- [사용자 모임 소개](https://pytorch.kr/about "파이토치 한국 사용자 모임 소개")
- [기여해주신 분들](https://pytorch.kr/contributors "파이토치 문서 한글화에 기여해주신 분들")
- [리소스](https://pytorch.kr/resources "파이토치 한국어 관련 자료 모음")
- [행동 강령](https://pytorch.kr/coc "파이토치 한국 사용자 모임의 행동 강령(Code of Conduct)")

게시판별 RSS


- [전체 게시판](https://discuss.pytorch.kr/latest.rss "파이토치 한국어 커뮤니티 RSS - 전체 게시판")
- [공지사항](https://discuss.pytorch.kr/c/announce/13.rss "파이토치 한국어 커뮤니티 RSS - 공지사항 게시판")
- [읽을거리&정보공유](https://discuss.pytorch.kr/c/news/14.rss "파이토치 한국어 커뮤니티 RSS - 공지사항 게시판")
- [자유게시판](https://discuss.pytorch.kr/c/lounge/15.rss "파이토치 한국어 커뮤니티 RSS - 자유게시판")
- [묻고 답하기](https://discuss.pytorch.kr/c/qna/5.rss "파이토치 한국어 커뮤니티 RSS - 묻고 답하기 게시판")
- [행사&이벤트 홍보](https://discuss.pytorch.kr/c/promotion/12.rss "파이토치 한국어 커뮤니티 RSS - 행사&이벤트 홍보 게시판")

[홈페이지](https://pytorch.kr/) [튜토리얼](https://tutorials.pytorch.kr/) [블로그](https://pytorch.kr/blog)

Invalid date

Invalid date