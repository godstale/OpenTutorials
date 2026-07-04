import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Force IPv4 loopback (127.0.0.1) instead of localhost to bypass Node.js IPv6 (::1) preference
    const resolvedEndpoint = endpoint.replace('//localhost', '//127.0.0.1');
    const cleanEndpoint = resolvedEndpoint.replace(/\/$/, '');
    
    // Normalize endpoint to extract base URL (without /v1) and v1 URL
    const baseUrl = cleanEndpoint.endsWith('/v1') 
      ? cleanEndpoint.substring(0, cleanEndpoint.length - 3) 
      : cleanEndpoint;
    const v1Url = cleanEndpoint.endsWith('/v1') 
      ? cleanEndpoint 
      : `${cleanEndpoint}/v1`;

    // 1. Health check call
    const healthRes = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!healthRes || !healthRes.ok) {
      return NextResponse.json({ 
        success: false, 
        error: '에이전트 서버의 /health 응답이 비정상적이거나 연결할 수 없습니다.' 
      }, { status: 200 });
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

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
