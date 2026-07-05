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

    const modelsRes = await fetch(`${v1Url}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!modelsRes) {
      return NextResponse.json({ 
        success: false, 
        error: '에이전트 /v1/models 엔드포인트 응답이 없습니다.' 
      }, { status: 200 });
    }

    if (modelsRes.status === 401 || modelsRes.status === 403) {
      return NextResponse.json({ 
        success: false, 
        error: 'API Key 인증 실패. 권한이 없습니다.' 
      }, { status: 200 });
    }

    if (!modelsRes.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `API 응답 오류: ${modelsRes.status}` 
      }, { status: 200 });
    }

    const modelsData = await modelsRes.json();
    return NextResponse.json({ 
      success: true, 
      models: modelsData.data ?? [] 
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
