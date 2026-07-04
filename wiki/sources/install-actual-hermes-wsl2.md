# PennyPress 실제 에르메스 에이전트(Hermes Agent) 로컬 연동 가이드

이 문서는 PennyPress 서비스를 클론하여 로컬 개발을 진행하는 개발자가 **실제 에르메스 에이전트(Hermes Agent)**를 Windows WSL2 환경에 설치하고, 플랫폼과 실시간 통신(SSE 채팅, 연결 테스트)을 연동하는 방법을 설명합니다.

---

## 🏗️ 1. 아키텍처 및 개요

PennyPress는 사용자 로컬이나 외부 클라우드에서 자율적으로 구동되는 OpenAI 규격 호환 에르메스 에이전트를 등록 및 연동할 수 있는 기능을 제공합니다.
- **Frontend (Next.js)**: Windows 호스트 터미널에서 구동 (`http://localhost:3000`)
- **AI Agent (Hermes)**: 리눅스 전용 바이너리이므로 **WSL2 내부**에 설치하고 실행 (`http://localhost:8642`)
- **네트워크**: WSL2에서 `8642` 포트로 API를 띄우면 Windows 호스트 브라우저에서 `localhost:8642`로 자동 포트포워딩되어 통신이 지원됩니다.

---

## ⚡ 2. 설치 및 구성 단계

### 1단계: WSL2 일반 사용자 환경 진입
Windows PowerShell 또는 CMD를 실행하고 다음 명령을 입력하여 WSL2 기본 배포판의 쉘로 접속합니다.
```bash
wsl
```
> [!IMPORTANT]
> 절대 `wsl -u root` 계정으로 설치를 수행하지 마십시오. root 계정으로 수행 시 파이썬 가상환경 내의 실행 파일들이 `/root/...` 홈 디렉토리에 묶여 일반 사용자가 접근할 수 없는 **권한 에러(bad interpreter: Permission denied)**가 발생합니다.

### 2단계: 에르메스 코어(Hermes Core) 재설치
기존에 권한 꼬임 등으로 오작동하는 설치본이 있다면 깨끗이 제거한 후, **일반 사용자 계정 권한**으로 재설치합니다.

```bash
# 1. 기존 root 소유의 에르메스 잔재 및 바이너리 삭제
sudo rm -rf /usr/local/lib/hermes-agent
sudo rm -f /usr/local/bin/hermes

# 2. 일반 사용자 계정 권한으로 공식 인스톨러 실행
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

### 3단계: 로컬 전용 설정 및 프로파일 구성
PennyPress 프로젝트의 마운트 디렉토리로 이동한 뒤, 로컬 테스트에 특화된 설정 프로파일을 구축합니다.
```bash
# 프로젝트의 WSL 내 마운트 경로로 이동 (본인 경로에 맞게 이동)
cd /mnt/c/___Workspace/Projects/PennyPress

# 로컬 설정 스크립트 실행 (~/.hermes-local/ 폴더 및 config 생성)
bash hermes-agent/install.sh
```

### 4단계: LLM API Key 및 보안 키 입력
에이전트가 생각하고 동작할 수 있도록 실제 사용할 LLM의 API Key와 외부 연결 보안 키를 설정합니다.
```bash
nano ~/.hermes-local/.env
```
아래 항목에 해당하는 키 값을 채워 넣고 저장합니다.
```env
# PennyPress 등록 시 사용할 연결 보안 토큰 (기본값: dev-secret-key)
API_SERVER_KEY=dev-secret-key

# 에이전트의 사고 및 답변 생성을 위한 LLM API Key (필요한 것 기입)
DEEPSEEK_API_KEY=your_actual_deepseek_api_key
OPENAI_API_KEY=your_actual_openai_api_key
GOOGLE_API_KEY=your_actual_google_api_key
```

### 5단계: 에이전트 API 서버 실행
게이트웨이를 기동하여 PennyPress 브라우저의 접속 대기 상태로 만듭니다.
```bash
bash hermes-agent/start.sh
```
서버가 정상 기동되면 API 서버가 `0.0.0.0:8642` 에서 호출을 받을 수 있는 상태가 됩니다.

---

## 🔗 3. PennyPress 플랫폼 등록 및 테스트

1. 브라우저를 열어 **[http://localhost:3000/my-agents](http://localhost:3000/my-agents)**로 접속합니다.
2. **신규 에이전트 등록** 버튼을 클릭하고 모달창에 다음 스펙을 입력합니다.
   - **이름**: `My Actual Hermes`
   - **API Endpoint URL**: `http://localhost:8642/v1`
   - **API Server Key (선택)**: `dev-secret-key` (상기 `.env`에서 설정한 `API_SERVER_KEY` 값)
   - **Web UI / Kanban Board URL (선택)**: 빈 상태 유지
3. **연결 테스트**를 클릭하여 초록색 성공 배지(`지원 모델: hermes-agent...`)를 확인합니다.
4. **에이전트 추가**를 클릭하여 저장합니다.
5. 등록된 에이전트 카드에서 **대화하기**를 클릭하여 채팅 방에 진입한 후, 메시지를 보내 실시간 스트리밍 답변(SSE)이 매끄럽게 수신되는지 테스트합니다.

---

## 🔍 4. 주요 트러블슈팅 (Troubleshooting)

### Q: `start.sh` 실행 시 `bad interpreter: Permission denied` 오류 발생
- **원인**: 인스톨러가 `root` 권한으로 실행되어 파이썬 가상환경(`venv`) 내부의 실행 파일 원본이 `/root/.local/...` 폴더로 매핑되었기 때문입니다. 일반 사용자 계정에서는 이 폴더에 접근할 수 없습니다.
- **해결책**:
  1. WSL 쉘에서 `ls -l /usr/local/lib/hermes-agent/venv/bin/python` 을 쳐서 경로 원본이 `/root/` 하위를 바라보는지 확인합니다.
  2. 맞다면, 본 문서의 **2. 설치 및 구성 단계 2단계**를 통해 기존 설치본을 완전히 소거하고 일반 사용자 권한으로 공식 인스톨러를 재실행해 줍니다.

### Q: `start.sh` 실행 시 `venv/bin/hermes: No such file or directory` 에러 발생
- **원인**: `start.sh`에 전역 설치 경로인 `/usr/local/bin/hermes`가 하드코딩되어 있었으나, 일반 사용자 모드로 설치할 경우 실제 binary는 `~/.local/bin/hermes`에 존재하기 때문입니다.
- **해결책**:
  `hermes-agent/start.sh` 파일을 수정하여 사용자 로컬의 실행 파일 경로(`$HOME/.local/bin/hermes`) 및 PATH 환경변수를 동적으로 우선 탐색하도록 수정했습니다.

### Q: 실행은 성공했으나 `No user allowlists configured` 경고가 노출될 때
- **원인**: 에르메스 게이트웨이가 기본 보안 설정에 의해 비인가 플랫폼 접근을 차단하고 있기 때문입니다.
- **해결책**:
  `~/.hermes-local/.env` 파일을 열어 `GATEWAY_ALLOW_ALL_USERS=true` 설정을 추가해 줍니다.

### Q: 연결 테스트 시 "에이전트 서버의 /health 응답이 비정상적이거나 연결할 수 없습니다" 에러 발생
- **원인**: 플랫폼의 연결 테스트 로직이 주소 뒤에 그대로 `/health`를 붙이도록 설계되어 있어, `http://localhost:8642/v1`을 입력할 경우 `/v1/health`라는 비정상 경로를 호출했기 때문입니다.
- **해결책**:
  Next.js API 라우트(`app/api/external-agents/test/route.ts` 및 `app/api/external-agents/[id]/chat/route.ts`) 내부에서 Endpoint 입력값을 정규화하여 `/v1` 유무와 상관없이 헬스체크는 `/health`로, API 호출은 `/v1` 경로로 깔끔하게 구분 처리하도록 코드를 보완하였습니다.

### Q: 에이전트 등록 시 외래키 제약조건 위반 에러(`user_external_agents_user_id_fkey`) 발생
- **원인**: `user_external_agents` 테이블이 `public.user_profiles` 테이블을 참조하고 있으나, 현재 로그인한 사용자의 프로필 행이 생성되어 있지 않은 경우입니다. (Auth 트리거 작동 전에 생성된 오래된 테스트 계정 등)
- **해결책**:
  Supabase SQL Editor에서 아래 쿼리를 실행하여 누락된 프로필 행을 동기화(백필)해 줍니다.
  ```sql
  INSERT INTO public.user_profiles (id, nickname)
  SELECT id, split_part(email, '@', 1)
  FROM auth.users
  ON CONFLICT (id) DO NOTHING;
  ```

### Q: 에이전트 연결 후 채팅 입력 시 항상 동일한 Mock 답변만 출력되는 경우
- **원인**: Windows 호스트에서 `agent-worker/main.py`가 에이전트 기본 포트인 `8642` 포트를 점유(`uvicorn main:app --reload --port 8642`)하고 있어, WSL2 내부의 실제 에이전트로 전달되어야 하는 요청을 가로채고 있는 상태입니다.
- **해결책**:
  1. Windows 호스트 터미널에서 구동 중인 `agent-worker` 프로세스를 `Ctrl + C`로 종료하거나 PowerShell에서 `Stop-Process -Id <PID>`로 프로세스를 종료합니다.
  2. 만약 `agent-worker`가 테스트를 위해 필요하다면, 충돌을 방지하기 위해 기본 포트인 **8001** 포트로 실행해야 합니다.
     ```powershell
     cd C:\___Workspace\Projects\PennyPress\agent-worker
     .\venv\Scripts\python -m uvicorn main:app --reload --port 8001
     ```

### Q: Mock 프로세스 종료 후 실제 에이전트로 전환했으나 채팅 창에서 대화 입력 시 아무런 응답이 없는 경우
- **원인**: WSL2 내부의 에르메스 에이전트 프로필 설정에서 LLM 모델명이 누락(`Model: (not set)`)되었기 때문에, 에이전트가 DeepSeek API를 호출할 때 빈 값(`model=`)을 전송하여 **HTTP 400 Bad Request** 에러(`The supported API model names are...`)가 발생한 경우입니다.
- **해결책**:
  1. WSL 터미널에서 다음 명령어를 실행하여 기본 모델로 `deepseek-v4-flash`를 저장합니다.
     ```bash
     export HERMES_HOME=$HOME/.hermes-local
     hermes config set model deepseek-v4-flash
     ```
  2. 기존 게이트웨이 서비스를 정지한 뒤 재기동합니다.
     ```bash
     hermes gateway stop
     bash hermes-agent/start.sh
     ```

