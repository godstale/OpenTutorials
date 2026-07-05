import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, api_key } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const { baseUrl, v1Url } = normalizeAgentEndpoint(endpoint);

    // 1. Health check call (relaxed)
    const healthRes = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (!healthRes || !healthRes.ok) {
      console.log(`[test-connection] Optional health check failed or not supported at ${baseUrl}/health, proceeding to model check...`);
    }

    // 2. Authentication check / models fetch
    const headers: Record<string, string> = {};
    if (api_key) {
      headers['Authorization'] = `Bearer ${api_key}`;
    }
    headers['Content-Type'] = 'application/json';

    let modelsRes = await fetch(`${v1Url}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    let modelsList: any[] = [];
    let currentModel: string | null = null;
    let success = false;
    let authError = false;
    let authErrorMessage = '';

    if (modelsRes) {
      if (modelsRes.status === 401 || modelsRes.status === 403) {
        authError = true;
        authErrorMessage = 'API Key 인증 실패. 권한이 없습니다.';
      } else if (modelsRes.ok) {
        try {
          const modelsData = await modelsRes.json();
          modelsList = modelsData.data ?? [];
          currentModel = modelsData.current_model || modelsList.find((m: any) => m.current)?.id;
          success = true;
        } catch (e) {
          console.error('[test-connection] JSON parsing failed for /v1/models:', e);
        }
      }
    }

    // /v1/models 호출이 실패했고 인증 에러가 아닌 경우, 대화(/v1/chat/completions)를 통한 질의 폴백 시도
    if (!success && !authError) {
      console.log(`[test-connection] /v1/models failed, falling back to chat completions query for harness agent...`);
      try {
        const chatRes = await fetch(`${v1Url}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'hermes-agent',
            messages: [
              {
                role: 'user',
                content: 'Please output the list of all currently supported/available LLM models you can route to, and the currently active model. Respond ONLY in valid JSON format like: {"models": ["model-name-1", "model-name-2"], "current_model": "active-model-name"}'
              }
            ],
            response_format: { type: 'json_object' }
          }),
          signal: AbortSignal.timeout(10000),
        }).catch(() => null);

        if (chatRes && chatRes.ok) {
          const chatData = await chatRes.json();
          const reply = chatData.choices?.[0]?.message?.content;
          if (reply) {
            const cleanReply = reply.trim().replace(/^```json/, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(cleanReply);
            if (parsed && Array.isArray(parsed.models)) {
              modelsList = parsed.models.map((id: string) => ({
                id,
                object: 'model',
                created: Date.now(),
                owned_by: 'harness'
              }));
              currentModel = parsed.current_model || (modelsList.length > 0 ? modelsList[0].id : null);
              success = true;
            }
          }
        }
      } catch (chatErr) {
        console.error('[test-connection] Fallback chat query failed:', chatErr);
      }
    }

    if (!success) {
      return NextResponse.json({ 
        success: false, 
        error: authError 
          ? authErrorMessage 
          : '에이전트 서버에 연결할 수 없거나 지원 모델 정보를 가져오지 못했습니다. (/v1/models 및 chat fallback 실패)' 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      models: modelsList,
      current_model: currentModel
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
