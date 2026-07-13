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

    const { endpoint, api_key, agent_program, agent_type } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    // 1. Anthropic Claude Custom Check
    if (agent_program === 'claude') {
      const headers: Record<string, string> = {
        'x-api-key': api_key || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
      
      const testRes = await fetch(`${endpoint}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (testRes) {
        if (testRes.status === 401 || testRes.status === 403) {
          return NextResponse.json({ success: false, error: 'API Key 인증 실패. Claude API 권한이 없습니다.' });
        }
        if (testRes.ok) {
          return NextResponse.json({
            success: true,
            models: [
              { id: 'claude-3-5-sonnet-20241022', object: 'model' },
              { id: 'claude-3-5-haiku-20241022', object: 'model' }
            ],
            current_model: 'claude-3-5-sonnet-20241022'
          });
        }
      }
      return NextResponse.json({ 
        success: false, 
        error: 'Claude API 연결 실패 (엔드포인트 및 API Key 확인 필요)' 
      }, { status: 200 });
    }

    // 2. Google Gemini Custom Check
    if (agent_program === 'gemini') {
      // 2-a. OpenAI 호환 모드 확인 시도 (/openai/v1/models)
      const openaiHeaders: Record<string, string> = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      };
      const geminiOpenaiRes = await fetch(`${endpoint}/openai/v1/models`, {
        method: 'GET',
        headers: openaiHeaders,
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (geminiOpenaiRes && geminiOpenaiRes.ok) {
        try {
          const data = await geminiOpenaiRes.json();
          const modelsList = data.data || [];
          return NextResponse.json({
            success: true,
            models: modelsList,
            current_model: modelsList[0]?.id || 'gemini-1.5-flash'
          });
        } catch {}
      }

      // 2-b. 일반 REST API 확인 시도 (/models)
      const restRes = await fetch(`${endpoint}/models?key=${api_key}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (restRes) {
        if (restRes.status === 400 || restRes.status === 403) {
          return NextResponse.json({ success: false, error: 'Gemini API Key 인증 실패.' });
        }
        if (restRes.ok) {
          try {
            const data = await restRes.json();
            const modelsList = (data.models || []).map((m: any) => ({
              id: m.name.replace('models/', ''),
              object: 'model',
            }));
            return NextResponse.json({
              success: true,
              models: modelsList,
              current_model: modelsList[0]?.id || 'gemini-1.5-flash'
            });
          } catch {}
        }
      }

      return NextResponse.json({ 
        success: false, 
        error: 'Gemini API 연결 실패 (API Key 확인 필요)' 
      }, { status: 200 });
    }

    // 3. OpenAI & OpenAI 호환 API (DeepSeek, Qwen, Kimi, 로컬 LLM 등) 공통 처리
    const { baseUrl, v1Url } = normalizeAgentEndpoint(endpoint);

    // Health check call (relaxed)
    const healthRes = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (!healthRes || !healthRes.ok) {
      console.log(`[test-connection] Optional health check failed or not supported at ${baseUrl}/health, proceeding to model check...`);
    }

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
