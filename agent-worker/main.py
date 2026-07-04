import asyncio, os, uuid, json
from typing import Any
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()
API_KEY = os.getenv("WORKER_API_KEY", "dev-secret-key")
HERMES_CMD = os.getenv("HERMES_CMD")
app = FastAPI(title="PennyPress HydraAgent Worker")
tasks: dict[str, dict[str, Any]] = {}

class RunTaskRequest(BaseModel):
    subscription_id: str
    profile_id: str
    user_memory: str = ""
    llm_model: str = "deepseek-v4-flash"
    cron_expression: str | None = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    stream: bool = False

def verify_key(x_api_key: str | None) -> None:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

def verify_auth_header(request: Request) -> None:
    auth_header = request.headers.get("Authorization")
    if auth_header:
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
        token = auth_header.split(" ")[1]
        if token != API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")
    elif API_KEY != "dev-secret-key":
        raise HTTPException(status_code=401, detail="Authorization header is required")

async def execute_agent(prompt: str) -> str:
    if not HERMES_CMD:
        await asyncio.sleep(3)
        return f"[stub] HydraAgent 작업 완료 — {len(prompt)}자 처리"
    proc = await asyncio.create_subprocess_shell(
        HERMES_CMD,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate(prompt.encode())
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode())
    return stdout.decode()

async def run_task(task_id: str, req: RunTaskRequest) -> None:
    tasks[task_id]["status"] = "running"
    prompt = f"## User Memory\n{req.user_memory}\n\n## Profile LLM\n{req.llm_model}"
    try:
        result = await execute_agent(prompt)
        tasks[task_id].update(status="completed", result=result)
    except Exception as e:
        tasks[task_id].update(status="failed", error=str(e))

@app.get("/health")
def health(x_api_key: str | None = Header(default=None)):
    # 외부 에이전트 등록의 health check는 API key 헤더 없이 ping을 보낼 수 있으므로
    # API key 검증을 생략하거나 optional로 처리합니다.
    active = sum(1 for t in tasks.values() if t["status"] == "running")
    return {"status": "ok", "active_tasks": active}

@app.post("/tasks/run")
async def run(req: RunTaskRequest, background: BackgroundTasks, x_api_key: str | None = Header(default=None)):
    verify_key(x_api_key)
    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "pending", "result": None, "error": None}
    background.add_task(run_task, task_id, req)
    return {"task_id": task_id}

@app.get("/tasks/{task_id}/status")
def status(task_id: str, x_api_key: str | None = Header(default=None)):
    verify_key(x_api_key)
    t = tasks.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, **t}

# --- OpenAI 호환 External Hermes Agent Mock APIs ---

@app.get("/v1/models")
def get_models(request: Request):
    verify_auth_header(request)
    return {
        "object": "list",
        "data": [
            {"id": "hermes-agent", "object": "model", "created": 1718870400, "owned_by": "nousresearch"},
            {"id": "deepseek-v4-flash", "object": "model", "created": 1718870400, "owned_by": "deepseek"}
        ]
    }

async def sse_stream(prompt: str):
    response_text = f"안녕하세요! 저는 로컬에서 구동 중인 외부 에르메스 에이전트(Mock)입니다. 요청하신 메시지에 대한 답변을 생성 중입니다.\n\n[입력된 마지막 메시지]: \"{prompt}\"\n\n앞으로 PennyPress 플랫폼을 통해 더욱 긴밀히 협업할 수 있기를 기대합니다."
    chunk_size = 3
    for i in range(0, len(response_text), chunk_size):
        chunk = response_text[i:i+chunk_size]
        data = {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion.chunk",
            "created": 1718870400,
            "model": "hermes-agent",
            "choices": [{
                "index": 0,
                "delta": {"role": "assistant", "content": chunk},
                "finish_reason": None
            }]
        }
        yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0.05)
    
    data_end = {
        "id": f"chatcmpl-{uuid.uuid4()}",
        "object": "chat.completion.chunk",
        "created": 1718870400,
        "model": "hermes-agent",
        "choices": [{
            "index": 0,
            "delta": {},
            "finish_reason": "stop"
        }]
    }
    yield f"data: {json.dumps(data_end, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest, request: Request):
    verify_auth_header(request)
    last_message = req.messages[-1].content if req.messages else ""
    
    if req.stream:
        return StreamingResponse(sse_stream(last_message), media_type="text/event-stream")
    
    # Non-stream support
    response_text = f"안녕하세요! 저는 로컬에서 구동 중인 외부 에르메스 에이전트(Mock)입니다.\n\n[입력된 마지막 메시지]: \"{last_message}\""
    return {
        "id": f"chatcmpl-{uuid.uuid4()}",
        "object": "chat.completion",
        "created": 1718870400,
        "model": req.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text
            },
            "finish_reason": "stop"
        }]
    }
